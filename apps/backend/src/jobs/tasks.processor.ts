import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../ws/realtime.service';
import { QueueStatus } from '@prisma/client';

@Processor('tasks')
export class TasksProcessor extends WorkerHost {
  constructor(
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService
  ) {
    super();
  }

  async process(job: Job<{ queueItemId: string; playerId: string; planetId?: string }>) {
    const updated = await this.queueService.finalizeQueueItem(job.data.queueItemId);
    if (!updated) {
      return;
    }
    const pending = await this.prisma.queueItem.findMany({
      where: { playerId: updated.playerId, status: QueueStatus.PENDING },
      orderBy: { endAt: 'asc' }
    });
    this.realtime.emitQueueFinished(updated.playerId, {
      itemId: updated.id,
      type: updated.type,
      key: updated.key
    });
    this.realtime.emitQueueUpdate(updated.playerId, pending);
  }
}
