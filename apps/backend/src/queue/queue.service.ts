import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma, QueueStatus, QueueType } from '@prisma/client';
import { UniverseService } from '../universe/universe.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly universeService: UniverseService
  ) {}

  async getQueueForPlanet(planetId: string) {
    return this.prisma.queueItem.findMany({
      where: { planetId },
      orderBy: { endAt: 'asc' }
    });
  }

  async ensureNoPending(
    tx: Prisma.TransactionClient,
    playerId: string,
    planetId: string | null,
    type: QueueType
  ) {
    const exists = await tx.queueItem.findFirst({
      where: {
        playerId,
        type,
        status: QueueStatus.PENDING,
        planetId: planetId ?? undefined
      }
    });
    if (exists) {
      throw new BadRequestException(`Queue of type ${type} already running`);
    }
  }

  async finalizeQueueItem(queueItemId: string) {
    return this.prisma.serializableTransaction(async (tx) => {
      const item = await tx.queueItem.findUnique({
        where: { id: queueItemId }
      });
      if (!item || item.status !== QueueStatus.PENDING || item.endAt > new Date()) {
        return null;
      }
      if (item.type === QueueType.BUILDING && item.planetId) {
        await tx.buildingLevel.upsert({
          where: { planetId_buildingKey: { planetId: item.planetId, buildingKey: item.key } },
          create: { planetId: item.planetId, buildingKey: item.key, level: item.levelOrQty },
          update: { level: item.levelOrQty }
        });
        const planet = await tx.planet.findUnique({ where: { id: item.planetId } });
        if (planet) {
          await this.universeService.recomputeProduction(tx, planet.id, planet.temperature);
        }
      } else if (item.type === QueueType.RESEARCH) {
        await tx.researchLevel.upsert({
          where: { playerId_techKey: { playerId: item.playerId, techKey: item.key } },
          create: { playerId: item.playerId, techKey: item.key, level: item.levelOrQty },
          update: { level: item.levelOrQty }
        });
      } else if (item.type === QueueType.SHIP && item.planetId) {
        await tx.shipCount.upsert({
          where: { planetId_shipKey: { planetId: item.planetId, shipKey: item.key } },
          create: { planetId: item.planetId, shipKey: item.key, count: item.levelOrQty },
          update: { count: { increment: item.levelOrQty } }
        });
      }
      const updated = await tx.queueItem.update({
        where: { id: queueItemId },
        data: { status: QueueStatus.DONE }
      });
      return updated;
    });
  }
}
