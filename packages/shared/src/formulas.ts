import {
  BuildingKey,
  ProductionFactors,
  ProductionRates,
  QueueCategory,
  ResearchKey,
  ResourceAmount,
  ShipKey,
  StorageCapacities
} from './types';
import { BUILDING_KEYS, RESEARCH_KEYS, SHIP_KEYS } from './metadata';

const BASE_BUILDINGS: Record<
  BuildingKey,
  { cost: ResourceAmount; costFactor: number; baseTime: number; timeFactor: number }
> = {
  [BuildingKey.MetalMine]: {
    cost: { metal: 60, crystal: 15, deuterium: 0 },
    costFactor: 1.5,
    baseTime: 60,
    timeFactor: 1.5
  },
  [BuildingKey.CrystalMine]: {
    cost: { metal: 48, crystal: 24, deuterium: 0 },
    costFactor: 1.6,
    baseTime: 80,
    timeFactor: 1.55
  },
  [BuildingKey.DeuteriumSynthesizer]: {
    cost: { metal: 225, crystal: 75, deuterium: 0 },
    costFactor: 1.5,
    baseTime: 100,
    timeFactor: 1.6
  },
  [BuildingKey.SolarPlant]: {
    cost: { metal: 75, crystal: 30, deuterium: 0 },
    costFactor: 1.5,
    baseTime: 70,
    timeFactor: 1.5
  },
  [BuildingKey.MetalStorage]: {
    cost: { metal: 1000, crystal: 0, deuterium: 0 },
    costFactor: 2,
    baseTime: 120,
    timeFactor: 1.6
  },
  [BuildingKey.CrystalStorage]: {
    cost: { metal: 1000, crystal: 500, deuterium: 0 },
    costFactor: 2,
    baseTime: 140,
    timeFactor: 1.6
  },
  [BuildingKey.DeuteriumTank]: {
    cost: { metal: 1000, crystal: 1000, deuterium: 0 },
    costFactor: 2,
    baseTime: 160,
    timeFactor: 1.6
  },
  [BuildingKey.RoboticsFactory]: {
    cost: { metal: 400, crystal: 120, deuterium: 200 },
    costFactor: 2,
    baseTime: 120,
    timeFactor: 1.7
  },
  [BuildingKey.Shipyard]: {
    cost: { metal: 400, crystal: 200, deuterium: 100 },
    costFactor: 2,
    baseTime: 150,
    timeFactor: 1.7
  },
  [BuildingKey.ResearchLab]: {
    cost: { metal: 200, crystal: 400, deuterium: 200 },
    costFactor: 2,
    baseTime: 200,
    timeFactor: 1.8
  }
};

const BASE_RESEARCH: Record<
  ResearchKey,
  { cost: ResourceAmount; costFactor: number; baseTime: number; timeFactor: number }
> = {
  [ResearchKey.Energy]: {
    cost: { metal: 0, crystal: 800, deuterium: 400 },
    costFactor: 2,
    baseTime: 300,
    timeFactor: 1.8
  },
  [ResearchKey.Laser]: {
    cost: { metal: 200, crystal: 100, deuterium: 0 },
    costFactor: 2,
    baseTime: 240,
    timeFactor: 1.7
  },
  [ResearchKey.Ion]: {
    cost: { metal: 1000, crystal: 300, deuterium: 100 },
    costFactor: 2,
    baseTime: 360,
    timeFactor: 1.8
  },
  [ResearchKey.Hyperspace]: {
    cost: { metal: 1000, crystal: 2000, deuterium: 500 },
    costFactor: 2.2,
    baseTime: 600,
    timeFactor: 1.9
  },
  [ResearchKey.CombustionDrive]: {
    cost: { metal: 400, crystal: 0, deuterium: 600 },
    costFactor: 1.8,
    baseTime: 260,
    timeFactor: 1.8
  },
  [ResearchKey.ImpulseDrive]: {
    cost: { metal: 2000, crystal: 4000, deuterium: 600 },
    costFactor: 1.9,
    baseTime: 500,
    timeFactor: 1.9
  },
  [ResearchKey.Hyperdrive]: {
    cost: { metal: 10000, crystal: 20000, deuterium: 6000 },
    costFactor: 2,
    baseTime: 900,
    timeFactor: 2
  },
  [ResearchKey.Espionage]: {
    cost: { metal: 200, crystal: 1000, deuterium: 200 },
    costFactor: 2,
    baseTime: 260,
    timeFactor: 1.7
  }
};

