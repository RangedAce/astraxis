import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { Prisma, QueueStatus, QueueType } from '@prisma/client';
import {
  BuildingKey,
  ResearchKey,
  ShipKey,
  calculateBuildingCost,
  calculateBuildingTimeSeconds,
  calculateProductionFromLevels,
  calculateResearchCost,
  calculateResearchTimeSeconds,
  calculateShipBuildTimeSeconds,
  calculateShipCost,
  hasEnoughResources,
  resourceDeltaPerSeconds,
  subtractResources
} from '@astraxis/shared';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { JobsService } from '../jobs/jobs.service';
import { UniverseService } from '../universe/universe.service';
import { RealtimeService } from '../ws/realtime.service';
import { StartBuildingDto } from './dto/start-building.dto';
import { StartShipsDto } from './dto/start-ships.dto';
import { StartResearchDto } from './dto/start-research.dto';

@Injectable()
export class PlanetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly jobsService: JobsService,
    private readonly universeService: UniverseService,
    private readonly realtime: RealtimeService
  ) {}

  private toResourceAmount(balance: { metal: any; crystal: any; deuterium: any }) {
    return {
      metal: Number(balance.metal),
      crystal: Number(balance.crystal),
      deuterium: Number(balance.deuterium)
    };
  }

  private async ensurePlanetOwnership(planetId: string, playerId: string) {
    const planet = await this.prisma.planet.findFirst({
      where: { id: planetId, playerId },
      include: { universe: true }
    });
    if (!planet) {
      throw new UnauthorizedException('Planet not found or not yours');
    }
    return planet;
  }

  private async applyProductionTx(
    tx: Prisma.TransactionClient,
    planetId: string,
    now: Date
  ) {
    const resource = await tx.resourceBalance.findUnique({ where: { planetId } });
    if (!resource) {
      throw new NotFoundException('Resource balance missing');
    }
    let production = await tx.production.findUnique({ where: { planetId } });
    if (!production) {
      const planet = await tx.planet.findUnique({ where: { id: planetId } });
      production = await tx.production.create({
        data: {
          planetId,
          metalPerHour: new Prisma.Decimal(0),
          crystalPerHour: new Prisma.Decimal(0),
          deutPerHour: new Prisma.Decimal(0),
          energy: 0,
          lastCalculatedAt: now
        }
      });
      if (planet) {
        const levels = await tx.buildingLevel.findMany({ where: { planetId } });
        const levelMap = levels.reduce<Record<string, number>>((acc, curr) => {
          acc[curr.buildingKey] = curr.level;
          return acc;
        }, {});
        const computed = calculateProductionFromLevels(levelMap, planet.temperature);
        production = await tx.production.update({
          where: { planetId },
          data: {
            metalPerHour: new Prisma.Decimal(computed.metalPerHour),
            crystalPerHour: new Prisma.Decimal(computed.crystalPerHour),
            deutPerHour: new Prisma.Decimal(computed.deutPerHour),
            energy: computed.energy,
            lastCalculatedAt: now
          }
        });
      }
    }
    const elapsedSeconds = (now.getTime() - resource.lastCalculatedAt.getTime()) / 1000;
    if (elapsedSeconds <= 0) {
      return { resource, production };
    }
    const delta = resourceDeltaPerSeconds(
      {
        metalPerHour: Number(production.metalPerHour),
        crystalPerHour: Number(production.crystalPerHour),
        deutPerHour: Number(production.deutPerHour),
        energy: production.energy
      },
      elapsedSeconds
    );
    const updated = await tx.resourceBalance.update({
      where: { planetId },
      data: {
        metal: new Prisma.Decimal(Number(resource.metal) + delta.metal),
        crystal: new Prisma.Decimal(Number(resource.crystal) + delta.crystal),
        deuterium: new Prisma.Decimal(Number(resource.deuterium) + delta.deuterium),
        lastCalculatedAt: now
      }
    });
    await tx.production.update({
      where: { planetId },
      data: { lastCalculatedAt: now }
    });
    return { resource: updated, production: { ...production, lastCalculatedAt: now } };
  }

  async getOverview(playerId: string, planetId: string) {
    const planet = await this.ensurePlanetOwnership(planetId, playerId);
    const now = new Date();
    const { resource, production } = await this.prisma.serializableTransaction((tx) =>
      this.applyProductionTx(tx, planet.id, now)
    );
    const [buildings, researchLevels, queue] = await Promise.all([
      this.prisma.buildingLevel.findMany({ where: { planetId } }),
      this.prisma.researchLevel.findMany({ where: { playerId } }),
      this.prisma.queueItem.findMany({
        where: { planetId, status: QueueStatus.PENDING },
        orderBy: { endAt: 'asc' }
      })
    ]);
    return {
      planet,
      resources: this.toResourceAmount(resource),
      production: {
        metalPerHour: Number(production.metalPerHour),
        crystalPerHour: Number(production.crystalPerHour),
        deutPerHour: Number(production.deutPerHour),
        energy: production.energy
      },
      buildings,
      researchLevels,
      queue
    };
  }

  async startBuilding(playerId: string, planetId: string, dto: StartBuildingDto) {
    const now = new Date();
    const { queueItem, resources } = await this.prisma.serializableTransaction(async (tx) => {
      const planet = await tx.planet.findFirst({
        where: { id: planetId, playerId },
        include: { universe: true }
      });
      if (!planet) {
        throw new UnauthorizedException('Planet not owned');
      }
      await this.queueService.ensureNoPending(tx, playerId, planetId, QueueType.BUILDING);
      const { resource } = await this.applyProductionTx(tx, planetId, now);
      const currentLevel =
        (
          await tx.buildingLevel.findUnique({
            where: { planetId_buildingKey: { planetId, buildingKey: dto.buildingKey } }
          })
        )?.level ?? 0;
      const nextLevel = currentLevel + 1;
      const cost = calculateBuildingCost(dto.buildingKey, nextLevel);
      const available = this.toResourceAmount(resource);
      if (!hasEnoughResources(available, cost)) {
        throw new BadRequestException('Not enough resources');
      }
      const remaining = subtractResources(available, cost);
      await tx.resourceBalance.update({
        where: { planetId },
        data: {
          metal: new Prisma.Decimal(remaining.metal),
          crystal: new Prisma.Decimal(remaining.crystal),
          deuterium: new Prisma.Decimal(remaining.deuterium),
          lastCalculatedAt: now
        }
      });
      const durationSec = calculateBuildingTimeSeconds(
        dto.buildingKey,
        nextLevel,
        planet.universe.speedBuild
      );
      const startAt = now;
      const endAt = new Date(now.getTime() + durationSec * 1000);
      const queueItem = await tx.queueItem.create({
        data: {
          type: QueueType.BUILDING,
          planetId,
          playerId,
          key: dto.buildingKey,
          levelOrQty: nextLevel,
          startAt,
          endAt
        }
      });
      return { queueItem, resources: remaining };
    });

    await this.jobsService.scheduleQueueItem(queueItem);
    const pending = await this.prisma.queueItem.findMany({
      where: { planetId, status: QueueStatus.PENDING },
      orderBy: { endAt: 'asc' }
    });
    this.realtime.emitQueueUpdate(playerId, pending);
    this.realtime.emitResourcesUpdate(playerId, planetId, {
      metal: resources.metal,
      crystal: resources.crystal,
      deut: resources.deuterium,
      at: now.toISOString()
    });
    return queueItem;
  }

  async startShips(playerId: string, planetId: string, dto: StartShipsDto) {
    const now = new Date();
    const { queueItem, resources } = await this.prisma.serializableTransaction(async (tx) => {
      const planet = await tx.planet.findFirst({
        where: { id: planetId, playerId },
        include: { universe: true }
      });
      if (!planet) {
        throw new UnauthorizedException('Planet not owned');
      }
      await this.queueService.ensureNoPending(tx, playerId, planetId, QueueType.SHIP);
      const { resource } = await this.applyProductionTx(tx, planetId, now);
      const levels = await tx.buildingLevel.findMany({ where: { planetId } });
      const levelMap = levels.reduce<Record<string, number>>((acc, curr) => {
        acc[curr.buildingKey] = curr.level;
        return acc;
      }, {});
      const shipyardLevel = levelMap[BuildingKey.Shipyard] ?? 0;
      const roboticsLevel = levelMap[BuildingKey.RoboticsFactory] ?? 0;
      const cost = calculateShipCost(dto.shipKey, dto.qty);
      const available = this.toResourceAmount(resource);
      if (!hasEnoughResources(available, cost)) {
        throw new BadRequestException('Not enough resources');
      }
      const remaining = subtractResources(available, cost);
      await tx.resourceBalance.update({
        where: { planetId },
        data: {
          metal: new Prisma.Decimal(remaining.metal),
          crystal: new Prisma.Decimal(remaining.crystal),
          deuterium: new Prisma.Decimal(remaining.deuterium),
          lastCalculatedAt: now
        }
      });
      const durationSec = calculateShipBuildTimeSeconds(
        dto.shipKey,
        dto.qty,
        planet.universe.speedBuild,
        shipyardLevel,
        roboticsLevel
      );
      const startAt = now;
      const endAt = new Date(now.getTime() + durationSec * 1000);
      const queueItem = await tx.queueItem.create({
        data: {
          type: QueueType.SHIP,
          planetId,
          playerId,
          key: dto.shipKey,
          levelOrQty: dto.qty,
          startAt,
          endAt
        }
      });
      return { queueItem, resources: remaining };
    });

    await this.jobsService.scheduleQueueItem(queueItem);
    const pending = await this.prisma.queueItem.findMany({
      where: { planetId, status: QueueStatus.PENDING },
      orderBy: { endAt: 'asc' }
    });
    this.realtime.emitQueueUpdate(playerId, pending);
    this.realtime.emitResourcesUpdate(playerId, planetId, {
      metal: resources.metal,
      crystal: resources.crystal,
      deut: resources.deuterium,
      at: now.toISOString()
    });
    return queueItem;
  }

  async startResearch(userId: string, playerId: string, dto: StartResearchDto) {
    const now = new Date();
    const { queueItem, resources, planetId } = await this.prisma.serializableTransaction(
      async (tx) => {
        const player = await tx.player.findFirst({ where: { id: playerId, userId } });
        if (!player) {
          throw new UnauthorizedException('Player not found');
        }
        await this.queueService.ensureNoPending(tx, playerId, null, QueueType.RESEARCH);
        const planet =
          dto.planetId &&
          (await tx.planet.findFirst({ where: { id: dto.planetId, playerId } }));
        const spendPlanet =
          planet ??
          (await tx.planet.findFirst({
            where: { playerId },
            orderBy: { createdAt: 'asc' }
          }));
        if (!spendPlanet) {
          throw new NotFoundException('No planet found for research');
        }
        const { resource } = await this.applyProductionTx(tx, spendPlanet.id, now);
        const labLevel =
          (
            await tx.buildingLevel.findUnique({
              where: {
                planetId_buildingKey: {
                  planetId: spendPlanet.id,
                  buildingKey: BuildingKey.ResearchLab
                }
              }
            })
          )?.level ?? 0;
        const currentLevel =
          (
            await tx.researchLevel.findUnique({
              where: { playerId_techKey: { playerId, techKey: dto.techKey } }
            })
          )?.level ?? 0;
        const nextLevel = currentLevel + 1;
        const cost = calculateResearchCost(dto.techKey, nextLevel);
        const available = this.toResourceAmount(resource);
        if (!hasEnoughResources(available, cost)) {
          throw new BadRequestException('Not enough resources');
        }
        const remaining = subtractResources(available, cost);
        await tx.resourceBalance.update({
          where: { planetId: spendPlanet.id },
          data: {
            metal: new Prisma.Decimal(remaining.metal),
            crystal: new Prisma.Decimal(remaining.crystal),
            deuterium: new Prisma.Decimal(remaining.deuterium),
            lastCalculatedAt: now
          }
        });
        const durationSec = calculateResearchTimeSeconds(
          dto.techKey,
          nextLevel,
          (await tx.universe.findUnique({ where: { id: player.universeId } }))?.speedResearch ?? 1,
          labLevel
        );
        const startAt = now;
        const endAt = new Date(now.getTime() + durationSec * 1000);
        const queueItem = await tx.queueItem.create({
          data: {
            type: QueueType.RESEARCH,
            planetId: spendPlanet.id,
            playerId,
            key: dto.techKey,
            levelOrQty: nextLevel,
            startAt,
            endAt
          }
        });
        return { queueItem, resources: remaining, planetId: spendPlanet.id };
      }
    );

    await this.jobsService.scheduleQueueItem(queueItem);
    const pending = await this.prisma.queueItem.findMany({
      where: { playerId, type: QueueType.RESEARCH, status: QueueStatus.PENDING },
      orderBy: { endAt: 'asc' }
    });
    this.realtime.emitQueueUpdate(playerId, pending);
    this.realtime.emitResourcesUpdate(playerId, planetId, {
      metal: resources.metal,
      crystal: resources.crystal,
      deut: resources.deuterium,
      at: now.toISOString()
    });
    return queueItem;
  }

  async listQueue(planetId: string, playerId: string) {
    await this.ensurePlanetOwnership(planetId, playerId);
    return this.prisma.queueItem.findMany({
      where: { planetId, status: QueueStatus.PENDING },
      orderBy: { endAt: 'asc' }
    });
  }
}
