import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { GeoService } from './geo.service';
import { LockService } from './lock.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      },
    },
    GeoService,
    LockService,
  ],
  exports: ['REDIS_CLIENT', GeoService, LockService],
})
export class RedisModule {}
