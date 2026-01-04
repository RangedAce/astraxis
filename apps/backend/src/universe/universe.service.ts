import { Injectable } from '@nestjs/common';
import { Prisma, Universe } from '@prisma/client';
import { BuildingKey, calculateProductionFromLevels, positionToTemperature } from '@astraxis/shared';
import { PrismaService } from '../prisma/prisma.service';

const MAX_POSITIONS = 15;
const MAX_SYSTEMS = 499;

@Injectable()
export class UniverseService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefaultUniverse() {
    return this.prisma.universe.findFirst({
      orderBy: { createdAt: 'asc' }
    });
  }

  async getUniverseById(id: string) {
    return this.prisma.universe.findUnique({ where: { id } });
  }

  async listUniverses() {
    return this.prisma.universe.findMany({
      orderBy: { createdAt: 'asc' }
    });
  }

  async createUniverse(dto: {
    name: string;
    speedFleet: number;
    speedBuild: number;
    speedResearch: number;
    isPeacefulDefault: boolean;
  }) {
    return this.prisma.universe.create({
      data: {
        name: dto.name,
        speedFleet: dto.speedFleet,
        speedBuild: dto.speedBuild,
        speedResearch: dto.speedResearch,
        isPeacefulDefault: dto.isPeacefulDefault
      }
    });
  }

  async createStarterPlanet(tx: Prisma.TransactionClient, universe: Universe, playerId: string) {
    let planet = null as any;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slot = await this.findRandomSlot(tx, universe.id);
      const temperature = this.computeTemperature(slot.position);
      try {
        planet = await tx.planet.create({
          data: {
            universeId: universe.id,
            playerId,
            galaxy: slot.galaxy,
            system: slot.system,
            position: slot.position,
            name: 'Homeworld',
            temperature
          }
        });
        break;
      } catch (err: any) {
        if (err?.code !== 'P2002') {
          throw err;
        }
      }
    }
    if (!planet) {
      throw new Error('Unable to allocate starter planet slot');
    }

    const now = new Date();
    await tx.resourceBalance.create({
      data: {
        planetId: planet.id,
        metal: new Prisma.Decimal(500),
        crystal: new Prisma.Decimal(500),
        deuterium: new Prisma.Decimal(0),
        lastCalculatedAt: now
      }
    });
    await tx.production.create({
      data: {
        planetId: planet.id,
        metalPerHour: new Prisma.Decimal(0),
        crystalPerHour: new Prisma.Decimal(0),
        deutPerHour: new Prisma.Decimal(0),
        energy: 0,
        lastCalculatedAt: now
      }
    });

    const initialBuildingLevels: Partial<Record<BuildingKey, number>> = {
      [BuildingKey.MetalMine]: 1,
      [BuildingKey.CrystalMine]: 1,
      [BuildingKey.DeuteriumSynthesizer]: 0,
      [BuildingKey.SolarPlant]: 1,
      [BuildingKey.RoboticsFactory]: 1,
      [BuildingKey.Shipyard]: 1,
      [BuildingKey.ResearchLab]: 1
    };

    await Promise.all(
      Object.entries(initialBuildingLevels).map(([key, level]) =>
        tx.buildingLevel.upsert({
          where: { planetId_buildingKey: { planetId: planet.id, buildingKey: key } },
          create: { planetId: planet.id, buildingKey: key, level: level ?? 0 },
          update: { level: level ?? 0 }
        })
      )
    );

    await this.recomputeProduction(tx, planet.id);
    return planet;
  }

  private async findRandomSlot(tx: Prisma.TransactionClient, universeId: string) {
    let galaxy = 1;
    let system = 1;
    while (system <= MAX_SYSTEMS) {
      const planets = await tx.planet.findMany({
        where: { universeId, galaxy, system },
        select: { position: true }
      });
      const taken = new Set(planets.map((p) => p.position));
      const available: number[] = [];
      for (let pos = 1; pos <= MAX_POSITIONS; pos += 1) {
        if (!taken.has(pos)) {
          available.push(pos);
        }
      }
      if (available.length > 0) {
        const position = available[Math.floor(Math.random() * available.length)];
        return { galaxy, system, position };
      }
      system += 1;
    }
    return { galaxy: 1, system: 1, position: 1 };
  }

  private computeTemperature(position: number) {
    return positionToTemperature(position);
  }

  async recomputeProduction(
    tx: Prisma.TransactionClient,
    planetId: string
  ) {
    const [levels, settings, planet] = await Promise.all([
      tx.buildingLevel.findMany({ where: { planetId } }),
      tx.buildingSetting.findMany({ where: { planetId } }),
      tx.planet.findUnique({ where: { id: planetId } })
    ]);
    const levelMap = levels.reduce<Record<string, number>>(
      (acc: Record<string, number>, curr) => {
        acc[curr.buildingKey] = curr.level;
        return acc;
      },
      {}
    );
    const factorMap = settings.reduce<Record<string, number>>(
      (acc: Record<string, number>, curr) => {
        acc[curr.buildingKey] = curr.productionFactor;
        return acc;
      },
      {}
    );
    const position = planet?.position ?? 1;
    const production = calculateProductionFromLevels(levelMap, position, factorMap);
    await tx.production.upsert({
      where: { planetId },
      create: {
        planetId,
        metalPerHour: new Prisma.Decimal(production.metalPerHour),
        crystalPerHour: new Prisma.Decimal(production.crystalPerHour),
        deutPerHour: new Prisma.Decimal(production.deutPerHour),
        energy: production.energy,
        lastCalculatedAt: new Date()
      },
      update: {
        metalPerHour: new Prisma.Decimal(production.metalPerHour),
        crystalPerHour: new Prisma.Decimal(production.crystalPerHour),
        deutPerHour: new Prisma.Decimal(production.deutPerHour),
        energy: production.energy,
        lastCalculatedAt: new Date()
      }
    });
    return production;
  }
}
