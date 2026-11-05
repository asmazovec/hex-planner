export type ExpansionId = 'pok' | 'te';

export type UnitId = 'carrier' | 'cruiser' | 'destroyer' | 'dreadnought' | 'warsun'
  | 'flagship' | 'fighter' | 'infantry' | 'mech';
export type UnitCounts = Partial<Record<UnitId, number>>;

export interface PlanetDef { id: string; name: string; resources: number; influence: number; }

export type Anomaly = 'asteroid' | 'nebula' | 'supernova' | 'rift' | 'scar';

export interface TileDef {
  id: string;
  /** Printed number; a double-sided tile shares it between its ids (83A, 83B). */
  number: string;
  planetIds: string[];
  kind: 'system' | 'home' | 'hyperlane' | 'fracture';
  anomaly?: Anomaly;
  /** Only tile 117 (The Watchtower) has two anomalies. */
  secondAnomaly?: Anomaly;
  wormholes: string[];
}

export interface UnitDef {
  id: UnitId;
  name: string;
  /** Cost per unit: a fighter or infantry costs 0.5, because 1 resource produces 2. */
  cost: number;
  capacity: number;
  capacityUsed: number;
  ground: boolean;
  fighter: boolean;
}

export interface FactionDef {
  id: string;
  name: string;
  /** Tile holding the home planets, where the starting units begin. */
  homeTile: string;
  startUnits: UnitCounts;
}

export interface MapTemplate {
  playerCount: number;
  /**
   * Axial coordinates of a flat-top hex grid: north is r - 1, north-east is q + 1, r - 1.
   * `fixed` uses the Game.map format, `<tileId>` or `<tileId>@<rotation 0-5>`.
   */
  slots: { q: number; r: number; fixed?: string }[];
}

export interface DataPack {
  version: string;
  tiles: Record<string, TileDef>;
  planets: Record<string, PlanetDef>;
  /** `mech` is absent unless Prophecy of Kings is on: its mechs do not exist without it. */
  units: Record<UnitId, UnitDef>;
  factions: Record<string, FactionDef>;
  templates: MapTemplate[];
}
