import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { createGame } from '../../testing/old/domain/newGame';
import { withChoices } from '../../domain/effects/choices';
import { stateBeforeEntry } from '../../testing/old/domain/project';
import { repaid } from '../../testing/old/domain/strategy';
import type { Entry, Game } from '../../testing/old/domain/types';
import { factsOf } from '../turnFacts';
import { turnOf } from '../../testing/old/game/fromLegacy';
import { timelineOf } from '../../testing/projection';
import * as now from './turn';

const pack = loadPack(['pok']);
const nothing = { planets: [], tradeGoods: 0 };
const bodies: Record<string, unknown>[] = [
  { id: 'comp', phase: 'action', status: 'planned', type: 'component', note: 'n', componentId: 'cmp', choices: { a: 1 }, payment: nothing, uses: ['x', 'y'], useChoices: { x: { k: 'v' } }, gains: ['g'] },
  { id: 'str', phase: 'action', status: 'planned', type: 'strategic', card: 4, effects: { production: { systemId: '20', units: { infantry: 2, cruiser: 1 } }, payment: nothing }, uses: ['x'] },
  { id: 'pass', phase: 'action', status: 'planned', type: 'pass' },
  { id: 'tac', phase: 'action', status: 'planned', type: 'tactical', systemId: null, moves: [], landings: [], production: {}, payment: nothing, uses: ['x'] },
  { id: 'adj', phase: 'action', status: 'planned', type: 'adjustment', label: 'l', delta: { vp: 1 } },
  { id: 'agenda', phase: 'agenda', status: 'planned', type: 'adjustment', label: '', delta: {}, gains: ['law', 'g'], choices: { outcome: 'for' } },
  { id: 'status', phase: 'status', status: 'planned', type: 'statusTokens', tactic: 1, fleet: 1, strategy: 0, vp: 1, scored: ['s'], spend: { tactic: 1 } },
];
const game: Game = createGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, pack);
game.plans[0].rounds = [{ number: 1, strategyCard: null, backupCard: null, entries: bodies as unknown as Entry[] }];
const { kernel } = timelineOf(game, game.plans[0], 'forecast', pack);
const { table } = kernel;
const entryOf = (id: string): Entry => game.plans[0].rounds[0].entries.find(e => e.id === id)!;
const turnOfId = (id: string) => turnOf(table, entryOf(id), pack);
const board = (id: string) => kernel.byTurn.get(id)!.before;
const plain = (e: unknown) => JSON.parse(JSON.stringify(e, (key, value) => (key === 'acts' && Array.isArray(value) && value.length === 0 ? undefined : value)));
/** The old entry with the patch the screen wrote, against the entry of the edited turn. */
const same = (id: string, next: ReturnType<typeof turnOfId>, patch: Record<string, unknown>) => {
  const merged: Record<string, unknown> = { ...entryOf(id), ...patch };
  for (const key of Object.keys(merged)) if (merged[key] === undefined) delete merged[key];
  expect(plain(factsOf(table, next))).toEqual(plain(merged));
};

