import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ride } from './ride.entity';
import { GeoService } from '../redis/geo.service';
import { LockService } from '../redis/lock.service';
import { CreateRideDto } from '../common/dtos/create-ride.dto';
import { RideStatus } from '../common/enums';
import Redis from 'ioredis';

@Injectable()
export class RidesService {
  constructor(
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    private readonly geoService: GeoService,
    private readonly lockService: LockService,
    private readonly dataSource: DataSource,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) { }

  async createRide(createRideDto: CreateRideDto): Promise<Ride> {
    const ride = this.rideRepository.create({
      rider_id: createRideDto.riderId,
      pickup_lat: createRideDto.pickupLat,
      pickup_lng: createRideDto.pickupLng,
      status: RideStatus.REQUESTED,
    });

    await this.rideRepository.save(ride);

    // Start search
    ride.status = RideStatus.SEARCHING;
    await this.rideRepository.save(ride);

    await this.startSearchAttempt(ride, 1);

    return ride;
  }

  async startSearchAttempt(ride: Ride, attempt: number, excludeDrivers: string[] = []): Promise<void> {
    const limit = 10; // Fetch top 10 closest
    const allCandidates = await this.geoService.findNearestDrivers(ride.pickup_lat, ride.pickup_lng, 10, limit + excludeDrivers.length);

    const candidates = allCandidates.filter(d => !excludeDrivers.includes(d)).slice(0, limit);

    if (candidates.length === 0) {
      if (attempt > 1) {
        // Exhausted all retries without any acceptance.
        ride.status = RideStatus.TIMEOUT;
        await this.rideRepository.save(ride);
      }
      return;
    }

    const key = `ride:${ride.id}`;

    const multi = this.redis.multi();
    multi.set(`${key}:attempt`, attempt);
    multi.sadd(`${key}:candidates`, ...candidates);
    // 600 seconds timeout before scheduler retries (increased for easier manual testing)
    multi.set(`${key}:timeout`, '1', 'EX', 600);
    await multi.exec();

    // Logical notification
    console.log(`[Ride ${ride.id}] Attempt ${attempt}: Notified drivers: ${candidates.join(', ')}`);
  }

  async acceptRide(rideId: string, driverId: string): Promise<Ride> {
    const lockKey = `lock:ride:${rideId}`;
    const lockAcquired = await this.lockService.acquireLock(lockKey, driverId, 5000);

    if (!lockAcquired) {
      throw new ConflictException('Ride acceptance is currently being processed by another driver. Please try again.');
    }
    await new Promise(resolve => setTimeout(resolve, 5000)); // Fake 5 second delay

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Load the ride row FOR UPDATE
      const ride = await queryRunner.manager.findOne(Ride, {
        where: { id: rideId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!ride) {
        throw new NotFoundException('Ride not found');
      }

      if (ride.status === RideStatus.ASSIGNED) {
        if (ride.assigned_driver_id === driverId) {
          // Idempotent success
          await queryRunner.commitTransaction();
          return ride;
        } else {
          throw new ConflictException('Ride already assigned to another driver');
        }
      }

      if (ride.status !== RideStatus.SEARCHING) {
        throw new BadRequestException(`Ride cannot be accepted in ${ride.status} status`);
      }

      // Check if driver is in candidates
      const isCandidate = await this.redis.sismember(`ride:${ride.id}:candidates`, driverId);
      if (!isCandidate) {
        throw new BadRequestException('Driver is not a candidate for this ride');
      }

      // Proceed to assign
      ride.assigned_driver_id = driverId;
      ride.status = RideStatus.ASSIGNED;

      await queryRunner.manager.save(ride);
      await queryRunner.commitTransaction();

      // Clean up Redis keys
      await this.redis.del(`ride:${ride.id}:attempt`, `ride:${ride.id}:candidates`, `ride:${ride.id}:timeout`);

      return ride;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
      await this.lockService.releaseLock(lockKey, driverId);
    }
  }
}
