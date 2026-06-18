import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from './driver.entity';
import { GeoService } from '../redis/geo.service';
import { UpdateLocationDto } from '../common/dtos/update-location.dto';
import { DriverStatus } from '../common/enums';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    private readonly geoService: GeoService,
  ) {}

  async createDriver(name: string): Promise<Driver> {
    const driver = this.driverRepository.create({ name, status: DriverStatus.OFFLINE });
    return this.driverRepository.save(driver);
  }

  async updateLocation(id: string, updateLocationDto: UpdateLocationDto): Promise<Driver> {
    const driver = await this.driverRepository.findOne({ where: { id } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    driver.current_lat = updateLocationDto.lat;
    driver.current_lng = updateLocationDto.lng;
    
    if (updateLocationDto.status) {
      driver.status = updateLocationDto.status;
    }

    await this.driverRepository.save(driver);

    // Update Redis GEO
    if (driver.status === DriverStatus.ONLINE) {
      await this.geoService.addDriverLocation(driver.id, driver.current_lat, driver.current_lng);
    } else {
      // OFFLINE or BUSY
      await this.geoService.removeDriverLocation(driver.id);
    }

    return driver;
  }
}
