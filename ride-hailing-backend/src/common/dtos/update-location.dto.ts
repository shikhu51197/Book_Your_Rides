import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { DriverStatus } from '../enums';

export class UpdateLocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;
}
