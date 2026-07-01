import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { RidesGateway } from '../rides/rides.gateway';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: RidesGateway,
          useValue: { notifySystemEvent: jest.fn() }
        }
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
