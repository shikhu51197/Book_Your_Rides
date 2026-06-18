import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class GeoService {
  private readonly GEO_KEY = 'drivers:geo:online';

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async addDriverLocation(driverId: string, lat: number, lng: number): Promise<void> {
    await this.redis.geoadd(this.GEO_KEY, lng, lat, driverId);
  }

  async removeDriverLocation(driverId: string): Promise<void> {
    await this.redis.zrem(this.GEO_KEY, driverId);
  }

  async findNearestDrivers(lat: number, lng: number, radiusKm: number, limit: number): Promise<string[]> {
    // Return array of driverIds within radiusKm, ordered by distance
    const results = await this.redis.geosearch(
      this.GEO_KEY,
      'FROMLONLAT',
      lng,
      lat,
      'BYRADIUS',
      radiusKm,
      'km',
      'ASC',
      'COUNT',
      limit,
    );
    return results as string[];
  }
}