describe('the edits of component actions, passes and what every turn holds, against what the screens wrote', () => {
  test('note, component, payment, effects', () => {
    same('comp', now.withNote(turnOfId('comp'), 'z'), { note: 'z' });
    same('comp', now.withPlayed(turnOfId('comp'), 'relic:x'), { componentId: 'relic:x', choices: undefined });
    same('comp', now.withPlayed(turnOfId('comp'), undefined), { componentId: undefined, choices: undefined });
    same('comp', now.withPlayPayment(turnOfId('comp'), { planets: ['p'], tradeGoods: 1 }), { payment: { planets: ['p'], tradeGoods: 1 } });
    same('comp', now.withPlayEffects(turnOfId('comp'), { systemId: '20' }), { effects: { systemId: '20' } });
    same('comp', now.withPlayEffects(turnOfId('comp'), undefined), { effects: undefined });
  });
  test('gains, spends, uses with their choices', () => {
    same('comp', now.withListed(turnOfId('comp'), 'gains', ['g', 'h']), { gains: ['g', 'h'] });
    same('comp', now.withListed(turnOfId('comp'), 'gains', []), { gains: undefined });
    same('comp', now.withListed(turnOfId('comp'), 'spends', ['q']), { spends: ['q'] });
    same('comp', now.withUses(turnOfId('comp'), ['y']), { uses: ['y'], useChoices: undefined });
    same('comp', now.withUses(turnOfId('comp'), ['x', 'z']), { uses: ['x', 'z'] });
    same('tac', now.withUses(turnOfId('tac'), []), { uses: undefined });
  });
  test('choices: of the played component and of a used one', () => {
    for (const [id, component, chosen] of [['comp', 'cmp', { b: 2 }], ['comp', 'x', { k: 'w' }], ['comp', 'y', { k: 'w' }], ['comp', 'x', {}], ['tac', 'x', { k: 1 }], ['comp', 'cmp', {}]] as const) {
      same(id, now.withChoicesOf(turnOfId(id), component, chosen), withChoices(entryOf(id), component, chosen));
    }
    expect(now.choicesOfTurn(turnOfId('comp'), 'x')).toEqual({ k: 'v' });
    expect(now.choicesOfTurn(turnOfId('comp'), 'cmp')).toEqual({ a: 1 });
  });
  test('a change of what a component action uses is repriced as before', () => {
    const turn = turnOfId('comp');
    const next = now.withUses(turn, ['x']);
    const before = stateBeforeEntry(game, game.plans[0], 'comp', pack);
    for (const manual of [false, true]) {
      const patch = repaid(entryOf('comp'), { uses: ['x'] }, before, game, pack, manual);
      same('comp', now.withUsesRepriced(table, board('comp'), pack, turn, next, manual), patch);
    }
    for (const id of ['tac', 'str']) {
      const was = turnOfId(id);
      const before = stateBeforeEntry(game, game.plans[0], id, pack);
      for (const manual of [false, true]) {
        const patch = repaid(entryOf(id), { uses: ['x', 'y'] }, before, game, pack, manual);
        same(id, now.withUsesRepriced(table, board(id), pack, was, now.withUses(was, ['x', 'y']), manual), patch);
      }
    }
  });
  test('acts', () => {
    const turn = turnOfId('pass');
    const added = now.withNewAct(turn, 'transaction', table.viewer);
    expect(added.acts).toHaveLength(1);
    expect(now.withNewAct(added, 'expedition', undefined).acts[1]).toEqual({ kind: 'expedition', slice: null, payment: nothing });
    expect(now.withoutAct(added, 0).acts).toEqual([]);
    expect(now.withAct(added, 0, { kind: 'transaction', with: table.viewer, give: { tradeGoods: 1 }, get: {} }).acts[0]).toMatchObject({ give: { tradeGoods: 1 } });
    same('pass', now.withNewAct(turn, 'expedition', undefined), { acts: [{ kind: 'expedition', sliceId: null, payment: nothing }] });
  });
  test('a correction and an agenda', () => {
    same('adj', now.withLabel(turnOfId('adj'), 'm'), { label: 'm' });
    same('adj', now.withDelta(turnOfId('adj'), { vp: 2, tactic: 1 }), { delta: { vp: 2, tactic: 1 } });
    same('agenda', now.withAgendaChoices(turnOfId('agenda'), { outcome: 'against' }), { choices: { outcome: 'against' } });
    same('agenda', now.withAgendaChoices(turnOfId('agenda'), undefined), { choices: undefined });
    same('agenda', now.withListed(turnOfId('agenda'), 'gains', ['g']), { gains: ['g'] });
  });
  test('the status phase', () => {
    same('status', now.withStatusTokens(turnOfId('status'), { tactic: 2, fleet: 0, strategy: 0 }), { tactic: 2, fleet: 0, strategy: 0 });
    same('status', now.withRoundPoints(turnOfId('status'), table.viewer, 3), { vp: 3 });
    const other = table.players.find(p => p.id !== table.viewer)!;
    same('status', now.withRoundPoints(turnOfId('status'), other.id, 2), { opponentVp: { [other.legacyId!]: 2 } });
    same('status', now.withScored(turnOfId('status'), ['s', 't']), { scored: ['s', 't'] });
    same('status', now.withScored(turnOfId('status'), []), { scored: undefined });
    same('status', now.withSpend(turnOfId('status'), undefined), { spend: undefined });
    same('status', now.withSpend(turnOfId('status'), { fleet: 1 }), { spend: { fleet: 1 } });
  });
});
