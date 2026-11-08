// Builds src/data/packs/*.json and src/data/provenance.json from a fixed commit of the source.
// Downloads go to a temp directory outside the repo and are only ever parsed as data.
// What each exclusion and correction rests on is recorded in docs/data-verification.md.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rotateLanes } from '../src/domain/lanes';
import type { Anomaly, ComponentPack, DataPack, FactionDef, FactionSheet, LeaderType, MapLayout, MapTemplate, PlanetDef, PlanetTrait, ShipLevels, ShipStats, StructureDef, StructureKind, StructureStats, TechDef, TechType, TileDef, UnitCounts, UnitDef, UnitId } from '../src/domain/types';

const REPO = 'AsyncTI4/TI4_map_generator_bot';
const COMMIT = '9eee64a3b13fc698b3ee174590dde40e005c0dfe';
/** Where the build keeps its copy of the source; `npx tsx scripts/build-data.ts` fills it. */
export const SOURCE_CACHE = join(tmpdir(), `ti4-source-${COMMIT}`);
const COMMIT_DATE = '2026-11-05';
const RESOURCES = 'src/main/resources/';
const DATA_VERSION = `${COMMIT_DATE}-${COMMIT.slice(0, 7)}`;
const WANTED = /^(planets|systems)\/[^/]+\.json$|^data\/(units|factions|technologies|abilities|map_templates|strategy_card_sets|strategy_cards|leaders|breakthroughs)\/[^/]+\.json$|^data\/hyperlanes\.properties$/;

type PackId = 'base' | 'pok' | 'te';
const PACK_OF_SOURCE: Record<string, PackId> = { base: 'base', pok: 'pok', thunders_edge: 'te' };
/** Codex content has no pack of its own. Codex 3 (Keleres) needs Prophecy of Kings tiles. */
const packOfSource = (source: string): PackId | null =>
  PACK_OF_SOURCE[source] ?? (/^codex\d*$/.test(source) ? 'pok' : null);

const MECATOL_REX = '18';

const TILE_IDS: Record<PackId, RegExp> = {
  base: /^(0[1-9]|[1-4]\d|5[01])$/,
  pok: /^(5[2-9]|[67]\d|8[01]|82[ab]|(8[3-9]|9[01])[ab])$/,
  te: /^(9[2-5]|96[ab]|9[7-9]|10\d|11[0-8]|fracture[1-7])$/,
};
/** In-scope source ids that are not physical tiles. */
const EXCLUDED_SYSTEMS: Record<string, string> = {
  c41: 'source-only Ordinian variant, outside the printed 1-51 range',
  '92new': 'Keleres uses the physical home tile of an absent faction (14)',
  '93new': 'Keleres uses the physical home tile of an absent faction (58)',
  '94new': 'Keleres uses the physical home tile of an absent faction (2)',
  silver_flame: 'relic marker with no planets or printed number',
};
const ROTATED_HYPERLANE = /^(8[3-9]|9[01])[ab](60|120|180|240|300)$/;
/** Planets with no tile in the source that are real components of the pack. */
const OFF_TILE_PLANETS: Record<PackId, string[]> = {
  base: [],
  pok: ['mirage', 'custodiavigilia'],
  te: ['thundersedge', 'avernus', 'triad', 'ocean1', 'ocean2', 'ocean3', 'ocean4', 'ocean5'],
};
const EXCLUDED_PLANETS: Record<string, string> = {
  ordinianc4: 'lies on excluded tile c41',
  archonrenk: 'lies on excluded tile 92new', archontauk: 'lies on excluded tile 92new',
  valkk: 'lies on excluded tile 93new', ylirk: 'lies on excluded tile 93new', avark: 'lies on excluded tile 93new',
  mollprimusk: 'lies on excluded tile 94new',
  illusion: 'renamed copy of Mirage, no official component found',
  phantasm: 'renamed copy of Mirage, no official component found',
  loststation: 'no official component found',
};
/** Printed in the Thunder's Edge rulebook, absent from the source at this commit. */
const TE_RULEBOOK_HYPERLANES = ['119A', '120A', '121A', '122A', '123A', '124A'];
/** Gate tiles stand on the map, but the home planets and starting units are on another tile. */
const HOME_PLANET_TILE: Record<string, string> = { ghost: '51', crimson: '118' };
const KELERES_HOME_TILE: Record<string, string> = { keleresm: '2', keleresx: '14', keleresa: '58' };
/** Where the reinforcement limits come from: LRR 96.2 in the tirules2 copy of the Rules Reference. */
const LIMITS_SOURCE = { source: 'https://tirules2.com/R_units', repository: 'https://github.com/dangothemango/tirules', license: 'GPL-3.0', section: 'LRR 96.2' };
/**
 * Figures of each unit in one colour, LRR 96.2. The 12 infantry and 10 fighter figures are no limit: tokens stand in
 * for them (LRR 96 note 2.1), so theirs stay null.
 */
const UNIT_LIMITS: Record<UnitId, number | null> = {
  carrier: 4, cruiser: 8, destroyer: 8, dreadnought: 5, warsun: 2, flagship: 1, mech: 4, infantry: null, fighter: null,
};
const TOKEN_UNITS = { infantry: 12, fighter: 10 };
const STRUCTURE_LIMITS: Record<StructureKind, number> = { pds: 6, spacedock: 3 };
const TECH_TYPES: Record<string, TechType> = { PROPULSION: 'propulsion', BIOTIC: 'biotic', CYBERNETIC: 'cybernetic', WARFARE: 'warfare' };
const SKIPS: Record<string, NonNullable<PlanetDef['skip']>> = { UNITSKIP: 'unit', NONUNITSKIP: 'nonUnit' };
const UNIT_NAMES: Record<UnitId, string> = {
  carrier: 'Carrier', cruiser: 'Cruiser', destroyer: 'Destroyer', dreadnought: 'Dreadnought', warsun: 'War Sun',
  flagship: 'Flagship', fighter: 'Fighter', infantry: 'Infantry', mech: 'Mech',
};
const UNIT_CODES: Record<string, UnitId> = {
  cv: 'carrier', ca: 'cruiser', cr: 'cruiser', dd: 'destroyer', dn: 'dreadnought', ws: 'warsun', fs: 'flagship',
  ff: 'fighter', inf: 'infantry', gf: 'infantry', mech: 'mech', mf: 'mech',
};
const STRUCTURE_CODES = new Set(['pds', 'pd', 'sd']);
const ANOMALY_FLAGS: [string, Anomaly][] = [
  ['isGravityRift', 'rift'], ['isAsteroidField', 'asteroid'], ['isNebula', 'nebula'], ['isSupernova', 'supernova'], ['isScar', 'scar'],
];

export function checkCounts(actual: Record<string, number>, expected: Record<string, number>): void {
  const wrong = [...new Set([...Object.keys(expected), ...Object.keys(actual)])]
    .filter(key => actual[key] !== expected[key])
    .map(key => `${key}: expected ${expected[key]}, got ${actual[key]}`);
  if (wrong.length) throw new Error(`Component counts do not match: ${wrong.join('; ')}`);
}

