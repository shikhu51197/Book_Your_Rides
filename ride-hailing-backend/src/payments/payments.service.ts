import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async createPayment(rideId: string, amount: number): Promise<Payment> {
    const payment = this.paymentRepository.create({
      ride_id: rideId,
      amount,
      status: PaymentStatus.PENDING,
    });
    return this.paymentRepository.save(payment);
  }

  async processPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');
    
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(`Payment already in ${payment.status} state`);
    }

    // Mock processing
    payment.status = PaymentStatus.SUCCESS;
    return this.paymentRepository.save(payment);
  }
}
