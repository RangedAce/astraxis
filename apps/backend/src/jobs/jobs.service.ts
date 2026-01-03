import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueItem } from '@prisma/client';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(@InjectQueue('tasks') private readonly queue: Queue) {}

  async scheduleQueueItem(item: QueueItem) {
    const delay = Math.max(0, item.endAt.getTime() - Date.now());
    await this.queue.add(
      'finalize',
      { queueItemId: item.id, playerId: item.playerId, planetId: item.planetId },
      {
        jobId: item.id,
        delay
      }
    );
    this.logger.debug(`Scheduled job ${item.id} with delay ${delay}ms`);
  }
}
