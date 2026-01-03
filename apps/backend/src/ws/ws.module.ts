import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RedisIoAdapter } from './redis-io.adapter';

@Module({
  imports: [JwtModule.register({})],
  providers: [RealtimeGateway, RealtimeService, RedisIoAdapter],
  exports: [RealtimeService, RedisIoAdapter]
})
export class WsModule {}
