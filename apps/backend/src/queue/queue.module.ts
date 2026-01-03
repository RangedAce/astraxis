import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { UniverseModule } from '../universe/universe.module';

@Module({
  imports: [UniverseModule],
  providers: [QueueService],
  exports: [QueueService]
})
export class QueueModule {}
