export enum BuildingKey {
  MetalMine = 'metal_mine',
  CrystalMine = 'crystal_mine',
  DeuteriumSynthesizer = 'deuterium_synthesizer',
  SolarPlant = 'solar_plant',
  RoboticsFactory = 'robotics_factory',
  Shipyard = 'shipyard',
  ResearchLab = 'research_lab',
  MetalStorage = 'metal_storage',
  CrystalStorage = 'crystal_storage',
  DeuteriumTank = 'deuterium_tank'
}

export enum ResearchKey {
  Energy = 'energy',
  Laser = 'laser',
  Ion = 'ion',
  Hyperspace = 'hyperspace',
  CombustionDrive = 'combustion_drive',
  ImpulseDrive = 'impulse_drive',
  Hyperdrive = 'hyperdrive',
  Espionage = 'espionage'
}

export enum ShipKey {
  SmallCargo = 'small_cargo',
  LargeCargo = 'large_cargo',
  LightFighter = 'light_fighter',
  Probe = 'probe'
}

export enum QueueCategory {
  Building = 'BUILDING',
  Research = 'RESEARCH',
  Ship = 'SHIP'
}

export enum BuildingCategory {
  Production = 'production',
  Installation = 'installation'
}

export type ResourceAmount = {
  metal: number;
  crystal: number;
  deuterium: number;
};

export type ProductionRates = {
  metalPerHour: number;
  crystalPerHour: number;
  deutPerHour: number;
  energy: number;
  energyProduced?: number;
  energyUsed?: number;
};

export type StorageCapacities = {
  metal: number;
  crystal: number;
  deuterium: number;
};

export type ProductionFactors = Partial<Record<BuildingKey, number>>;

export type BuildingMeta = {
  key: BuildingKey;
  label: string;
  description: string;
  category: BuildingCategory;
  imageUrl?: string;
};

export type ResearchMeta = {
  key: ResearchKey;
  label: string;
  description: string;
  imageUrl?: string;
};

export type ShipMeta = {
  key: ShipKey;
  label: string;
  description: string;
  imageUrl?: string;
};
