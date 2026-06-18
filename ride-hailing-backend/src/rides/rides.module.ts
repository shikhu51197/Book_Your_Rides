import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ride } from './ride.entity';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { RidesScheduler } from './rides.scheduler';

@Module({
  imports: [TypeOrmModule.forFeature([Ride])],
  providers: [RidesService, RidesScheduler],
  controllers: [RidesController],
})
export class RidesModule {}
