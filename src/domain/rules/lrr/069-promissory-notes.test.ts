/** LRR 69 Promissory Notes. Source: tirules2 rules-reference/promissory-notes.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { createGame } from '../../newGame';
import type { Act, Entry, Goods, Opponent } from '../../types';
import { FACTION, NEAR, codesOf, forecast, rulesGame, rulesPack, tactical } from '../kit';

const pack = rulesPack();
const RIVAL: Opponent = { id: 'o1', faction: FACTION, vp: 0, seat: 2, color: 2 };
const A = 'promissory:war_funding';
const B = 'promissory:ragh';
const deal = (give: Goods, get: Goods = {}): Act => ({ kind: 'transaction', with: 'o1', give, get });
/** Me and the rival with a ship in one system: neighbours (60). */
const table = (mine: Entry, me: string[], theirs: string[] = []) => rulesGame({
  units: { [NEAR]: { carrier: 1 } },
  entries: [mine],
  game: { opponents: [RIVAL], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } }, start: { me: { promissory: me }, opponents: { o1: { promissory: theirs } } } },
});

let played = 0;
/** A component action that plays a note; `owner` is the rival whose turn it is. */
const play = (componentId: string, owner?: string): Entry =>
  ({ id: `play-${(played += 1)}`, phase: 'action', status: 'planned', type: 'component', componentId, note: '', ...(owner ? { owner } : {}) } as Entry);
/** The generic notes are addressed to the player whose colour they are: `@me` or `@<opponent id>`. */
const MY_TRADE = 'promissory:<color>_ta@me';
const THEIR_TRADE = 'promissory:<color>_ta@o1';
const THEIR_CEASEFIRE = 'promissory:<color>_cf@o1';
const THEIR_SUPPORT = 'promissory:<color>_sftt@o1';

