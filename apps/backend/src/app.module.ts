import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UniverseModule } from './universe/universe.module';
import { PlanetModule } from './planet/planet.module';
import { QueueModule } from './queue/queue.module';
import { WsModule } from './ws/ws.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration]
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: { colorize: true, translateTime: 'SYS:standard' }
              }
      }
    }),
    PrismaModule,
    AuthModule,
    UniverseModule,
    PlanetModule,
    QueueModule,
    WsModule,
    JobsModule
  ]
})
export class AppModule {}
