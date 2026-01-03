import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { TasksProcessor } from './tasks.processor';
import { QueueModule } from '../queue/queue.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port')
        },
        prefix: config.get<string>('redis.bullPrefix') ?? 'astraxis'
      })
    }),
    BullModule.registerQueue({
      name: 'tasks'
    }),
    QueueModule,
    WsModule
  ],
  providers: [JobsService, TasksProcessor],
  exports: [JobsService]
})
export class JobsModule {}
