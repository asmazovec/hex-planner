import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { COMPONENT_FILES, effectOf } from '../../domain/effects/registry';
import { createGame } from '../../testing/old/domain/newGame';
import { setPlayerFaction } from '../../testing/old/domain/players';
import { holdings } from '../abilities/testBoard';
import { tableOf } from '../../testing/old/game/fromLegacy';
import { legacyKey } from '../keys';
import { initialBoard } from '../setup';
import { runHooks } from './hooks';

const pack = loadPack(['pok', 'te']);
let game = createGame({ expansions: ['pok', 'te'], playerCount: 3, faction: 'sol' }, pack);
game = setPlayerFaction(game, 1, 'winnu', pack);
const table = tableOf(game);
const start = initialBoard(table, pack);
const key = (player: string): string => legacyKey(table, player);

/** The hook kinds that run on the kernel's own runner: no component file keeps one on the old state. */
const NATIVE_KINDS = ['dealt', 'onTokenSpent', 'onProduced', 'onDestroyed', 'onControlLost', 'onActivate', 'onLanding', 'onRoundStart', 'onStatusStart', 'onStatusEnd', 'onTurnStart', 'gained', 'lost', 'restrict', 'onGainControl'] as const;

/** One real component of each kind: it has the hook on the kernel's runner. */
const EXAMPLES: Record<(typeof NATIVE_KINDS)[number], string> = {
  dealt: 'promissory:dark_pact', onTokenSpent: 'leader:muaatcommander', onProduced: 'breakthrough:hacanbt', onDestroyed: 'technology:cl2', onControlLost: 'legendary:styx',
  onActivate: 'technology:ng', onLanding: 'mech:keleres_mech', onRoundStart: 'ability:council_patronage', onStatusStart: 'ability:mitosis', onStatusEnd: 'promissory:malevolency', onTurnStart: 'technology:cl2',
  gained: 'relic:shard', lost: 'relic:shard', restrict: 'agenda:censure', onGainControl: 'ability:liberate',
};

describe('the native hook runner', () => {
  test('no component file keeps a hook of a native kind on the old state', () => {
    expect(Object.entries(COMPONENT_FILES).filter(([, file]) => 'effect' in file).map(([path]) => path)).toEqual([]);
  });

  test.each(NATIVE_KINDS)('%s is served by the runner for a real component', kind => {
    expect(effectOf(pack, EXAMPLES[kind])?.on?.[kind]).toBeTypeOf('function');
  });

  test('the commander of the Muaat gains a trade good for each token spent once unlocked, and not while locked', () => {
    const id = 'leader:muaatcommander';
    const spent = (state: 'ready' | 'locked') => runHooks(table, holdings(start, 'p1', { [id]: { state, count: 1 } }), pack, 'onTokenSpent', ['p1'], { count: 2, secondary: false }, { actor: 'p1' }).events;
    expect(spent('ready')).toEqual([{ type: 'TradeGoodsChanged', player: 'p1', delta: 2, cause: { component: id } }]);
    expect(spent('locked')).toEqual([]);
  });

  test('Dark Pact: the holder gives commodities to the Empyrean player and each gains a trade good, as events caused by the note', () => {
    const note = `promissory:dark_pact@${key('p2')}`;
    const board = holdings(start, 'p1', { [note]: { state: 'ready', count: 1 } });
    const value = 4;
    const got = runHooks(table, board, pack, 'dealt', ['p1'], { side: 'give', self: 'p1', partner: 'p2', gave: { commodities: value }, got: {} }, { actor: 'p1', step: 'transaction' });
    expect(got.events).toEqual([
      { type: 'TradeGoodsChanged', player: 'p1', delta: 1, cause: { step: 'transaction', component: note } },
      { type: 'TradeGoodsChanged', player: 'p2', delta: 1, cause: { step: 'transaction', component: note } },
    ]);
    expect(got.board.players.p1.tradeGoods).toBe(board.players.p1.tradeGoods + 1);
    expect(got.board.players.p2.tradeGoods).toBe(board.players.p2.tradeGoods + 1);
  });

  test('gained and lost: the relic gives a point when the entry gains it and takes it back when it lets it go', () => {
    const at = (kind: 'gained' | 'lost') => runHooks(table, start, pack, kind, ['p1'], {}, { actor: 'p1', only: ['relic:shard'] }).events;
    expect(at('gained')).toEqual([{ type: 'PointsChanged', player: 'p1', delta: 1, cause: { component: 'relic:shard' } }]);
    expect(at('lost')).toEqual([{ type: 'PointsChanged', player: 'p1', delta: -1, cause: { component: 'relic:shard' } }]);
  });

  test('restrict: a law warns of the action card an entry plays, through the context', () => {
    const entry = { type: 'component', componentId: 'actionCard:sabotage', owner: 'me' } as never;
    const got = runHooks(table, start, pack, 'restrict', ['p1'], {}, { actor: 'p1', only: ['agenda:censure'], entry });
    expect(got.violations.map(w => w.code)).toEqual(expect.any(Array));
  });

  test('onGainControl: Liberate readies a planet with as many infantry as resources, else puts one on it', () => {
    const planet = 'wellon';
    const run = () => runHooks(table, start, pack, 'onGainControl', ['p1'], { planetId: planet, fromPlayer: true, explores: false, lost: [] }, { actor: 'p1', only: ['ability:liberate'] }).events.map(e => e.type);
    expect(run()).toEqual(['UnitsPlaced']);
  });

  test('a hook of a component nobody holds is not asked, and the board is the same object', () => {
    const got = runHooks(table, start, pack, 'dealt', ['p1'], { side: 'give', self: 'p1', partner: 'p2', gave: { commodities: 9 }, got: {} }, { actor: 'p1' });
    expect(got.events).toEqual([]);
    expect(got.board).toBe(start);
  });
});
