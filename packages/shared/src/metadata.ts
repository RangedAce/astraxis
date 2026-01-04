import {
  BuildingCategory,
  BuildingKey,
  BuildingMeta,
  ResearchKey,
  ResearchMeta,
  ShipKey,
  ShipMeta
} from './types';

export const BUILDING_META: Record<BuildingKey, BuildingMeta> = {
  [BuildingKey.MetalMine]: {
    key: BuildingKey.MetalMine,
    label: 'Mine metal',
    description: 'Extrait du metal brut en continu.',
    category: BuildingCategory.Production
  },
  [BuildingKey.CrystalMine]: {
    key: BuildingKey.CrystalMine,
    label: 'Mine cristal',
    description: 'Extrait le cristal pour les technologies avancees.',
    category: BuildingCategory.Production
  },
  [BuildingKey.DeuteriumSynthesizer]: {
    key: BuildingKey.DeuteriumSynthesizer,
    label: 'Synthe deut',
    description: 'Synthese du deuterium, plus efficace loin du soleil.',
    category: BuildingCategory.Production
  },
  [BuildingKey.SolarPlant]: {
    key: BuildingKey.SolarPlant,
    label: 'Centrale solaire',
    description: 'Genere de l energie selon la position de la planete.',
    category: BuildingCategory.Production
  },
  [BuildingKey.MetalStorage]: {
    key: BuildingKey.MetalStorage,
    label: 'Stockage metal',
    description: 'Augmente la capacite de stockage du metal.',
    category: BuildingCategory.Production
  },
  [BuildingKey.CrystalStorage]: {
    key: BuildingKey.CrystalStorage,
    label: 'Stockage cristal',
    description: 'Augmente la capacite de stockage du cristal.',
    category: BuildingCategory.Production
  },
  [BuildingKey.DeuteriumTank]: {
    key: BuildingKey.DeuteriumTank,
    label: 'Reservoir deuterium',
    description: 'Augmente la capacite de stockage du deuterium.',
    category: BuildingCategory.Production
  },
  [BuildingKey.RoboticsFactory]: {
    key: BuildingKey.RoboticsFactory,
    label: 'Usine robots',
    description: 'Accroit la vitesse de construction.',
    category: BuildingCategory.Installation
  },
  [BuildingKey.Shipyard]: {
    key: BuildingKey.Shipyard,
    label: 'Chantier spatial',
    description: 'Permet la construction de vaisseaux.',
    category: BuildingCategory.Installation
  },
  [BuildingKey.ResearchLab]: {
    key: BuildingKey.ResearchLab,
    label: 'Laboratoire',
    description: 'Permet de lancer les recherches.',
    category: BuildingCategory.Installation
  }
};

export const RESEARCH_META: Record<ResearchKey, ResearchMeta> = {
  [ResearchKey.Energy]: {
    key: ResearchKey.Energy,
    label: 'Energie',
    description: 'Optimise la production d energie.'
  },
  [ResearchKey.Laser]: {
    key: ResearchKey.Laser,
    label: 'Laser',
    description: 'Faisceaux laser avances.'
  },
  [ResearchKey.Ion]: {
    key: ResearchKey.Ion,
    label: 'Ions',
    description: 'Technologie ionique.'
  },
  [ResearchKey.Hyperspace]: {
    key: ResearchKey.Hyperspace,
    label: 'Hyperspace',
    description: 'Comprendre les courbures spatiales.'
  },
  [ResearchKey.CombustionDrive]: {
    key: ResearchKey.CombustionDrive,
    label: 'Combustion',
    description: 'Ameliore la propulsion de base.'
  },
  [ResearchKey.ImpulseDrive]: {
    key: ResearchKey.ImpulseDrive,
    label: 'Impulsion',
    description: 'Propulsion par impulsion.'
  },
  [ResearchKey.Hyperdrive]: {
    key: ResearchKey.Hyperdrive,
    label: 'Hyperespace',
    description: 'Propulsion hyperespace.'
  },
  [ResearchKey.Espionage]: {
    key: ResearchKey.Espionage,
    label: 'Espionnage',
    description: 'Sondes et detection avancees.'
  }
};

export const SHIP_META: Record<ShipKey, ShipMeta> = {
  [ShipKey.SmallCargo]: {
    key: ShipKey.SmallCargo,
    label: 'Petit transporteur',
    description: 'Transport rapide pour petites cargaisons.'
  },
  [ShipKey.LargeCargo]: {
    key: ShipKey.LargeCargo,
    label: 'Grand transporteur',
    description: 'Transport lourd pour grosses cargaisons.'
  },
  [ShipKey.LightFighter]: {
    key: ShipKey.LightFighter,
    label: 'Chasseur leger',
    description: 'Vaisseau de combat rapide.'
  },
  [ShipKey.Probe]: {
    key: ShipKey.Probe,
    label: 'Sonde',
    description: 'Sonde d espionnage.'
  }
};

export const BUILDING_KEYS = Object.keys(BUILDING_META) as BuildingKey[];
export const RESEARCH_KEYS = Object.keys(RESEARCH_META) as ResearchKey[];
export const SHIP_KEYS = Object.keys(SHIP_META) as ShipKey[];
