import { Body, Controller, Param, Post } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { UpdateLocationDto } from '../common/dtos/update-location.dto';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  async createDriver(@Body('name') name: string) {
    return this.driversService.createDriver(name);
  }

  @Post(':id/location')
  async updateLocation(@Param('id') id: string, @Body() updateLocationDto: UpdateLocationDto) {
    return this.driversService.updateLocation(id, updateLocationDto);
  }
}