describe('LRR 69 Promissory Notes', () => {
  test('69: each player begins with the generic notes of their colour, four in the base game', () => {
    const base = loadPack([]);
    const game = createGame({ expansions: [], playerCount: 3, faction: '' }, base);
    const generic = ['promissory:<color>_cf', 'promissory:<color>_ps', 'promissory:<color>_sftt', 'promissory:<color>_ta'];
    expect(game.start.me.promissory).toEqual(generic.map(id => `${id}@me`));
    for (const { id } of game.opponents) expect(game.start.opponents[id]?.promissory).toEqual(generic.map(note => `${note}@${id}`));
  });

  test('69: with Prophecy of Kings a player begins with one unique and five generic notes', () => {
    const game = createGame({ expansions: ['pok'], playerCount: 3, faction: 'hacan' }, loadPack(['pok']));
    expect(game.start.me.promissory).toEqual([
      'promissory:<color>_cf@me', 'promissory:<color>_ps@me', 'promissory:<color>_sftt@me', 'promissory:<color>_ta@me', 'promissory:<color>_an@me',
      'promissory:convoys@me',
    ]);
  });

  test.todo('69.1: a player resolves their promissory notes by the card text — not modelled: promissory notes are not tracked (a manual adjustment stands in)');
  test.todo('69.1.1: promissory notes are optional unless stated — not modelled: promissory notes are not tracked');
  test('69.2: playing a note of my own colour warns (ownPromissory), and the note stays mine', () => {
    const mine = play(MY_TRADE);
    const game = table(mine, [MY_TRADE]);
    expect(codesOf(game, pack, mine)).toEqual(['ownPromissory']);
    expect(forecast(game, pack).state.holdings.promissory).toEqual([MY_TRADE]);
  });

  test('69.2: a note of my own faction warns the same, and so does a rival playing their own note', () => {
    const mine = play('promissory:convoys@me');
    expect(codesOf({ ...table(mine, ['promissory:convoys@me']), faction: 'hacan' }, pack, mine)).toEqual(['ownPromissory']);
    // A note marked by hand without an address is known by its faction alone.
    const bare = play('promissory:convoys');
    expect(codesOf({ ...table(bare, ['promissory:convoys']), faction: 'hacan' }, pack, bare)).toEqual(['ownPromissory']);
    const theirs = play(THEIR_TRADE, 'o1');
    expect(codesOf(table(theirs, [], [THEIR_TRADE]), pack, theirs)).toEqual(['ownPromissory']);
  });

  test('69.2: a note of another player is played without a warning', () => {
    const mine = play(THEIR_TRADE);
    expect(codesOf(table(mine, [THEIR_TRADE]), pack, mine)).toEqual([]);
  });

  test('69.3: Trade Agreement and Ceasefire say to return the card: once played, each goes back to its owner', () => {
    for (const note of [THEIR_TRADE, THEIR_CEASEFIRE]) {
      const { state } = forecast(table(play(note), [note]), pack);
      expect(state.holdings.promissory, note).toEqual([]);
      expect(state.rivals?.o1.holdings.promissory, note).toEqual([note]);
    }
  });

  test('69.3: Support for the Throne is not returned by playing it: it stays with the player who holds it', () => {
    const { state } = forecast(table(play(THEIR_SUPPORT), [THEIR_SUPPORT]), pack);
    expect(state.holdings.promissory).toEqual([THEIR_SUPPORT]);
    expect(state.rivals?.o1.holdings.promissory).toEqual([]);
  });

  test('69.3: a note played without being held warns and returns to nobody', () => {
    const mine = play(THEIR_TRADE);
    const game = table(mine, []);
    expect(codesOf(game, pack, mine)).toEqual(['componentNotHeld']);
    expect(forecast(game, pack).state.rivals?.o1.holdings.promissory).toEqual([]);
  });

  test('69.4: a returned note can be given away again in a later transaction', () => {
    const again: Entry = { ...tactical(NEAR, { acts: [{ kind: 'transaction', with: 'me', give: { components: [THEIR_TRADE] }, get: {} }] }), owner: 'o1' } as Entry;
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1 } },
      entries: [play(THEIR_TRADE), again],
      game: { opponents: [RIVAL], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } }, start: { me: { promissory: [THEIR_TRADE] }, opponents: {} } },
    });
    expect(codesOf(game, pack, again)).toEqual([]);
    expect(forecast(game, pack).state.holdings.promissory).toEqual([THEIR_TRADE]);
  });

  test('69.5: a note travels with its address: the one I got from a rival is still theirs', () => {
    const mine = tactical(NEAR, { acts: [deal({ components: [MY_TRADE] }, { components: [THEIR_TRADE] })] });
    const game = table(mine, [MY_TRADE], [THEIR_TRADE]);
    expect(codesOf(game, pack, mine)).toEqual([]);
    const { state } = forecast(game, pack);
    expect(state.holdings.promissory).toEqual([THEIR_TRADE]);
    expect(state.rivals?.o1.holdings.promissory).toEqual([MY_TRADE]);
  });
  test.todo('69.4.1: an unrevealed note ignores its own return conditions — not modelled: promissory notes are not tracked');
  test('69.5: one promissory note from each side of a transaction is allowed', () => {
    const mine = tactical(NEAR, { acts: [deal({ components: [A] }, { components: [B] })] });
    expect(codesOf(table(mine, [A], [B]), pack, mine)).toEqual([]);
  });

  test('69.5: a second promissory note from one side of a transaction warns, and both still change hands', () => {
    const mine = tactical(NEAR, { acts: [deal({ components: [A, B] })] });
    const game = table(mine, [A, B]);
    expect(codesOf(game, pack, mine)).toEqual(['transactionNotes']);
    const { state } = forecast(game, pack);
    expect(state.holdings.promissory).toEqual([]);
    expect(state.rivals?.o1.holdings.promissory).toEqual([A, B]);
  });

  test('69.5: a note that first belonged to another player counts toward the one note as well', () => {
    const mine = tactical(NEAR, { acts: [deal({}, { components: [A, B] })] });
    expect(codesOf(table(mine, [], [A, B]), pack, mine)).toEqual(['transactionNotes']);
  });

  test.todo('69.5.1: notes in a play area cannot be traded — not modelled: the holdings do not tell a note in hand from one played face up');
  test.todo('69.6: promissory note hands are hidden — not modelled: hidden information is outside the planner');
  test.todo('69.7: an eliminated player\'s notes leave the game — not modelled: elimination is not tracked');
  test.todo('69.7.1: other players\' notes they held go back to their owners — not modelled: elimination is not tracked');
  test.todo('69 note 1: the number of notes in hand is public — not modelled: promissory notes are not tracked');
  test.todo('69 note 2: which note was traded may stay hidden, not that a trade happened — not modelled: hidden information is outside the planner');
  test.todo('69 note 2.2: Alliance and Support for the Throne are played at once, so trading them is public — not modelled: promissory notes are not tracked');
  test.todo('69 note 3: a player may reveal notes in hand — not modelled: hidden information is outside the planner');
});