/** Parses the source's "2 cv, cr, 4 inf n, pds n" notation; structures are not UnitIds. */
export function parseStartingFleet(fleet: string): UnitCounts {
  const units: UnitCounts = {};
  for (const item of fleet.split(',').map(s => s.trim()).filter(Boolean)) {
    const match = item.match(/^(\d+)?\s*([a-z]+)/);
    if (!match) throw new Error(`Cannot read starting fleet item "${item}"`);
    if (STRUCTURE_CODES.has(match[2])) continue;
    const unit = UNIT_CODES[match[2]];
    if (!unit) throw new Error(`Unknown unit code "${match[2]}" in "${fleet}"`);
    units[unit] = (units[unit] ?? 0) + Number(match[1] ?? 1);
  }
  return units;
}

/** The source numbers positions ring + index: index 1 is north, then clockwise. */
export function positionToAxial(position: string): { q: number; r: number } {
  const ring = Number(position.slice(0, -2));
  const index = Number(position.slice(-2));
  if (ring === 0) return { q: 0, r: 0 };
  const steps: [number, number][] = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  let q = 0;
  let r = -ring;
  for (let i = 0; i < index - 1; i++) {
    const [dq, dr] = steps[Math.floor(i / ring)];
    q += dq;
    r += dr;
  }
  return { q, r };
}

export function normalizeTileId(id: string): string {
  const printed = id.match(/^0*(\d+)([ab]?)$/);
  return printed ? printed[1] + printed[2].toUpperCase() : id;
}

/** Every line of `data/hyperlanes.properties`, rotated ones included, as edge pairs with the smaller edge first. */
function readLaneLines(text: string): Record<string, [number, number][]> {
  const lines: Record<string, [number, number][]> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^(\d+[ab]\d*)=(.+)$/i);
    if (!match) continue;
    const rows = match[2].split(';').map(row => row.split(',').map(Number));
    if (rows.length !== 6 || rows.some(row => row.length !== 6)) throw new Error(`Cannot read hyperlane edges of ${match[1]}`);
    const pairs: [number, number][] = [];
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) if (rows[i][j] === 1 || rows[j][i] === 1) pairs.push([i, j]);
    lines[match[1].toLowerCase()] = pairs;
  }
  return lines;
}

/**
 * Reads `data/hyperlanes.properties`: each line is a tile id and six rows of six numbers, a 1 in row i, column j meaning a
 * lane between edges i and j. Edge 0 is at the top and numbers go clockwise. Only the unrotated sides (`83a`) are
 * returned; `83a60` and the rest are the same tile turned, see `checkLaneRotations`.
 */
export function parseHyperlanes(text: string): Record<string, [number, number][]> {
  const lanes: Record<string, [number, number][]> = {};
  for (const [id, pairs] of Object.entries(readLaneLines(text))) {
    if (/^\d+[ab]$/.test(id)) lanes[normalizeTileId(id)] = pairs;
  }
  return lanes;
}

/** Fails unless every rotated line of the source (`83a60` to `83a300`) is its base line turned that many 60-degree steps clockwise. */
export function checkLaneRotations(text: string): void {
  const lines = readLaneLines(text);
  for (const [id, base] of Object.entries(lines)) {
    if (!/^\d+[ab]$/.test(id)) continue;
    for (let steps = 1; steps < 6; steps++) {
      const turned = lines[`${id}${steps * 60}`];
      if (!turned) throw new Error(`Hyperlane ${id} has no line for ${steps * 60} degrees`);
      const expected = JSON.stringify(rotateLanes(base, steps));
      if (JSON.stringify(turned) !== expected) throw new Error(`Hyperlane ${id} turned ${steps * 60} degrees is not its base turned clockwise`);
    }
  }
}

const tileNumber = (id: string) => id.replace(/[AB]$/, '');

// Source shapes: only the fields read here, checked against the files at COMMIT.
interface SourceSystem {
  id: string; source: string; planets?: string[]; wormholes?: string[]; tileBack?: string;
  isHyperlane?: boolean; isFracture?: boolean; hasEgress?: boolean; [flag: string]: unknown;
}
interface SourcePlanet {
  id: string; name: string; resources: number; influence: number; source: string; techSpecialties?: string[] | null;
  planetType?: string | null; planetTypes?: string[] | null; legendaryAbilityName?: string | null;
}
interface SourceUnit {
  id: string; source: string; cost?: number; capacityValue?: number; capacityUsed?: number; isGroundForce?: boolean;
  combatHitsOn?: number; moveValue?: number; baseType?: string; name?: string; faction?: string; upgradesFromUnitId?: string;
  homebrewReplacesID?: string; combatDieCount?: number; sustainDamage?: boolean; afbHitsOn?: number; afbDieCount?: number;
  bombardHitsOn?: number; bombardDieCount?: number; spaceCannonHitsOn?: number; spaceCannonDieCount?: number;
  productionValue?: string | number; basicProduction?: string; requiredTechId?: string;
}
interface SourceFaction {
  alias: string; factionName: string; homeSystem: string; startingFleet: string; source: string; commodities: number;
  abilities: string[]; startingTech?: string[]; startingTechOptions?: string[]; startingTechAmount?: number;
  leaders?: string[]; units?: string[]; factionTech?: string[];
}
interface SourceLeader { id: string; type: string; name: string; title?: string; source: string; }
interface SourceBreakthrough { alias: string; name: string; faction: string; source: string; }
interface SourceTech { alias: string; name: string; types: string[]; source: string; requirements?: string | null; faction?: string; }
interface SourceAbility { id: string; name: string; source: string; }
interface SourceTemplate { alias: string; playerCount: number; templateTiles: { pos: string; staticTileId?: string }[]; }
interface SourceCard { id: string; initiative: number; name: string; source: string; }
interface SourceCardSet { alias: string; scIDs: string[]; }

async function download(): Promise<string> {
  const root = SOURCE_CACHE;
  const listPath = join(root, 'files-v3.json');
  if (!existsSync(listPath)) {
    const response = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${COMMIT}?recursive=1`);
    if (!response.ok) throw new Error(`Tree request failed: ${response.status}`);
    const { tree, truncated } = await response.json() as { tree: { path: string; type: string }[]; truncated: boolean };
    if (truncated) throw new Error('Source tree listing is truncated');
    const files = tree.filter(item => item.type === 'blob' && item.path.startsWith(RESOURCES))
      .map(item => item.path.slice(RESOURCES.length)).filter(path => WANTED.test(path));
    mkdirSync(root, { recursive: true });
    writeFileSync(listPath, JSON.stringify(files));
  }
  const files = JSON.parse(readFileSync(listPath, 'utf8')) as string[];
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const file = files[next++];
      const target = join(root, file);
      if (existsSync(target)) continue;
      const response = await fetch(`https://raw.githubusercontent.com/${REPO}/${COMMIT}/${RESOURCES}${file}`);
      if (!response.ok) throw new Error(`Download of ${file} failed: ${response.status}`);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    }
  };
  await Promise.all(Array.from({ length: 16 }, worker));
  return root;
}

