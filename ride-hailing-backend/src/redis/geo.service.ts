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
    // Phase 10: Advanced Ride Matching (Score by distance + driver rating + surge)
    const results = await this.redis.geosearch(
      this.GEO_KEY,
      'FROMLONLAT',
      lng,
      lat,
      'BYRADIUS',
      radiusKm,
      'km',
      'ASC',
      'WITHDIST',
      'COUNT',
      limit,
    ) as any[];

    // results is like: [ [ 'driverId1', '2.5' ], [ 'driverId2', '3.1' ] ]
    const scoredDrivers = results.map(row => {
      const driverId = row[0];
      const distance = parseFloat(row[1]);
      
      // Mock driver rating between 4.0 and 5.0
      const mockRating = 4.0 + Math.random(); 
      // Algorithm: lower score is better. Distance is heavily weighted, rating reduces score.
      const score = (distance * 10) - (mockRating * 2);
      
      return { driverId, score, distance, mockRating };
    });

    // Sort by best score (lowest)
    scoredDrivers.sort((a, b) => a.score - b.score);

    console.log('[Phase 10 Matching]', scoredDrivers);

    return scoredDrivers.map(d => d.driverId);
  }
}
