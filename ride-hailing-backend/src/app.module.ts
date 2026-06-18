import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { DriversModule } from './drivers/drivers.module';
import { RidesModule } from './rides/rides.module';
import { Driver } from './drivers/driver.entity';
import { Ride } from './rides/ride.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5433,
      username: 'ride_hailing',
      password: 'ride_hailing_password',
      database: 'ride_hailing',
      entities: [Driver, Ride],
      synchronize: true, // For development only
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    DriversModule,
    RidesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
