export enum BuildingKey {
  MetalMine = 'metal_mine',
  CrystalMine = 'crystal_mine',
  DeuteriumSynthesizer = 'deuterium_synthesizer',
  SolarPlant = 'solar_plant',
  RoboticsFactory = 'robotics_factory',
  Shipyard = 'shipyard',
  ResearchLab = 'research_lab'
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
};
