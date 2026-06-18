import { Body, Controller, Param, Post } from '@nestjs/common';
import { RidesService } from './rides.service';
import { CreateRideDto } from '../common/dtos/create-ride.dto';

@Controller('rides')
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post()
  async createRide(@Body() createRideDto: CreateRideDto) {
    return this.ridesService.createRide(createRideDto);
  }

  @Post(':rideId/accept')
  async acceptRide(@Param('rideId') rideId: string, @Body('driverId') driverId: string) {
    return this.ridesService.acceptRide(rideId, driverId);
  }
}
