import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class RidesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('RidesGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Broadcasts a new ride request to all connected clients (drivers/admins)
  notifyRideRequested(ride: any, candidates: string[]) {
    this.server.emit('ride_requested', { ride, candidates });
  }

  // Broadcasts that a ride's status has been updated
  notifyRideStatusUpdated(ride: any) {
    this.server.emit('ride_status_updated', ride);
  }

  // General notification for the admin dashboard
  notifySystemEvent(event: string, payload: any) {
    this.server.emit(event, payload);
  }
}
