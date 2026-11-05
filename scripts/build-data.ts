// Builds src/data/packs/*.json and src/data/provenance.json from a fixed commit of the source.
// Downloads go to a temp directory outside the repo and are only ever parsed as data.
// What each exclusion and correction rests on is recorded in docs/data-verification.md.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Anomaly, DataPack, FactionDef, MapLayout, MapTemplate, PlanetDef, TileDef, UnitCounts, UnitDef, UnitId } from '../src/domain/types';

const REPO = 'AsyncTI4/TI4_map_generator_bot';
const COMMIT = '9eee64a3b13fc698b3ee174590dde40e005c0dfe';
const COMMIT_DATE = '2026-11-05';
const RESOURCES = 'src/main/resources/';
const DATA_VERSION = `${COMMIT_DATE}-${COMMIT.slice(0, 7)}`;
const WANTED = /^(planets|systems)\/[^/]+\.json$|^data\/(units|factions|map_templates|strategy_card_sets|strategy_cards)\/[^/]+\.json$|^data\/hyperlanes\.properties$/;

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

/** Edge pairs of a tile turned `steps` times by 60 degrees clockwise: every edge number moves up by `steps`. */
export function rotateLanes(lanes: [number, number][], steps: number): [number, number][] {
  return lanes
    .map(([a, b]) => [(a + steps) % 6, (b + steps) % 6].sort((x, y) => x - y) as [number, number])
    .sort((x, y) => x[0] - y[0] || x[1] - y[1]);
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
  isHyperlane?: boolean; isFracture?: boolean; [flag: string]: unknown;
}
interface SourcePlanet { id: string; name: string; resources: number; influence: number; source: string; }
interface SourceUnit {
  id: string; source: string; cost?: number; capacityValue?: number; capacityUsed?: number; isGroundForce?: boolean;
}
interface SourceFaction { alias: string; factionName: string; homeSystem: string; startingFleet: string; source: string; }
interface SourceTemplate { alias: string; playerCount: number; templateTiles: { pos: string; staticTileId?: string }[]; }
interface SourceCard { id: string; initiative: number; name: string; source: string; }
interface SourceCardSet { alias: string; scIDs: string[]; }

async function download(): Promise<string> {
  const root = join(tmpdir(), `ti4-source-${COMMIT}`);
  const listPath = join(root, 'files.json');
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

function buildPlanets(all: SourcePlanet[], tiles: Record<PackId, Record<string, TileDef>>): Record<PackId, Record<string, PlanetDef>> {
  const planets: Record<PackId, Record<string, PlanetDef>> = { base: {}, pok: {}, te: {} };
  const byId = new Map(all.map(planet => [planet.id, planet]));
  const place = (pack: PackId, id: string) => {
    const planet = byId.get(id);
    if (!planet) throw new Error(`Unknown planet ${id}`);
    if (packOfSource(planet.source) !== pack) throw new Error(`Planet ${id} of source ${planet.source} is not in pack ${pack}`);
    if (id in EXCLUDED_PLANETS) throw new Error(`Excluded planet ${id} is in use`);
    planets[pack][id] = { id, name: planet.name, resources: planet.resources, influence: planet.influence };
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

function buildUnits(root: string): Record<PackId, Partial<Record<UnitId, UnitDef>>> {
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
    return {
      id, name: UNIT_NAMES[id], cost: unit.cost, capacity: unit.capacityValue ?? 0, capacityUsed,
      ground: unit.isGroundForce === true, fighter: id === 'fighter',
    };
  };
  const base = ['carrier', 'cruiser', 'destroyer', 'dreadnought', 'warsun', 'flagship', 'fighter', 'infantry'] as UnitId[];
  return { base: Object.fromEntries(base.map(id => [id, make(id)])), pok: { mech: make('mech') }, te: {} };
}

function buildFactions(all: SourceFaction[], tiles: Record<PackId, Record<string, TileDef>>): Record<PackId, Record<string, FactionDef>> {
  const factions: Record<PackId, Record<string, FactionDef>> = { base: {}, pok: {}, te: {} };
  for (const faction of all) {
    const pack = packOfSource(faction.source);
    if (!pack || !faction.homeSystem) continue; // the source's "neutral" pseudo-faction has no home
    const id = faction.alias;
    const homeTile = KELERES_HOME_TILE[id] ?? HOME_PLANET_TILE[id] ?? normalizeTileId(faction.homeSystem);
    const known = tiles.base[homeTile] ?? tiles[pack][homeTile];
    if (!known) throw new Error(`Faction ${id} has unknown home tile ${homeTile}`);
    if (known.planetIds.length === 0) throw new Error(`Home tile ${homeTile} of ${id} has no planets`);
    factions[pack][id] = { id, name: faction.factionName, homeTile, startUnits: parseStartingFleet(faction.startingFleet) };
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
    if (!faction.name || !Object.values(faction.startUnits).every(isCount)) throw new Error(`${name}: bad faction ${faction.id}`);
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
  const units = buildUnits(root);
  const factions = buildFactions(readdirSync(join(root, 'data/factions'))
    .flatMap(name => readJson<SourceFaction[]>(root, `data/factions/${name}`)), tiles);
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
      factions: factions[name], templates: templates[name],
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
    notFromSource: { tiles: TE_RULEBOOK_HYPERLANES, reason: "Thunder's Edge rulebook; absent from the source at this commit" },
    corrections: { homeTiles: { ...HOME_PLANET_TILE, ...KELERES_HOME_TILE } },
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
