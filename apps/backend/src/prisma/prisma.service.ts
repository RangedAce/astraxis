import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('databaseUrl')
        }
      },
      log: ['error', 'warn']
    });
  }

  async onModuleInit() {
    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.$connect();
        return;
      } catch (err) {
        if (attempt === maxAttempts) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }

  async serializableTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  }
}
