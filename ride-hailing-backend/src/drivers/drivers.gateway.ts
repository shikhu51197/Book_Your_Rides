import { WebSocketGateway, WebSocketServer, OnGatewayDisconnect, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GeoService } from '../redis/geo.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class DriversGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(DriversGateway.name);
  
  // Map socket.id -> driverId
  private activeDrivers = new Map<string, string>();

  constructor(private readonly geoService: GeoService) {}

  @SubscribeMessage('identify_driver')
  handleIdentifyDriver(@ConnectedSocket() client: Socket, @MessageBody() driverId: string) {
    this.activeDrivers.set(client.id, driverId);
    this.logger.log(`Driver ${driverId} linked to socket ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const driverId = this.activeDrivers.get(client.id);
    if (driverId) {
      this.logger.log(`Driver ${driverId} disconnected. Removing from online GEO index.`);
      await this.geoService.removeDriverLocation(driverId);
      this.activeDrivers.delete(client.id);
    }
  }

  notifyLocationUpdated(driver: any) {
    this.server.emit('driver_location_updated', driver);
  }
}
