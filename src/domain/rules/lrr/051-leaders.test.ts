/** LRR 51 Leaders. Source: tirules2 rules-reference/leaders.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { factionSheet } from '../../factionSheet';
import { createGame } from '../../newGame';
import { setPlayerFaction } from '../../players';
import type { Entry, ExpansionId } from '../../types';
import { codesOf, forecast, rulesGame, statusTokens } from '../kit';

const pok = loadPack(['pok']);
const packs: ExpansionId[][] = [['pok'], ['pok', 'te']];
const typesOf = (faction: string, expansions: ExpansionId[]) =>
  factionSheet(loadPack(expansions).factions[faction], expansions).leaders.map(l => l.type);

describe('LRR 51 Leaders', () => {
  test('51.1: every faction except the Nomad has one agent, one commander and one hero', () => {
    for (const expansions of packs) {
      const pack = loadPack(expansions);
      for (const faction of Object.values(pack.factions)) {
        if (!faction.sheet || faction.id === 'nomad') continue;
        const types = factionSheet(faction, expansions).leaders.map(l => l.type);
        expect([faction.id, ...types]).toEqual([faction.id, 'agent', 'commander', 'hero']);
      }
    }
  });

  test('51.1: a Thunder\'s Edge leader that replaces one leaves still exactly one of its type', () => {
    expect(typesOf('jolnar', ['pok', 'te'])).toEqual(['agent', 'commander', 'hero']);
  });

  test('51.1.1: the Nomad have two more agents, five leaders in all', () => {
    expect(typesOf('nomad', ['pok'])).toEqual(['agent', 'agent', 'agent', 'commander', 'hero']);
  });

  test('51.2: the leaders are on the sheet only with Prophecy of Kings, even with Thunder\'s Edge', () => {
    expect(typesOf('arborec', ['te'])).toEqual([]);
  });

  test.todo('51.2.1: each leader goes in the slot of its type, hash marks up — not modelled: leader sides are not tracked');
  test.todo('51.2.2: the two extra Nomad agents go in the play area readied — not modelled: leader state is not tracked');
  test.todo('51.3: agents — heading only');
  test('51.4: an agent needs no unlocking and begins the game readied: a game begins with the agents of every player unlocked', () => {
    const game = setPlayerFaction(createGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pok), 1, 'nomad', pok);
    expect(game.start.me.leaders).toEqual({ 'leader:solagent': 'unlocked' });
    expect(Object.values(game.start.opponents[game.opponents[0].id].leaders ?? {})).toEqual(['unlocked', 'unlocked', 'unlocked']);
    const use: Entry = { id: 'a', phase: 'action', status: 'planned', type: 'component', note: '', componentId: 'leader:solagent' };
    expect(codesOf({ ...game, plans: [{ ...game.plans[0], rounds: [{ ...game.plans[0].rounds[0], entries: [use] }] }] }, pok, use)).toEqual([]);
  });
  test('51.4: a faction left takes its leaders with it, and without Prophecy of Kings there is no agent to begin with', () => {
    const game = createGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pok);
    expect(setPlayerFaction(game, 0, 'hacan', pok).start.me.leaders).toEqual({ 'leader:hacanagent': 'unlocked' });
    const base = loadPack([]);
    expect(createGame({ expansions: [], playerCount: 6, faction: 'sol' }, base).start.me.leaders).toBeUndefined();
  });
  test('51.4: an agent exhausts on use, warns when used again the same round, and readies in the status phase', () => {
    const use = (id: string): Entry => ({ id, phase: 'action', status: 'planned', type: 'component', note: '', componentId: 'leader:solagent' });
    const start = { me: { leaders: { 'leader:solagent': 'unlocked' as const } }, opponents: {} };
    const [first, again] = [use('a'), use('b')];
    const game = rulesGame({ entries: [first, again], game: { start } });
    expect(forecast(game, pok).state.holdings.leaders).toEqual({ 'leader:solagent': 'exhausted' });
    expect(codesOf(game, pok, again)).toEqual(['componentExhausted']);
    const next = use('c');
    expect(codesOf(rulesGame({ rounds: [[first, statusTokens(1, 1, 0)], [next]], game: { start } }), pok, next)).toEqual([]);
  });
  test.todo('51.5: commanders — heading only');
  test.todo('51.6: a commander must be unlocked by its condition — not modelled: unlocks are not tracked');
  test.todo('51.6.1: every commander has its own unlock condition — not modelled: unlocks are not tracked');
  test.todo('51.6.2: a commander whose condition is met flips to its unlocked side — not modelled: unlocks are not tracked');
  test.todo('51.6.3: unlock conditions are not checked in the middle of resolving an effect — not modelled: unlocks are not tracked');
  test.todo('51.6.4: an unlocked commander never flips back — not modelled: unlocks are not tracked');
  test.todo('51.7: a commander cannot be exhausted — not modelled: leader state is not tracked');
  test.todo('51.8: the Alliance note shares a commander\'s ability — not modelled: promissory notes are not tracked');
  test.todo('51.8.1: the owner keeps using a commander shared by Alliance — not modelled: promissory notes are not tracked');
  test.todo('51.9: heroes — heading only');
  test('51.10: a hero must be unlocked to be used: a locked one is a componentNotHeld', () => {
    const use: Entry = { id: 'h', phase: 'action', status: 'planned', type: 'component', note: '', componentId: 'leader:solhero' };
    expect(codesOf(rulesGame({ entries: [use] }), pok, use)).toEqual(['componentNotHeld']);
  });
  test.todo('51.10.1: a hero unlocks with three scored objectives of any kind — not modelled: objectives are not tracked');
  test.todo('51.10.2: victory points do not count toward a hero\'s unlock — not modelled: objectives are not tracked');
  test.todo('51.10.3: a hero whose condition is met flips to its unlocked side — not modelled: unlocks are not tracked');
  test.todo('51.10.4: an unlocked hero never flips back — not modelled: unlocks are not tracked');
  test.todo('51.11: a hero cannot be exhausted — not modelled: leader state is not tracked');
  test('51.12: a hero is purged once its ability is resolved', () => {
    const use: Entry = { id: 'h', phase: 'action', status: 'planned', type: 'component', note: '', componentId: 'leader:solhero' };
    const game = rulesGame({ entries: [use], game: { start: { me: { leaders: { 'leader:solhero': 'unlocked' } }, opponents: {} } } });
    expect(codesOf(game, pok, use)).toEqual([]);
    expect(forecast(game, pok).state.holdings.leaders).toEqual({ 'leader:solhero': 'purged' });
  });
  test.todo('51.12.1: the Titans hero attaches to Elysium instead of being purged — not modelled: leader state is not tracked');
  test.todo('51 note 1: a commander does not apply to the effect that unlocked it — not modelled: unlocks are not tracked');
  test.todo('51 note 2: a commander may unlock between two abilities of one timing window — not modelled: unlocks are not tracked');
  test.todo('51 note 3: notes on single leaders are on the faction pages — not modelled: leader abilities are shown, not applied');
});
