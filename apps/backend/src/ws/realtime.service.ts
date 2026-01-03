import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  emitResourcesUpdate(playerId: string, planetId: string, payload: any) {
    this.gateway.server
      ?.to(this.gateway.playerRoom(playerId))
      .emit('resources:update', { planetId, ...payload });
  }

  emitQueueUpdate(playerId: string, items: any[]) {
    this.gateway.server?.to(this.gateway.playerRoom(playerId)).emit('queue:update', { items });
  }

  emitQueueFinished(playerId: string, payload: any) {
    this.gateway.server?.to(this.gateway.playerRoom(playerId)).emit('queue:finished', payload);
  }
}
