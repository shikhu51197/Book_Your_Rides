import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ride } from './ride.entity';
import { RideStatus } from '../common/enums';
import { RidesService } from './rides.service';
import Redis from 'ioredis';

@Injectable()
export class RidesScheduler {
  private readonly logger = new Logger(RidesScheduler.name);

  constructor(
    @InjectRepository(Ride)
    private readonly rideRepository: Repository<Ride>,
    private readonly ridesService: RidesService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  // Run every 5 seconds
  @Cron('*/5 * * * * *')
  async handleTimeouts() {
    // Find all rides in SEARCHING state
    const searchingRides = await this.rideRepository.find({
      where: { status: RideStatus.SEARCHING },
    });

    for (const ride of searchingRides) {
      const timeoutExists = await this.redis.exists(`ride:${ride.id}:timeout`);
      if (!timeoutExists) {
        this.logger.debug(`Ride ${ride.id} timed out. Retrying...`);
        
        const attemptStr = await this.redis.get(`ride:${ride.id}:attempt`);
        const attempt = attemptStr ? parseInt(attemptStr, 10) : 1;
        
        // Get already tried drivers to exclude them
        const excludedDrivers = await this.redis.smembers(`ride:${ride.id}:candidates`);
        
        if (attempt >= 3) {
           this.logger.debug(`Ride ${ride.id} reached max attempts. Marking as TIMEOUT.`);
           ride.status = RideStatus.TIMEOUT;
           await this.rideRepository.save(ride);
           await this.redis.del(`ride:${ride.id}:attempt`, `ride:${ride.id}:candidates`, `ride:${ride.id}:timeout`);
        } else {
           await this.ridesService.startSearchAttempt(ride, attempt + 1, excludedDrivers);
        }
      }
    }
  }
}
