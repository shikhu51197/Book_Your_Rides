import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { RidesGateway } from '../rides/rides.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(forwardRef(() => RidesGateway))
    private readonly ridesGateway: RidesGateway
  ) {}

  async sendSms(phoneNumber: string, message: string): Promise<void> {
    const log = `[MOCK SMS] To: ${phoneNumber} | Message: ${message}`;
    console.log(log);
    this.ridesGateway.notifySystemEvent('system_log', log);
  }

  async sendEmail(email: string, subject: string, body: string): Promise<void> {
    const log = `[MOCK EMAIL] To: ${email} | Subject: ${subject} | Body: ${body}`;
    console.log(log);
    this.ridesGateway.notifySystemEvent('system_log', log);
  }

  async sendPushNotification(deviceId: string, title: string, body: string): Promise<void> {
    const log = `[MOCK PUSH] Device: ${deviceId} | Title: ${title} | Body: ${body}`;
    console.log(log);
    this.ridesGateway.notifySystemEvent('system_log', log);
  }
}
