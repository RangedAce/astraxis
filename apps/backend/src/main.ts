import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './ws/redis-io.adapter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true
    })
  );
  app.enableCors({
    origin: '*',
    credentials: true
  });

  const configService = app.get(ConfigService);
  const redisAdapter = new RedisIoAdapter(app, configService);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);

  const port = configService.get<number>('port') ?? 3001;
  await app.listen(port);
  Logger.log(`Backend running on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
