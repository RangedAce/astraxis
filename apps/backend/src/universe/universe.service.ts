import { Injectable } from '@nestjs/common';
import { Prisma, Universe } from '@prisma/client';
import { BuildingKey, calculateProductionFromLevels } from '@astraxis/shared';
import { PrismaService } from '../prisma/prisma.service';

const MAX_POSITIONS = 15;

@Injectable()
export class UniverseService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefaultUniverse() {
    return this.prisma.universe.findFirst({
      orderBy: { createdAt: 'asc' }
    });
  }

  async createStarterPlanet(tx: Prisma.TransactionClient, universe: Universe, playerId: string) {
    const slot = await this.findNextSlot(tx, universe.id);
    const temperature = this.computeTemperature(slot.position);
    const planet = await tx.planet.create({
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

    await this.recomputeProduction(tx, planet.id, temperature);
    return planet;
  }

  private async findNextSlot(tx: Prisma.TransactionClient, universeId: string) {
    const planets = await tx.planet.findMany({
      where: { universeId },
      orderBy: [
        { galaxy: 'asc' },
        { system: 'asc' },
        { position: 'asc' }
      ]
    });
    let galaxy = 1;
    let system = 1;
    let position = 1;
    for (const planet of planets) {
      if (planet.galaxy === galaxy && planet.system === system && planet.position === position) {
        position += 1;
        if (position > MAX_POSITIONS) {
          position = 1;
          system += 1;
          if (system > 499) {
            system = 1;
            galaxy += 1;
          }
        }
      } else {
        break;
      }
    }
    return { galaxy, system, position };
  }

  private computeTemperature(position: number) {
    return 40 - (position - 1) * 3;
  }

  async recomputeProduction(
    tx: Prisma.TransactionClient,
    planetId: string,
    temperature?: number
  ) {
    const levels = await tx.buildingLevel.findMany({ where: { planetId } });
    const levelMap = levels.reduce<Record<string, number>>(
      (acc: Record<string, number>, curr) => {
        acc[curr.buildingKey] = curr.level;
        return acc;
      },
      {}
    );
    const planet = await tx.planet.findUnique({ where: { id: planetId } });
    const temp = temperature ?? planet?.temperature ?? 20;
    const production = calculateProductionFromLevels(levelMap, temp);
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
