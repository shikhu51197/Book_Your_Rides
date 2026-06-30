import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RidesModule } from '../rides/rides.module';

@Module({
  imports: [forwardRef(() => RidesModule)],
  providers: [NotificationsService],
  exports: [NotificationsService]
})
export class NotificationsModule {}
