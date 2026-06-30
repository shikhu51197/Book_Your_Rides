import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ride } from './ride.entity';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { RidesScheduler } from './rides.scheduler';
import { RidesGateway } from './rides.gateway';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ride]), PaymentsModule, forwardRef(() => NotificationsModule)],
  providers: [RidesService, RidesScheduler, RidesGateway],
  controllers: [RidesController],
  exports: [RidesGateway]
})
export class RidesModule {}
