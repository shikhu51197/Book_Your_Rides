import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { RideStatus } from '../common/enums';

@Entity('rides')
export class Ride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  rider_id: string;

  @Column({ type: 'numeric', precision: 10, scale: 6 })
  pickup_lat: number;

  @Column({ type: 'numeric', precision: 10, scale: 6 })
  pickup_lng: number;

  @Column({ type: 'enum', enum: RideStatus, default: RideStatus.REQUESTED })
  status: RideStatus;

  @Column({ nullable: true })
  assigned_driver_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
