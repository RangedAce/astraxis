import { Module } from '@nestjs/common';
import { PlanetService } from './planet.service';
import { PlanetController } from './planet.controller';
import { UniverseModule } from '../universe/universe.module';
import { QueueModule } from '../queue/queue.module';
import { JobsModule } from '../jobs/jobs.module';
import { WsModule } from '../ws/ws.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UniverseModule, QueueModule, JobsModule, WsModule, AuthModule],
  providers: [PlanetService],
  controllers: [PlanetController],
  exports: [PlanetService]
})
export class PlanetModule {}
