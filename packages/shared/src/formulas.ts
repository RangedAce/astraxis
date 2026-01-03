import {
  BuildingKey,
  ProductionRates,
  QueueCategory,
  ResearchKey,
  ResourceAmount,
  ShipKey
} from './types';

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

export function calculateProductionFromLevels(
  buildingLevels: Record<string, number>,
  temperature: number
): ProductionRates {
  const metalLevel = buildingLevels[BuildingKey.MetalMine] ?? 0;
  const crystalLevel = buildingLevels[BuildingKey.CrystalMine] ?? 0;
  const deutLevel = buildingLevels[BuildingKey.DeuteriumSynthesizer] ?? 0;
  const solarLevel = buildingLevels[BuildingKey.SolarPlant] ?? 0;
  const tempModifier = 1 + temperature / 200;

  const metalPerHour = metalLevel > 0 ? 30 * metalLevel * Math.pow(1.1, metalLevel) : 0;
  const crystalPerHour = crystalLevel > 0 ? 20 * crystalLevel * Math.pow(1.1, crystalLevel) : 0;
  const deutPerHour =
    deutLevel > 0 ? 10 * deutLevel * Math.pow(1.1, deutLevel) * tempModifier : 0;
  const energy =
    solarLevel > 0 ? Math.round(20 * solarLevel * Math.pow(1.1, solarLevel) * tempModifier) : 0;

  return {
    metalPerHour,
    crystalPerHour,
    deutPerHour,
    energy
  };
}

export const BUILDING_LIST = Object.keys(BASE_BUILDINGS) as BuildingKey[];
export const RESEARCH_LIST = Object.keys(BASE_RESEARCH) as ResearchKey[];
export const SHIP_LIST = Object.keys(BASE_SHIPS) as ShipKey[];

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
