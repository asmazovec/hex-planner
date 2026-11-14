/** The kernel's own rules of structure: what it imports, who may change a board, and that every event is handled. */
import { describe, expect, test } from 'vitest';
import { apply } from './apply';
import { bareBoard } from './testTable';
import type { EventType, GameEvent } from './events';

const raw = import.meta.glob<string>('./*.ts', { query: '?raw', import: 'default', eager: true });
const files = Object.entries(raw).map(([path, text]) => ({ file: path.slice(2), text }));
const sources = files.filter(f => !f.file.endsWith('.test.ts'));
const importsOf = (text: string): string[] => [...text.matchAll(/from '([^']+)'/g)].map(m => m[1]);

describe('imports', () => {
  test('the kernel imports nothing from the interface, the stores or React', () => {
    for (const { file, text } of files) {
      for (const path of importsOf(text)) {
        expect(path, `${file} imports ${path}`).not.toMatch(/^(\.\.\/)+(ui|state|storage)(\/|$)|^react/);
      }
    }
  });
});

describe('a board is changed in one place', () => {
  test('only apply.ts imports the helpers that change one', () => {
    for (const { file, text } of sources) {
      if (file === 'apply.ts') continue;
      expect(importsOf(text).filter(p => /(^|\/)draft$/.test(p)), `${file} imports draft`).toEqual([]);
    }
  });

  test('the production code outside apply.ts does not write into a board or its parts', () => {
    // `board.x =`, `players[..].y =`, `.push(` on a board path: the kernel builds new objects and never assigns.
    const writes = /\b(board|next|state)\.[A-Za-z.[\]'"]+\s*(=[^=>]|\+=|-=)|\b(board|next)\.[A-Za-z.]+\.(push|splice|pop|shift|unshift|sort)\(/;
    for (const { file, text } of sources) {
      if (file === 'draft.ts' || file === 'apply.ts') continue;
      expect(text, file).not.toMatch(writes);
    }
  });
});

describe('every event is handled', () => {
  // One of each event of the union; the type makes this list complete (a missing key is a compile error) and `apply` handles each.
  const SAMPLES: { [T in EventType]: Extract<GameEvent, { type: T }> } = {
    RoundStarted: { type: 'RoundStarted', round: 2 },
    PhaseStarted: { type: 'PhaseStarted', phase: 'action' },
    TurnStarted: { type: 'TurnStarted', player: 'p1' },
    TurnEnded: { type: 'TurnEnded', player: 'p1' },
    Passed: { type: 'Passed', player: 'p1' },
    UnitsPlaced: { type: 'UnitsPlaced', player: 'p1', at: { slot: 's' }, units: { carrier: 1 } },
    UnitsRemoved: { type: 'UnitsRemoved', player: 'p1', at: { slot: 's' }, units: { carrier: 1 } },
    UnitsMoved: { type: 'UnitsMoved', player: 'p1', from: { slot: 's' }, to: { slot: 't' }, units: { carrier: 1 } },
    StructurePlaced: { type: 'StructurePlaced', player: 'p1', at: { slot: 's' }, structures: { pds: 1 } },
    StructureRemoved: { type: 'StructureRemoved', player: 'p1', at: { slot: 's' }, structures: { pds: 1 } },
    StructureMoved: { type: 'StructureMoved', player: 'p1', from: { slot: 's' }, to: { slot: 't' }, structures: { pds: 1 } },
    PlanetGained: { type: 'PlanetGained', player: 'p1', planet: 'x' },
    PlanetLost: { type: 'PlanetLost', planet: 'x' },
    PlanetExhausted: { type: 'PlanetExhausted', player: 'p1', planet: 'x' },
    PlanetReadied: { type: 'PlanetReadied', player: 'p1', planet: 'x' },
    CardAttached: { type: 'CardAttached', planet: 'x', card: 'c' },
    SystemActivated: { type: 'SystemActivated', player: 'p1', system: 's' },
    TokensChanged: { type: 'TokensChanged', player: 'p1', delta: { tactic: 1 } },
    TokenReturned: { type: 'TokenReturned', player: 'p1' },
    TradeGoodsChanged: { type: 'TradeGoodsChanged', player: 'p1', delta: 1 },
    CommoditiesChanged: { type: 'CommoditiesChanged', player: 'p1', delta: 1 },
    GoodsTransferred: { type: 'GoodsTransferred', from: 'p1', to: 'p2', tradeGoods: 1 },
    CardGained: { type: 'CardGained', player: 'p1', card: 'c' },
    CardLost: { type: 'CardLost', player: 'p1', card: 'c' },
    CardExhausted: { type: 'CardExhausted', player: 'p1', card: 'c' },
    CardReadied: { type: 'CardReadied', player: 'p1', card: 'c' },
    CardUnlocked: { type: 'CardUnlocked', player: 'p1', card: 'c' },
    CardLaidInPlay: { type: 'CardLaidInPlay', player: 'p1', card: 'c' },
    CardTakenBack: { type: 'CardTakenBack', player: 'p1', card: 'c' },
    CardPurged: { type: 'CardPurged', player: 'p1', card: 'c' },
    TechnologyResearched: { type: 'TechnologyResearched', player: 'p1', technology: 't' },
    ObjectiveRevealed: { type: 'ObjectiveRevealed', objective: 'o' },
    ObjectiveScored: { type: 'ObjectiveScored', player: 'p1', objective: 'o' },
    PointsChanged: { type: 'PointsChanged', player: 'p1', delta: 1 },
    LawEnacted: { type: 'LawEnacted', law: 'l' },
    LawDiscarded: { type: 'LawDiscarded', law: 'l' },
    SpeakerChanged: { type: 'SpeakerChanged', player: 'p2' },
    StrategyCardPicked: { type: 'StrategyCardPicked', player: 'p1', card: 1 },
    StrategyCardPlayed: { type: 'StrategyCardPlayed', player: 'p1', card: 1 },
    CustodiansRemoved: { type: 'CustodiansRemoved', player: 'p1' },
    ExpeditionSliceTaken: { type: 'ExpeditionSliceTaken', player: 'p1', slice: 'a' },
    FractureOpened: { type: 'FractureOpened', tiles: {} },
    WormholeTokenPlaced: { type: 'WormholeTokenPlaced', system: 's', wormhole: 'alpha' },
    WormholeTokenMoved: { type: 'WormholeTokenMoved', from: 's', to: 't', wormhole: 'alpha' },
    ThundersEdgeSlotSet: { type: 'ThundersEdgeSlotSet', system: 's' },
    AnomalyTokenPlaced: { type: 'AnomalyTokenPlaced', system: 's', anomaly: 'scar' },
    CardLoaded: { type: 'CardLoaded', player: 'p1', card: 'c', units: { mech: 1 } },
    CardUnloaded: { type: 'CardUnloaded', player: 'p1', card: 'c', units: { mech: 1 } },
  };

  test.each(Object.keys(SAMPLES) as EventType[])('%s changes the board or reports why not', type => {
    const board = bareBoard();
    const next = apply(board, SAMPLES[type]);
    expect(next).toBeDefined();
    expect(JSON.parse(JSON.stringify(next))).toEqual(next);
  });

  test('apply.ts ends its switch with a never check', () => {
    const text = sources.find(s => s.file === 'apply.ts')!.text;
    expect(text).toMatch(/const never: never = event/);
  });
});

describe('abilities', () => {
  const abilityFiles = import.meta.glob<string>(['../domain/effects/components/*/*.ts', '!../domain/effects/components/*/*.test.ts'], { query: '?raw', import: 'default', eager: true });
  const native = Object.entries(abilityFiles).filter(([, text]) => /export const ability: Ability\b/.test(text));
  const old = /\b(GameState|Holdings|Entry|Game|EffectTurn|WaiverContext)\b/;

  test('a component written for the kernel declares whose action it speaks in and imports nothing of the old state', () => {
    expect(native.length).toBeGreaterThan(300);
    for (const [path, text] of native) {
      expect(text, `${path} declares a holder`).toMatch(/holder: '(self|others|anyone)'/);
      const imported = [...text.matchAll(/import (?:type )?\{([^}]*)\} from/g)].flatMap(m => m[1].split(',').map(s => s.trim()));
      expect(imported.filter(name => old.test(name)), `${path} imports the old state`).toEqual([]);
    }
  });

  test('the native registry builds nothing of the old per-player state', () => {
    const text = (import.meta.glob<string>('./abilities/registry.ts', { query: '?raw', import: 'default', eager: true }))['./abilities/registry.ts'];
    expect(text).not.toMatch(/legacyViews\b|viewFor|legacyState|checkView/);
  });

  /** The files that read the board alone: the steps and queries moved off the old per-player views, one by one. */
  const BOARD_ONLY = ['./resolve/transport.ts', './resolve/production.ts', './resolve/others.ts', './resolve/waive.ts', './resolve/research.ts', './resolve/tail.ts', './resolve/cards/technology.ts', './resolve/combat.ts', './resolve/invasion.ts', './resolve/acts.ts', './resolve/holdings.ts', './resolve/cards/play.ts', './resolve/cards/trade.ts', './resolve/status.ts'];
  test('the files moved to the board build none of the old per-player views', () => {
    const files = import.meta.glob<string>(['./queries.ts', './resolve/**/*.ts'], { query: '?raw', import: 'default', eager: true });
    for (const name of BOARD_ONLY) {
      expect(files[name], `${name} is missing`).toBeDefined();
      expect(files[name], `${name} reads the old views`).not.toMatch(/legacyViews|viewFor|legacyState|checkView|fromLegacy/);
    }
  });
});
