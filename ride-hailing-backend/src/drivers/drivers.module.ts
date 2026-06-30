import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from './driver.entity';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { DriversGateway } from './drivers.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Driver])],
  providers: [DriversService, DriversGateway],
  controllers: [DriversController],
  exports: [DriversService],
})
export class DriversModule {}