const readJson = <T>(root: string, path: string): T => JSON.parse(readFileSync(join(root, path), 'utf8')) as T;
const readDir = <T>(root: string, dir: string): T[] =>
  readdirSync(join(root, dir)).filter(name => name.endsWith('.json')).map(name => readJson<T>(root, `${dir}/${name}`));

function buildTile(system: SourceSystem, pack: PackId): TileDef {
  const id = normalizeTileId(system.id);
  const planetIds = system.planets ?? [];
  const anomalies = ANOMALY_FLAGS.filter(([flag]) => system[flag] === true).map(([, anomaly]) => anomaly);
  if (anomalies.length > 2) throw new Error(`Tile ${id} has more than two anomalies`);
  const kind: TileDef['kind'] = system.isHyperlane ? 'hyperlane' : system.isFracture ? 'fracture'
    : system.tileBack === 'green' && planetIds.length > 0 ? 'home' : 'system';
  const tile: TileDef = {
    id, number: tileNumber(id), planetIds, kind, wormholes: (system.wormholes ?? []).map(w => w.toLowerCase()),
  };
  if (anomalies[0]) tile.anomaly = anomalies[0];
  if (anomalies[1]) tile.secondAnomaly = anomalies[1];
  if (system.hasEgress === true) tile.egress = true;
  if (!TILE_IDS[pack].test(system.id)) throw new Error(`Tile ${system.id} is not expected in pack ${pack}`);
  return tile;
}

function buildTiles(systems: SourceSystem[], lanes: Record<string, [number, number][]>): Record<PackId, Record<string, TileDef>> {
  const tiles: Record<PackId, Record<string, TileDef>> = { base: {}, pok: {}, te: {} };
  for (const system of systems) {
    const pack = packOfSource(system.source);
    if (!pack || system.id in EXCLUDED_SYSTEMS || ROTATED_HYPERLANE.test(system.id)) continue;
    const tile = buildTile(system, pack);
    if (tile.kind === 'hyperlane') {
      if (!lanes[tile.id]) throw new Error(`Hyperlane ${tile.id} has no edge data in the source`);
      tile.lanes = lanes[tile.id];
    }
    tiles[pack][tile.id] = tile;
  }
  for (const id of TE_RULEBOOK_HYPERLANES) {
    tiles.te[id] = { id, number: tileNumber(id), planetIds: [], kind: 'hyperlane', wormholes: [] };
  }
  return tiles;
}

/** Technology specialties and skips of a planet; an absent or null field means none, an unknown value fails the build. */
export function readPlanetMarks(planet: Pick<SourcePlanet, 'id' | 'techSpecialties'>): Pick<PlanetDef, 'tech' | 'skip'> {
  const tech: TechType[] = [];
  let skip: PlanetDef['skip'];
  for (const value of planet.techSpecialties ?? []) {
    if (value in TECH_TYPES) { if (!tech.includes(TECH_TYPES[value])) tech.push(TECH_TYPES[value]); }
    else if (value in SKIPS) skip = SKIPS[value];
    else throw new Error(`Planet ${planet.id} has unknown tech specialty ${value}`);
  }
  return { ...(tech.length > 0 ? { tech } : {}), ...(skip ? { skip } : {}) };
}

const TRAITS: Record<string, PlanetTrait> = { CULTURAL: 'cultural', HAZARDOUS: 'hazardous', INDUSTRIAL: 'industrial' };
/** Source planet types that give no trait; FAKE marks a stand-in (The Triad has only it) and is read like the rest. */
const NO_TRAIT = ['FACTION', 'NONE', 'MR', 'SPACESTATION', 'LIGHTNING', 'FAKE'];

/** Traits and the legendary ability name of a planet. Both `planetType` and `planetTypes` are read; an unknown value fails the build. */
export function readPlanetKind(planet: Pick<SourcePlanet, 'id' | 'planetType' | 'planetTypes' | 'legendaryAbilityName'>): Pick<PlanetDef, 'traits' | 'legendary'> {
  const traits: PlanetTrait[] = [];
  for (const value of [planet.planetType, ...(planet.planetTypes ?? [])]) {
    if (value === undefined || value === null) continue;
    if (value in TRAITS) { if (!traits.includes(TRAITS[value])) traits.push(TRAITS[value]); }
    else if (!NO_TRAIT.includes(value)) throw new Error(`Planet ${planet.id} has unknown planet type ${value}`);
  }
  return { ...(traits.length > 0 ? { traits } : {}), ...(planet.legendaryAbilityName ? { legendary: planet.legendaryAbilityName } : {}) };
}

/** A space station (Thunder's Edge): the source gives it the planet type SPACESTATION. */
export function readStation(planet: Pick<SourcePlanet, 'planetType' | 'planetTypes'>): Pick<PlanetDef, 'station'> {
  return [planet.planetType, ...(planet.planetTypes ?? [])].includes('SPACESTATION') ? { station: true } : {};
}

function buildPlanets(all: SourcePlanet[], tiles: Record<PackId, Record<string, TileDef>>): Record<PackId, Record<string, PlanetDef>> {
  const planets: Record<PackId, Record<string, PlanetDef>> = { base: {}, pok: {}, te: {} };
  const byId = new Map(all.map(planet => [planet.id, planet]));
  const place = (pack: PackId, id: string) => {
    const planet = byId.get(id);
    if (!planet) throw new Error(`Unknown planet ${id}`);
    if (packOfSource(planet.source) !== pack) throw new Error(`Planet ${id} of source ${planet.source} is not in pack ${pack}`);
    if (id in EXCLUDED_PLANETS) throw new Error(`Excluded planet ${id} is in use`);
    planets[pack][id] = { id, name: planet.name, resources: planet.resources, influence: planet.influence, ...readPlanetMarks(planet), ...readPlanetKind(planet), ...readStation(planet) };
  };
  for (const pack of ['base', 'pok', 'te'] as PackId[]) {
    for (const tile of Object.values(tiles[pack])) for (const id of tile.planetIds) place(pack, id);
    for (const id of OFF_TILE_PLANETS[pack]) place(pack, id);
  }
  for (const planet of all) {
    const pack = packOfSource(planet.source);
    if (pack && !planets[pack][planet.id] && !(planet.id in EXCLUDED_PLANETS)) {
      throw new Error(`Official planet ${planet.id} (${planet.source}) is neither placed nor excluded`);
    }
  }
  return planets;
}

