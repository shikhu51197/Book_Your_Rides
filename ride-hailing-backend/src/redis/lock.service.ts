import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class LockService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * Acquires a distributed lock.
   * @param key The lock key (e.g. lock:ride:123)
   * @param value The value to set (e.g. driverId)
   * @param ttlMs Time to live in milliseconds
   * @returns true if lock acquired, false otherwise
   */
  async acquireLock(key: string, value: string, ttlMs: number): Promise<boolean> {
    const result = await this.redis.set(key, value, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  /**
   * Safely releases a lock if and only if the current value matches the given value.
   * Prevents deleting a lock acquired by someone else if this process took too long.
   */
  async releaseLock(key: string, value: string): Promise<boolean> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redis.eval(luaScript, 1, key, value);
    return result === 1;
  }
}