const BASE_SHIPS: Record<
  ShipKey,
  { cost: ResourceAmount; baseTime: number; baseFactor: number }
> = {
  [ShipKey.SmallCargo]: {
    cost: { metal: 2000, crystal: 2000, deuterium: 0 },
    baseTime: 120,
    baseFactor: 1.2
  },
  [ShipKey.LargeCargo]: {
    cost: { metal: 6000, crystal: 6000, deuterium: 0 },
    baseTime: 240,
    baseFactor: 1.3
  },
  [ShipKey.LightFighter]: {
    cost: { metal: 3000, crystal: 1000, deuterium: 0 },
    baseTime: 180,
    baseFactor: 1.3
  },
  [ShipKey.Probe]: {
    cost: { metal: 1000, crystal: 500, deuterium: 0 },
    baseTime: 60,
    baseFactor: 1.1
  }
};

const STORAGE_BASE_CAPACITY = 10000;
const STORAGE_FACTOR = 1.6;
const MINE_OUTPUT_FACTOR = 1.1;
const MINE_ENERGY_FACTOR = 1.1;

function normalizeProductionFactor(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) {
    return 1;
  }
  const clamped = Math.max(0, Math.min(100, value));
  return clamped / 100;
}

function calculateMineOutput(base: number, level: number) {
  return level > 0 ? base * level * Math.pow(MINE_OUTPUT_FACTOR, level) : 0;
}

function calculateMineEnergy(base: number, level: number) {
  return level > 0 ? base * level * Math.pow(MINE_ENERGY_FACTOR, level) : 0;
}

export function calculateCost(
  base: ResourceAmount,
  factor: number,
  level: number
): ResourceAmount {
  const multiplier = Math.pow(factor, Math.max(level - 1, 0));
  return {
    metal: Math.round(base.metal * multiplier),
    crystal: Math.round(base.crystal * multiplier),
    deuterium: Math.round(base.deuterium * multiplier)
  };
}

export function calculateBuildingCost(key: BuildingKey, level: number) {
  const cfg = BASE_BUILDINGS[key];
  return calculateCost(cfg.cost, cfg.costFactor, level);
}

export function calculateResearchCost(key: ResearchKey, level: number) {
  const cfg = BASE_RESEARCH[key];
  return calculateCost(cfg.cost, cfg.costFactor, level);
}

export function calculateShipCost(key: ShipKey, qty: number) {
  const cfg = BASE_SHIPS[key];
  return {
    metal: cfg.cost.metal * qty,
    crystal: cfg.cost.crystal * qty,
    deuterium: cfg.cost.deuterium * qty
  };
}

export function calculateBuildingTimeSeconds(key: BuildingKey, level: number, speedBuild: number) {
  const cfg = BASE_BUILDINGS[key];
  const multiplier = Math.pow(cfg.timeFactor, Math.max(level - 1, 0));
  return Math.max(10, Math.round((cfg.baseTime * multiplier) / Math.max(speedBuild, 1)));
}

export function calculateResearchTimeSeconds(
  key: ResearchKey,
  level: number,
  speedResearch: number,
  labLevel: number
) {
  const cfg = BASE_RESEARCH[key];
  const multiplier = Math.pow(cfg.timeFactor, Math.max(level - 1, 0));
  const labBonus = 1 + (labLevel > 0 ? labLevel * 0.05 : 0);
  return Math.max(
    10,
    Math.round((cfg.baseTime * multiplier) / (Math.max(speedResearch, 1) * labBonus))
  );
}

export function calculateShipBuildTimeSeconds(
  key: ShipKey,
  qty: number,
  speedBuild: number,
  shipyardLevel: number,
  roboticsLevel: number
) {
  const cfg = BASE_SHIPS[key];
  const yardBonus = 1 + shipyardLevel * 0.05 + roboticsLevel * 0.02;
  return Math.max(
    5,
    Math.round((cfg.baseTime * qty) / (Math.max(speedBuild, 1) * Math.max(yardBonus, 1)))
  );
}