const SHIP_TYPES: UnitId[] = ['flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter'];
/** Unit types read with levels: the ships, and infantry for Infantry II. */
const LEVEL_TYPES: UnitId[] = [...SHIP_TYPES, 'infantry'];
/** The official units; the other files of `data/units` are homebrew, and `ds.json` marks its Ghemina carriers as `base`. */
const SHIP_FILES = ['baseUnits', 'pok', 'te_units', 'keleres'];
/** Beyond levels I and II, which is all the app has; anything else unexpected fails the build. */
const EXCLUDED_UNITS: Record<string, string> = {
  mentak_cruiser3: 'Corsair upgrades from the common Cruiser II: a third level, and Mentak has no cruiser of its own',
};
/** The source files the one Keleres flagship under `keleresm`; the three Keleres factions differ only by home tile. */
const FACTIONS_OF_SOURCE: Record<string, string[]> = { keleresm: ['keleresa', 'keleresm', 'keleresx'] };

function readRoll(hit: number | undefined, dice: number | undefined): ShipStats['barrage'] {
  return hit === undefined ? undefined : { hit, dice: dice ?? 1 };
}

function readShip(unit: SourceUnit): ShipStats {
  if (unit.cost === undefined || unit.name === undefined) throw new Error(`Ship ${unit.id} lacks a cost or a name`);
  const barrage = readRoll(unit.afbHitsOn, unit.afbDieCount);
  const bombard = readRoll(unit.bombardHitsOn, unit.bombardDieCount);
  const cannon = readRoll(unit.spaceCannonHitsOn, unit.spaceCannonDieCount);
  return {
    id: unit.id, name: unit.name.trim(), cost: unit.cost, capacity: unit.capacityValue ?? 0, combat: unit.combatHitsOn ?? null,
    dice: unit.combatDieCount ?? 1, move: unit.moveValue ?? null,
    ...(unit.sustainDamage ? { sustain: true as const } : {}),
    ...(barrage ? { barrage } : {}), ...(bombard ? { bombard } : {}), ...(cannon ? { cannon } : {}),
  };
}

type ShipTable = Partial<Record<UnitId, ShipLevels>>;
export interface ShipSelection {
  generic: ShipTable;
  factions: Record<string, ShipTable>;
  excluded: { homebrew: number; nowarsun: number; cavalry: number; otherSource: number; thirdLevel: number };
}

/** Levels of one owner's ship type. Null when only an excluded third level is there. */
function readLevels(units: SourceUnit[]): ShipLevels | null {
  const one = units.filter(unit => !unit.upgradesFromUnitId);
  if (one.length > 1) throw new Error(`Two level I ships: ${one.map(unit => unit.id).join(', ')}`);
  const twos = units.filter(unit => {
    if (!unit.upgradesFromUnitId) return false;
    if (unit.upgradesFromUnitId !== one[0]?.id) throw new Error(`Ship ${unit.id} upgrades from ${unit.upgradesFromUnitId}, no level I of its owner`);
    return true;
  });
  if (twos.length > 1) throw new Error(`Two level II ships: ${twos.map(unit => unit.id).join(', ')}`);
  if (one.length === 0) return null;
  return { one: readShip(one[0]), ...(twos[0] ? { two: readShip(twos[0]) } : {}) };
}

/** Each ship type with its levels, in the base table and per faction. A faction name that is no pack faction fails the build. */
export function selectShips(units: SourceUnit[], factionIds: string[]): ShipSelection {
  const excluded: ShipSelection['excluded'] = { homebrew: 0, nowarsun: 0, cavalry: 0, otherSource: 0, thirdLevel: 0 };
  const groups = new Map<string, SourceUnit[]>();
  for (const unit of units) {
    if (!LEVEL_TYPES.includes(unit.baseType as UnitId)) continue;
    if (!packOfSource(unit.source)) excluded.otherSource += 1;
    else if (unit.homebrewReplacesID) excluded.homebrew += 1;
    else if (unit.id === 'nowarsun') excluded.nowarsun += 1;
    else if (/cavalry/.test(unit.id)) excluded.cavalry += 1;
    else if (unit.id in EXCLUDED_UNITS) excluded.thirdLevel += 1;
    else {
      for (const owner of unit.faction ? FACTIONS_OF_SOURCE[unit.faction] ?? [unit.faction] : ['']) {
        if (owner && !factionIds.includes(owner)) throw new Error(`Ship ${unit.id} names unknown faction ${unit.faction}`);
        const key = `${owner}|${unit.baseType}`;
        groups.set(key, [...(groups.get(key) ?? []), unit]);
      }
    }
  }
  const generic: ShipTable = {};
  const factions: Record<string, ShipTable> = Object.fromEntries(factionIds.map(id => [id, {}]));
  for (const [key, group] of groups) {
    const [owner, type] = key.split('|');
    const levels = readLevels(group);
    if (levels) (owner ? factions[owner] : generic)[type as UnitId] = levels;
  }
  for (const id of factionIds) if (!factions[id].flagship) throw new Error(`Faction ${id} has no flagship in the source`);
  return { generic, factions, excluded };
}

function buildUnits(root: string, ships: ShipTable): Record<PackId, Partial<Record<UnitId, UnitDef>>> {
  const units = [...readJson<SourceUnit[]>(root, 'data/units/baseUnits.json'), ...readJson<SourceUnit[]>(root, 'data/units/pok.json')];
  const find = (id: string) => {
    const unit = units.find(candidate => candidate.id === id);
    if (!unit) throw new Error(`Unit ${id} is missing from the source`);
    return unit;
  };
  const make = (id: UnitId): UnitDef => {
    const unit = find(id);
    // The generic War Sun has no capacityUsed in the source; its only faction variant says 1.
    const capacityUsed = unit.capacityUsed ?? (id === 'warsun' ? find('muaat_warsun').capacityUsed : undefined);
    if (unit.cost === undefined || capacityUsed === undefined) throw new Error(`Unit ${id} lacks cost or capacityUsed`);
    if (LEVEL_TYPES.includes(id) && !ships[id]) throw new Error(`Unit type ${id} has no base entry`);
    return {
      id, name: UNIT_NAMES[id], cost: unit.cost, capacity: unit.capacityValue ?? 0, capacityUsed,
      ground: unit.isGroundForce === true, fighter: id === 'fighter',
      combat: unit.combatHitsOn ?? null, move: unit.moveValue ?? null, limit: UNIT_LIMITS[id],
      ...(ships[id] ? { levels: ships[id] } : {}),
    };
  };
  const base = ['carrier', 'cruiser', 'destroyer', 'dreadnought', 'warsun', 'flagship', 'fighter', 'infantry'] as UnitId[];
  return { base: Object.fromEntries(base.map(id => [id, make(id)])), pok: { mech: make('mech') }, te: {} };
}

/** "+2" with basicProduction "res": the planet's resources plus 2. Anything else fails the build. */
export function readDockProduction(unit: Pick<SourceUnit, 'id' | 'productionValue' | 'basicProduction'>): number {
  const match = typeof unit.productionValue === 'string' ? unit.productionValue.match(/^\+(\d+)$/) : null;
  if (!match || unit.basicProduction !== 'res') throw new Error(`Space dock ${unit.id} has no production of resources plus a number`);
  return Number(match[1]);
}

