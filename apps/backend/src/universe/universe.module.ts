import { Module } from '@nestjs/common';
import { UniverseService } from './universe.service';
import { UniverseController } from './universe.controller';

@Module({
  providers: [UniverseService],
  controllers: [UniverseController],
  exports: [UniverseService]
})
export class UniverseModule {}
