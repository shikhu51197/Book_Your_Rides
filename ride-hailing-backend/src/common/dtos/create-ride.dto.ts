import { IsNumber, IsString } from 'class-validator';

export class CreateRideDto {
  @IsString()
  riderId: string;

  @IsNumber()
  pickupLat: number;

  @IsNumber()
  pickupLng: number;
}