function readStructure(unit: SourceUnit): StructureStats {
  if (!unit.name) throw new Error(`Structure ${unit.id} lacks a name`);
  const cannon = readRoll(unit.spaceCannonHitsOn, unit.spaceCannonDieCount);
  return {
    id: unit.id, name: unit.name.trim(),
    ...(unit.baseType === 'spacedock' ? { production: readDockProduction(unit) } : {}),
    ...(cannon ? { cannon } : {}),
  };
}

/** The common PDS and space dock at both levels; faction structures (Hel-Titan, Floating Factory, Dimensional Tear) are not read. */
export function buildStructures(units: SourceUnit[]): StructureDef[] {
  return (['pds', 'spacedock'] as StructureKind[]).map(id => {
    const one = units.find(unit => unit.id === id && !unit.faction);
    const two = units.find(unit => unit.upgradesFromUnitId === id && !unit.faction);
    if (!one || !two) throw new Error(`Structure ${id} lacks a level in the source`);
    return { id, limit: STRUCTURE_LIMITS[id], levels: { one: readStructure(one), two: readStructure(two) } };
  });
}

/**
 * What a faction starts knowing. A faction with `startingTechOptions` chooses `startingTechAmount` of them; an empty list
 * of options with a positive amount is a free choice, and an amount of 0 means no technology at all.
 */
export function readStartingTech(faction: Pick<SourceFaction, 'startingTech' | 'startingTechOptions' | 'startingTechAmount'>): Pick<FactionDef, 'startingTech' | 'startingTechChoice'> {
  const amount = faction.startingTechAmount ?? 0;
  return {
    startingTech: faction.startingTech ?? [],
    ...(amount > 0 ? { startingTechChoice: { amount, options: faction.startingTechOptions ?? [] } } : {}),
  };
}

/** Names and types only: the source's card text is not read. */
export function readTech(tech: SourceTech): TechDef {
  const type = TECH_TYPES[tech.types[0]];
  if (!type) throw new Error(`Technology ${tech.alias} has unknown type ${tech.types[0]}`);
  return { id: tech.alias, name: tech.name, type };
}

/** Letters of the source's `requirements`: "GG" is two biotic. */
const PREREQUISITES: Record<string, TechType> = { B: 'propulsion', G: 'biotic', Y: 'cybernetic', R: 'warfare' };

