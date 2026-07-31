import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';

describe('AppController', () => {
  let appController: AppController;
  const checkMock = jest
    .fn()
    .mockImplementation(
      async (indicators: Array<() => Promise<unknown>> = []) => {
        await Promise.all(indicators.map((indicator) => indicator()));
        return { status: 'ok', info: { database: { status: 'up' } } };
      },
    );
  const pingCheckMock = jest
    .fn()
    .mockResolvedValue({ database: { status: 'up' } });

  beforeEach(async () => {
    checkMock.mockClear();
    pingCheckMock.mockClear();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: checkMock,
          },
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: {
            pingCheck: pingCheckMock,
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: jest
              .fn()
              .mockResolvedValue({ memory_heap: { status: 'up' } }),
            checkRSS: jest
              .fn()
              .mockResolvedValue({ memory_rss: { status: 'up' } }),
          },
        },
        {
          provide: DiskHealthIndicator,
          useValue: {
            checkStorage: jest
              .fn()
              .mockResolvedValue({ disk: { status: 'up' } }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return welcome message', () => {
      expect(appController.getHello()).toBe('NestJS API is running! 🚀');
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      const result = await appController.check();
      expect(result).toHaveProperty('status', 'ok');
      expect(checkMock).toHaveBeenCalled();
    });
  });

  describe('liveness', () => {
    it('should return ok for liveness probe', async () => {
      const result = await appController.liveness();
      expect(result).toBeDefined();
      expect(checkMock).toHaveBeenCalledWith([]);
    });
  });

  describe('readiness', () => {
    it('should check database for readiness probe', async () => {
      await appController.readiness();
      expect(pingCheckMock).toHaveBeenCalledWith('database');
    });
  });
});
