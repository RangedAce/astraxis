import { Module } from '@nestjs/common';
import { UniverseService } from './universe.service';

@Module({
  providers: [UniverseService],
  exports: [UniverseService]
})
export class UniverseModule {}