/** Prerequisites per colour. No field, or the text "null" (a card that cannot be researched), means none; another letter fails the build. */
export function readPrerequisites(tech: Pick<SourceTech, 'alias' | 'requirements'>): Partial<Record<TechType, number>> {
  const counts: Partial<Record<TechType, number>> = {};
  if (!tech.requirements || tech.requirements === 'null') return counts;
  for (const letter of tech.requirements) {
    const type = PREREQUISITES[letter];
    if (!type) throw new Error(`Technology ${tech.alias} has unknown prerequisite ${letter}`);
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
}

const UPGRADE_KINDS: (UnitId | StructureKind)[] = [...LEVEL_TYPES, 'pds', 'spacedock'];

/**
 * A faction technology: a colour, or a unit upgrade (`UNITUPGRADE`), or none (`NONE`, the Valefar Assimilators); its
 * prerequisites. What a unit upgrade upgrades is the unit whose `requiredTechId` names it. No card text is read.
 */
export function readFactionTech(tech: SourceTech, upgradedBy: Map<string, string>): TechDef {
  if (tech.types.length !== 1) throw new Error(`Technology ${tech.alias} has ${tech.types.length} types`);
  const counts = readPrerequisites(tech);
  const requires = Object.keys(counts).length > 0 ? { requires: counts } : {};
  if (tech.types[0] === 'UNITUPGRADE') {
    const upgrade = upgradedBy.get(tech.alias) as UnitId | StructureKind | undefined;
    if (!upgrade || !UPGRADE_KINDS.includes(upgrade)) throw new Error(`Unit upgrade ${tech.alias} upgrades no known unit (${upgrade})`);
    return { id: tech.alias, name: tech.name, type: null, ...requires, upgrade };
  }
  if (tech.types[0] === 'NONE') return { id: tech.alias, name: tech.name, type: null, ...requires };
  return { ...readTech(tech), ...requires };
}

const LEADER_TYPES: Record<string, LeaderType> = { agent: 'agent', commander: 'commander', hero: 'hero' };
/** Files of the official leaders; the others of `data/leaders` are homebrew. */
const LEADER_FILES = ['pok', 'te_leaders', 'other', 'generic'];
const BREAKTHROUGH_FILE = 'data/breakthroughs/te_breakthroughs.json';
/** What Thunder's Edge replaces. The source files only the new card under each id; the printed swap of Jol-Nar is in the rulebook's Expansion Integration. */
const JOLNAR_OLD_COMMANDER = { id: 'jolnarcommander-pok', type: 'commander' as const, name: 'Ta Zern', pack: 'pok' as const };
const REPLACED_BY_TE: Record<string, string> = {
  jolnarcommander: JOLNAR_OLD_COMMANDER.id, 'xxchahero-te': 'xxchahero', 'naaluagent-te': 'naaluagent', naalu_mech_te: 'naalu_mech_omega',
  executiveorder: 'iihq',
};
/**
 * Executive Order is filed under `keleres` as a Thunder's Edge technology, but no faction entry lists it. The rulebook gives
 * Keleres two faction technologies, and the source's Thunder's Edge breakthrough of Keleres is named I.I.H.Q. Modernization,
 * so Executive Order takes the place of that technology: an inference recorded in docs/data-verification.md.
 */
const EXTRA_FACTION_TECH: Record<string, string[]> = { keleresa: ['executiveorder'], keleresm: ['executiveorder'], keleresx: ['executiveorder'] };
/** Leaders and mechs a faction's source entry no longer lists: the printed cards of an earlier expansion, and Eidolon Maximum of the Naaz-Rokha. */
const EXTRA_LEADERS: Record<string, string[]> = { naalu: ['naaluagent'], xxcha: ['xxchahero-te'] };
const EXTRA_MECHS: Record<string, string[]> = { naalu: ['naalu_mech_omega'], naaz: ['naaz_voltron'] };

const componentPack = (source: string, what: string): ComponentPack => {
  const pack = packOfSource(source);
  if (!pack) throw new Error(`${what} has source ${source}, which is not in scope`);
  return pack;
};

/** Names, origins and numbers only: the card text is retold in `sheetSummaries`. */
export function buildSheet(
  faction: Pick<SourceFaction, 'alias' | 'abilities' | 'leaders' | 'units' | 'factionTech'>, abilities: Map<string, SourceAbility>, leaders: Map<string, SourceLeader>, units: Map<string, SourceUnit>, breakthrough?: SourceBreakthrough,
  technologies: Map<string, SourceTech> = new Map(),
): FactionSheet {
  const owner = faction.alias;
  const replaces = (id: string) => (REPLACED_BY_TE[id] ? { replaces: REPLACED_BY_TE[id] } : {});
  const leaderIds = [...new Set([...(faction.leaders ?? []), ...(EXTRA_LEADERS[owner] ?? [])])];
  const mechIds = [...new Set([...(faction.units ?? []), ...(EXTRA_MECHS[owner] ?? [])])]
    .filter(id => units.get(id)?.baseType === 'mech' && id !== 'mech');
  return {
    abilities: faction.abilities.map(id => {
      const found = abilities.get(id);
      if (!found) throw new Error(`Faction ${owner} has unknown ability ${id}`);
      return { id, name: found.name, pack: componentPack(found.source, id) };
    }),
    leaders: [
      ...(owner === 'jolnar' ? [JOLNAR_OLD_COMMANDER] : []),
      ...leaderIds.map(id => {
        const found = leaders.get(id);
        const type = found && LEADER_TYPES[found.type];
        if (!found || !type) throw new Error(`Faction ${owner} has unknown leader ${id}`);
        const pack: ComponentPack = REPLACED_BY_TE[id] ? 'te' : componentPack(found.source, id);
        return { id, type, name: found.name, ...(found.title ? { title: found.title } : {}), pack, ...replaces(id) };
      }),
    ],
    mechs: mechIds.map(id => {
      const unit = units.get(id)!;
      return {
        id, name: unit.name?.trim() ?? id, pack: componentPack(unit.source, id), cost: unit.cost ?? null, combat: unit.combatHitsOn ?? null,
        dice: unit.combatDieCount ?? 1, ...(unit.sustainDamage ? { sustain: true as const } : {}), ...replaces(id),
      };
    }),
    techs: [...new Set([...(faction.factionTech ?? []), ...(EXTRA_FACTION_TECH[owner] ?? [])])].map(id => {
      const found = technologies.get(id);
      if (!found) throw new Error(`Faction ${owner} has unknown faction technology ${id}`);
      return { id, name: found.name, pack: componentPack(found.source, id), ...replaces(id) };
    }),
    ...(breakthrough ? { breakthrough: { id: breakthrough.alias, name: breakthrough.name, pack: componentPack(breakthrough.source, breakthrough.alias) } } : {}),
  };
}

function buildFactions(all: SourceFaction[], tiles: Record<PackId, Record<string, TileDef>>, abilityNames: Map<string, string>): Record<PackId, Record<string, FactionDef>> {
  const factions: Record<PackId, Record<string, FactionDef>> = { base: {}, pok: {}, te: {} };
  for (const faction of all) {
    const pack = packOfSource(faction.source);
    if (!pack || !faction.homeSystem) continue; // the source's "neutral" pseudo-faction has no home
    const id = faction.alias;
    const homeTile = KELERES_HOME_TILE[id] ?? HOME_PLANET_TILE[id] ?? normalizeTileId(faction.homeSystem);
    const known = tiles.base[homeTile] ?? tiles[pack][homeTile];
    if (!known) throw new Error(`Faction ${id} has unknown home tile ${homeTile}`);
    if (known.planetIds.length === 0) throw new Error(`Home tile ${homeTile} of ${id} has no planets`);
    factions[pack][id] = {
      id, name: faction.factionName, homeTile, startUnits: parseStartingFleet(faction.startingFleet),
      ...readStartingTech(faction),
      commodities: faction.commodities,
      abilities: faction.abilities.map(ability => {
        const name = abilityNames.get(ability);
        if (!name) throw new Error(`Faction ${id} has unknown ability ${ability}`);
        return name;
      }),
      ...(HOME_PLANET_TILE[id] ? { gateTile: normalizeTileId(faction.homeSystem) } : {}),
    };
  }
  return factions;
}

/**
 * Home slots by player count, seat 1 at the top and then clockwise. Positions of the home systems in the map templates
 * of Milty Draft (MAP_3 to MAP_8 in js/generate-map.js, public repository shenanigans-be/miltydraft), used as facts only:
 * the user drafts there, so the seats must land where its string puts the homes.
 */
const MILTY_HOMES: Record<number, string[]> = {
  3: ['0,-3', '3,0', '-3,3'],
  4: ['0,-3', '3,-3', '0,3', '-3,3'],
  5: ['0,-3', '3,-3', '3,0', '-3,3', '-3,0'],
  6: ['0,-3', '3,-3', '3,0', '0,3', '-3,3', '-3,0'],
  7: ['0,-4', '3,-3', '3,0', '0,4', '-3,4', '-4,2', '-3,-1'],
  8: ['0,-4', '3,-4', '4,-2', '3,1', '0,4', '-3,4', '-4,2', '-3,-1'],
};

/**
 * Hyperlane slots of the three- and four-player maps of Milty Draft (MAP_3, MAP_4), as fixed tiles. Milty writes a lane
 * as a shape (S, C, T) and turns; the shapes are the sides 83A, 85A and 87A, so the same side repeats in several slots.
 */
const MILTY_LANES: Record<number, Record<string, string>> = {
  3: {
    '2,-3': '83A@1', '3,-3': '85A@4', '1,-2': '87A@0', '3,-2': '83A@2', '-2,-1': '83A@0', '-1,-1': '87A@2',
    '1,-1': '85A@4', '2,-1': '87A@4', '-3,0': '85A@2', '-1,0': '85A@2', '-3,1': '83A@2', '-2,1': '87A@4',
    '0,1': '85A@0', '1,1': '87A@2', '-1,2': '87A@0', '1,2': '83A@0', '-1,3': '83A@1', '0,3': '85A@0',
  },
  4: {
    '-2,-1': '83A@0', '-1,-1': '87A@2', '2,-1': '87A@1', '3,-1': '83A@2', '-3,0': '85A@2', '-1,0': '85A@2',
    '1,0': '85A@5', '3,0': '85A@5', '-3,1': '83A@2', '-2,1': '87A@4', '1,1': '87A@5', '2,1': '83A@0',
  },
};

/** Keeps Mecatol Rex always, and the source's hyperlanes only when asked; other fixed tiles are its own choices. */
function buildTemplate(source: SourceTemplate, playerCount: number, keepHyperlanes: boolean, layout: MapLayout): MapTemplate {
  const slots = source.templateTiles.map(({ pos, staticTileId }) => {
    const { q, r } = positionToAxial(pos);
    if (staticTileId === MECATOL_REX) return { q, r, fixed: MECATOL_REX };
    if (!staticTileId || !keepHyperlanes) return { q, r };
    const match = staticTileId.match(/^(\d+[ab])(\d)$/i);
    if (!match) throw new Error(`Cannot read hyperlane "${staticTileId}"`);
    return { q, r, fixed: `${normalizeTileId(match[1].toLowerCase())}@${match[2]}` };
  });
  return { playerCount, layout, homes: MILTY_HOMES[playerCount], slots };
}

/** The full hexagon of the given radius, Mecatol Rex in the center; `lanes` are fixed tiles by slot key. */
function ringTemplate(playerCount: number, rings: number, layout: MapLayout, lanes: Record<string, string> = {}): MapTemplate {
  const slots: MapTemplate['slots'] = [{ q: 0, r: 0, fixed: MECATOL_REX }];
  for (let ring = 1; ring <= rings; ring++) {
    for (let index = 1; index <= ring * 6; index++) {
      const { q, r } = positionToAxial(`${ring}${String(index).padStart(2, '0')}`);
      const fixed = lanes[`${q},${r}`];
      slots.push(fixed ? { q, r, fixed } : { q, r });
    }
  }
  return { playerCount, layout, homes: MILTY_HOMES[playerCount], slots };
}

/** Per pack, the technologies its factions name, their faction technologies too. A pack holds its own copy, so it works without the others. */
function buildTechnologies(all: SourceTech[], factions: Record<PackId, Record<string, FactionDef>>, upgradedBy: Map<string, string>): Record<PackId, Record<string, TechDef>> {
  const known = new Map(all.filter(tech => packOfSource(tech.source)).map(tech => [tech.alias, tech]));
  const result: Record<PackId, Record<string, TechDef>> = { base: {}, pok: {}, te: {} };
  for (const pack of ['base', 'pok', 'te'] as PackId[]) {
    for (const faction of Object.values(factions[pack])) {
      for (const id of [...faction.startingTech, ...(faction.startingTechChoice?.options ?? [])]) {
        const tech = known.get(id);
        if (!tech) throw new Error(`Faction ${faction.id} names unknown technology ${id}`);
        result[pack][id] = readTech(tech);
      }
      for (const { id } of faction.sheet?.techs ?? []) result[pack][id] = readFactionTech(known.get(id)!, upgradedBy);
    }
  }
  return result;
}

function buildTemplates(root: string): Record<PackId, MapTemplate[]> {
  const read = (file: string, alias: string) => {
    const found = readJson<SourceTemplate[]>(root, `data/map_templates/${file}.json`).find(candidate => candidate.alias === alias);
    if (!found) throw new Error(`Layout ${alias} is missing from the source`);
    return found;
  };
  const threeRings = read('standardMiltyLayouts', '6pStandard');
  return {
    base: [
      // 6 blue + 2 red per player, 3 homes and Mecatol Rex: 28 slots. The source's in-person layout has this shape.
      buildTemplate(read('3p', '3pInPersonHyperlanes'), 3, false, 'standard'),
      buildTemplate(threeRings, 4, false, 'standard'),
      // The 5-player deal gives 36 tiles; the speaker adds a red tile next to Mecatol Rex, filling all 37.
      buildTemplate(threeRings, 5, false, 'standard'),
      buildTemplate(threeRings, 6, false, 'standard'),
    ],
    pok: [
      // Three and four players with hyperlanes: Milty's maps, on the 37 slots of three rings.
      ringTemplate(3, 3, 'hyperlanes', MILTY_LANES[3]),
      ringTemplate(4, 3, 'hyperlanes', MILTY_LANES[4]),
      buildTemplate(read('standardMiltyLayouts', '5pHyperlanes'), 5, true, 'hyperlanes'),
      // Standard PoK setups fill four rings. Hyperlane places are only on a rulebook diagram, so they stay manual.
      ringTemplate(7, 4, 'standard'),
      ringTemplate(8, 4, 'standard'),
    ],
    te: [],
  };
}

function buildCards(root: string) {
  const cards = new Map(['pok', 'te', 'obsolete']
    .flatMap(file => readJson<SourceCard[]>(root, `data/strategy_cards/${file}.json`)).map(card => [card.id, card]));
  const sets = readJson<SourceCardSet[]>(root, 'data/strategy_card_sets/strategyCardSets.json');
  const cardsOf = (alias: string) => {
    const set = sets.find(candidate => candidate.alias === alias);
    if (!set) throw new Error(`Strategy card set ${alias} is missing from the source`);
    return set.scIDs.map(id => {
      const card = cards.get(id);
      if (!card) throw new Error(`Strategy card ${id} is missing from the source`);
      return {
        initiative: card.initiative, name: card.name, summaryKey: card.id,
        ...(card.source === 'thunders_edge' ? { changedIn: 'te' as const } : {}),
      };
    }).sort((a, b) => a.initiative - b.initiative);
  };
  return { base_game: cardsOf('base_game'), pok: cardsOf('pok'), te: cardsOf('te') };
}

function assertSchema(pack: DataPack, name: string): void {
  const isCount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  for (const planet of Object.values(pack.planets)) {
    if (!planet.name || !isCount(planet.resources) || !isCount(planet.influence)) throw new Error(`${name}: bad planet ${planet.id}`);
  }
  for (const unit of Object.values(pack.units)) {
    if (!isCount(unit.cost) || !isCount(unit.capacity) || !isCount(unit.capacityUsed)) throw new Error(`${name}: bad unit ${unit.id}`);
  }
  for (const tile of Object.values(pack.tiles)) {
    if (!tile.number || !Array.isArray(tile.planetIds) || !Array.isArray(tile.wormholes)) throw new Error(`${name}: bad tile ${tile.id}`);
  }
  for (const faction of Object.values(pack.factions)) {
    if (!faction.name || !Object.values(faction.startUnits).every(isCount) || !isCount(faction.commodities)) throw new Error(`${name}: bad faction ${faction.id}`);
    if (!Array.isArray(faction.startingTech) || !Array.isArray(faction.abilities)) throw new Error(`${name}: bad faction ${faction.id}`);
    for (const id of [...faction.startingTech, ...(faction.startingTechChoice?.options ?? [])]) {
      if (!pack.technologies[id]) throw new Error(`${name}: faction ${faction.id} names unknown technology ${id}`);
    }
    if (!faction.sheet?.techs.length) throw new Error(`${name}: faction ${faction.id} has no faction technologies`);
    for (const { id } of faction.sheet.techs) {
      if (!pack.technologies[id]) throw new Error(`${name}: faction ${faction.id} names unknown faction technology ${id}`);
    }
  }
  for (const template of pack.templates) {
    const where = `${name}: template of ${template.playerCount} players (${template.layout})`;
    const keys = new Set(template.slots.map(slot => `${slot.q},${slot.r}`));
    if (!keys.has('0,0')) throw new Error(`${where} has no center`);
    if (keys.size !== template.slots.length) throw new Error(`${where} repeats a slot`);
    const homes = template.homes ?? [];
    if (homes.length !== template.playerCount || new Set(homes).size !== homes.length || !homes.every(home => keys.has(home))) {
      throw new Error(`${where} has homes that are not its slots`);
    }
    for (const slot of template.slots) {
      const key = `${slot.q},${slot.r}`;
      if (slot.fixed && homes.includes(key)) throw new Error(`${where} fixes a tile on a home slot`);
      const id = slot.fixed?.split('@')[0];
      if (id && id !== MECATOL_REX && !pack.tiles[id]) throw new Error(`${where} fixes unknown tile ${id}`);
    }
  }
  const text = JSON.stringify(pack);
  if (/https?:|\.(png|jpe?g|webp)\b/i.test(text)) throw new Error(`${name}: pack contains an image or a link`);
}

async function main(): Promise<void> {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const root = await download();
  const systems = readDir<SourceSystem>(root, 'systems');
  const laneText = readFileSync(join(root, 'data/hyperlanes.properties'), 'utf8');
  checkLaneRotations(laneText);
  const tiles = buildTiles(systems, parseHyperlanes(laneText));
  const planets = buildPlanets(readDir<SourcePlanet>(root, 'planets'), tiles);
  const abilitySource = readDir<SourceAbility[]>(root, 'data/abilities').flat();
  const abilityNames = new Map(abilitySource.map(ability => [ability.id, ability.name]));
  const factionSource = readdirSync(join(root, 'data/factions'))
    .flatMap(name => readJson<SourceFaction[]>(root, `data/factions/${name}`));
  const factions = buildFactions(factionSource, tiles, abilityNames);
  const factionIds = Object.values(factions).flatMap(pack => Object.keys(pack));
  const unitSource = SHIP_FILES.flatMap(file => readJson<SourceUnit[]>(root, `data/units/${file}.json`));
  const ships = selectShips(unitSource, factionIds);
  const officialAbilities = new Map(abilitySource.filter(a => packOfSource(a.source)).map(a => [a.id, a]));
  const officialLeaders = new Map(LEADER_FILES.flatMap(file => readJson<SourceLeader[]>(root, `data/leaders/${file}.json`)).map(l => [l.id, l]));
  const unitsById = new Map(unitSource.map(unit => [unit.id, unit]));
  const breakthroughs = readJson<SourceBreakthrough[]>(root, BREAKTHROUGH_FILE);
  const techSource = readDir<SourceTech[]>(root, 'data/technologies').flat();
  const officialTechs = new Map(techSource.filter(tech => packOfSource(tech.source)).map(tech => [tech.alias, tech]));
  const upgradedBy = new Map(unitSource.filter(unit => unit.requiredTechId && unit.baseType && packOfSource(unit.source))
    .map(unit => [unit.requiredTechId!, unit.baseType!]));
  for (const pack of Object.values(factions)) {
    for (const faction of Object.values(pack)) {
      const source = factionSource.find(f => f.alias === faction.id && packOfSource(f.source));
      if (!source) throw new Error(`Faction ${faction.id} has no source entry`);
      const owner = faction.id.startsWith('keleres') ? 'keleres' : faction.id;
      faction.sheet = buildSheet(source, officialAbilities, officialLeaders, unitsById, breakthroughs.find(b => b.faction === owner), officialTechs);
    }
  }
  for (const pack of Object.values(factions)) for (const faction of Object.values(pack)) faction.ships = ships.factions[faction.id];
  const units = buildUnits(root, ships.generic);
  const structures = buildStructures(readJson<SourceUnit[]>(root, 'data/units/baseUnits.json'));
  console.log('Ships excluded:', ships.excluded);
  const technologies = buildTechnologies(techSource, factions, upgradedBy);
  const templates = buildTemplates(root);
  const cards = buildCards(root);

  const physical = (pack: PackId) => new Set(Object.values(tiles[pack])
    .filter(tile => tile.kind !== 'fracture').map(tile => tile.number)).size;
  checkCounts({
    base: physical('base'),
    pok: physical('pok'),
    te: physical('te'),
    teFractureSystems: Object.values(tiles.te).filter(tile => tile.kind === 'fracture').length,
    cardsBaseGame: cards.base_game.length,
    cardsPok: cards.pok.length,
    cardsTe: cards.te.length,
  }, readJson<Record<string, number>>(repoRoot, 'scripts/expected-counts.json'));

  const outDir = join(repoRoot, 'src/data/packs');
  mkdirSync(outDir, { recursive: true });
  for (const name of ['base', 'pok', 'te'] as PackId[]) {
    const pack = {
      version: DATA_VERSION, tiles: tiles[name], planets: planets[name], units: units[name],
      factions: factions[name], templates: templates[name], technologies: technologies[name],
      structures: name === 'base' ? structures : [],
    };
    assertSchema(pack, name);
    writeFileSync(join(outDir, `${name}.json`), `${JSON.stringify(pack, null, 2)}\n`);
  }
  writeFileSync(join(outDir, 'strategyCards.json'), `${JSON.stringify(cards, null, 2)}\n`);
  writeFileSync(join(repoRoot, 'src/data/provenance.json'), `${JSON.stringify({
    source: `https://github.com/${REPO}`,
    commit: COMMIT,
    commitDate: COMMIT_DATE,
    dataVersion: DATA_VERSION,
    license: 'Source code is public domain (Unlicense); that license excludes art. Rights to the game data are not confirmed.',
    keptSources: ['base', 'pok', 'codex*', 'thunders_edge'],
    excludedSystems: EXCLUDED_SYSTEMS,
    excludedPlanets: EXCLUDED_PLANETS,
    notFromSource: { tiles: TE_RULEBOOK_HYPERLANES, leaders: [JOLNAR_OLD_COMMANDER.name], reason: "Thunder's Edge rulebook; absent from the source at this commit" },
    factionTechnologies: {
      fields: 'data/factions factionTech; data/technologies name, types, requirements, source; data/units requiredTechId for what a unit upgrade upgrades. Card text is not read.',
      added: EXTRA_FACTION_TECH.keleresm,
      replaces: { executiveorder: REPLACED_BY_TE.executiveorder },
      reason: "Executive Order is filed under keleres with source thunders_edge but listed on no faction; the Thunder's Edge rulebook gives Keleres two faction technologies and the source names the Keleres breakthrough I.I.H.Q. Modernization, so it is taken to replace that technology (inference, not confirmed by a rulebook line).",
    },
    corrections: { homeTiles: { ...HOME_PLANET_TILE, ...KELERES_HOME_TILE } },
    reinforcements: {
      ...LIMITS_SOURCE,
      units: UNIT_LIMITS,
      structures: STRUCTURE_LIMITS,
      tokenUnits: { figures: TOKEN_UNITS, reason: 'Fighters and infantry are not limited by their figures: tokens stand in for them (LRR 96 note 2.1), so their limit is null.' },
    },
    production: { spacedock: "Production of a space dock is the planet's resources plus the number in its levels: source productionValue, LRR 79.1." },
    verification: 'docs/data-verification.md',
  }, null, 2)}\n`);
  console.log(`Built data ${DATA_VERSION}`);
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