export function positionToTemperature(position: number) {
  const clamped = Math.max(1, Math.min(15, position));
  return 45 - (clamped - 1) * 4;
}

export function getPositionModifiers(position: number) {
  const normalized = (Math.max(1, Math.min(15, position)) - 1) / 14;
  const energyModifier = 1 + (1 - normalized) * 0.3;
  const deutModifier = 1 + normalized * 0.35;
  return { normalized, energyModifier, deutModifier };
}

export function calculateProductionFromLevels(
  buildingLevels: Record<string, number>,
  position: number,
  productionFactors: ProductionFactors = {}
): ProductionRates {
  const metalLevel = buildingLevels[BuildingKey.MetalMine] ?? 0;
  const crystalLevel = buildingLevels[BuildingKey.CrystalMine] ?? 0;
  const deutLevel = buildingLevels[BuildingKey.DeuteriumSynthesizer] ?? 0;
  const solarLevel = buildingLevels[BuildingKey.SolarPlant] ?? 0;

  const metalFactor = normalizeProductionFactor(productionFactors[BuildingKey.MetalMine]);
  const crystalFactor = normalizeProductionFactor(productionFactors[BuildingKey.CrystalMine]);
  const deutFactor = normalizeProductionFactor(productionFactors[BuildingKey.DeuteriumSynthesizer]);

  const { energyModifier, deutModifier } = getPositionModifiers(position);

  const baseMetal = calculateMineOutput(30, metalLevel) * metalFactor;
  const baseCrystal = calculateMineOutput(20, crystalLevel) * crystalFactor;
  const baseDeut = calculateMineOutput(10, deutLevel) * deutFactor * deutModifier;

  const energyUsed =
    calculateMineEnergy(10, metalLevel) * metalFactor +
    calculateMineEnergy(10, crystalLevel) * crystalFactor +
    calculateMineEnergy(20, deutLevel) * deutFactor;

  const energyProduced =
    solarLevel > 0
      ? 20 * solarLevel * Math.pow(MINE_OUTPUT_FACTOR, solarLevel) * energyModifier
      : 0;

  const energyRatio = energyUsed > 0 ? Math.min(1, energyProduced / energyUsed) : 1;

  return {
    metalPerHour: baseMetal * energyRatio,
    crystalPerHour: baseCrystal * energyRatio,
    deutPerHour: baseDeut * energyRatio,
    energy: Math.round(energyProduced - energyUsed),
    energyProduced: Math.round(energyProduced),
    energyUsed: Math.round(energyUsed)
  };
}

export function calculateStorageCapacity(level: number) {
  return Math.floor(STORAGE_BASE_CAPACITY * Math.pow(STORAGE_FACTOR, Math.max(level, 0)));
}

export function calculateStorageCapacities(
  buildingLevels: Record<string, number>
): StorageCapacities {
  return {
    metal: calculateStorageCapacity(buildingLevels[BuildingKey.MetalStorage] ?? 0),
    crystal: calculateStorageCapacity(buildingLevels[BuildingKey.CrystalStorage] ?? 0),
    deuterium: calculateStorageCapacity(buildingLevels[BuildingKey.DeuteriumTank] ?? 0)
  };
}

export const BUILDING_LIST = BUILDING_KEYS;
export const RESEARCH_LIST = RESEARCH_KEYS;
export const SHIP_LIST = SHIP_KEYS;

export function resourceDeltaPerSeconds(production: ProductionRates, seconds: number) {
  const hours = seconds / 3600;
  return {
    metal: production.metalPerHour * hours,
    crystal: production.crystalPerHour * hours,
    deuterium: production.deutPerHour * hours
  };
}

export function hasEnoughResources(
  available: ResourceAmount,
  cost: ResourceAmount
): boolean {
  return (
    available.metal >= cost.metal &&
    available.crystal >= cost.crystal &&
    available.deuterium >= cost.deuterium
  );
}

export function subtractResources(
  available: ResourceAmount,
  cost: ResourceAmount
): ResourceAmount {
  return {
    metal: available.metal - cost.metal,
    crystal: available.crystal - cost.crystal,
    deuterium: available.deuterium - cost.deuterium
  };
}

export const QueueTypeValues = QueueCategory;
