import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ride } from './ride.entity';
import { GeoService } from '../redis/geo.service';
import { LockService } from '../redis/lock.service';
import { CreateRideDto } from '../common/dtos/create-ride.dto';
import { RideStatus } from '../common/enums';
import { RidesGateway } from './rides.gateway';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
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
    private readonly ridesGateway: RidesGateway,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) { }

  private calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async createRide(createRideDto: CreateRideDto): Promise<Ride> {
    const { pickupLat, pickupLng, dropLat, dropLng } = createRideDto;
    
    // Phase 11: Prevent Double Booking
    const existingRide = await this.rideRepository.findOne({
      where: [
        { rider_id: createRideDto.riderId, status: RideStatus.REQUESTED },
        { rider_id: createRideDto.riderId, status: RideStatus.SEARCHING },
        { rider_id: createRideDto.riderId, status: RideStatus.ASSIGNED },
      ],
    });

    if (existingRide) {
      throw new ConflictException('Rider already has an active ride.');
    }

    // Calculate Phase 6 metrics
    let distance_km = 0;
    let eta_minutes = 0;
    let estimated_fare = 0;

    if (dropLat && dropLng) {
      distance_km = this.calculateHaversine(pickupLat, pickupLng, dropLat, dropLng);
      // Assuming average speed in city is 30 km/h (0.5 km/min)
      eta_minutes = Math.ceil(distance_km / 0.5);
      // Base fare $5 + $2 per km
      estimated_fare = Math.round((5 + (distance_km * 2)) * 100) / 100;
    }

    const ride = this.rideRepository.create({
      rider_id: createRideDto.riderId,
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      drop_lat: dropLat,
      drop_lng: dropLng,
      distance_km,
      eta_minutes,
      estimated_fare,
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
    // 15 seconds timeout before scheduler retries
    multi.set(`${key}:timeout`, '1', 'EX', 15);
    await multi.exec();

    // Logical notification
    console.log(`[Ride ${ride.id}] Attempt ${attempt}: Notified drivers: ${candidates.join(', ')}`);
    
    // WebSockets notification
    this.ridesGateway.notifyRideRequested(ride, candidates);
    this.ridesGateway.notifySystemEvent('system_log', `[Ride ${ride.id}] Attempt ${attempt}: Notified drivers: ${candidates.length}`);
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

      // WebSocket notification
      this.ridesGateway.notifyRideStatusUpdated(ride);
      this.ridesGateway.notifySystemEvent('system_log', `Ride ${ride.id} successfully assigned to Driver ${driverId}`);

      // Phase 5: Notification Service
      await this.notificationsService.sendSms(
        `+10000000000`, 
        `Ride accepted! Driver ${driverId} is on the way for Ride ${ride.id}`
      );

      return ride;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
      await this.lockService.releaseLock(lockKey, driverId);
    }
  }

  async completeRide(rideId: string, driverId: string): Promise<any> {
    const ride = await this.rideRepository.findOne({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');

    if (ride.status !== RideStatus.ASSIGNED || ride.assigned_driver_id !== driverId) {
      throw new BadRequestException('Cannot complete this ride');
    }

    // Use estimated fare if available
    const fare = ride.estimated_fare ? Number(ride.estimated_fare) : Math.floor(Math.random() * 20) + 10;
    
    ride.status = RideStatus.COMPLETED;
    ride.fare = fare;
    await this.rideRepository.save(ride);

    // Create payment
    const payment = await this.paymentsService.createPayment(ride.id, fare);

    // Notify clients
    this.ridesGateway.notifyRideStatusUpdated(ride);
    this.ridesGateway.notifySystemEvent('system_log', `Ride ${ride.id} completed. Fare: $${fare}`);

    // Phase 5: Notification Service
    await this.notificationsService.sendEmail(
      `rider_${ride.rider_id}@example.com`,
      `Ride Receipt - ${ride.id}`,
      `Your ride has been completed. The total fare is $${fare}.`
    );

    return { ride, payment };
  }
}
