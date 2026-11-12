import { describe, expect, test } from 'vitest';
import type { DataPack, Entry, Game, StartHoldings } from '../../../types';
import { bench, effect, endOf, expectStanding, FAR, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './thundersedge';

/** Thunder's Edge stands in the target system beside Target One. */
const withPlanet = (pack: DataPack) => { pack.tiles['r-target'] = { ...pack.tiles['r-target'], planetIds: ['t1', 'thundersedge'] }; };

/** A carrier with one infantry flies from the next system into the target and lands it on `planetId`. */
const invasion = (planetId: string) =>
  tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId, units: { infantry: 1 } }] });
const table = (entries: Entry[], start: StartHoldings = {}, game: Partial<Game> = {}) =>
  bench({ faction: 'letnev', expansions: ['te'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, start, entries, game, edit: withPlanet });

describe('legendary:thundersedge Jupiter Brain', () => {
  // "Gain your breakthrough when you gain this card if you do not already have it."; LRR 53.2: the card is gained
  //  with the control of the planet.
  // Checks: landing on Thunder's Edge and taking it gives the player their breakthrough, ready.
  // Why no check is lifted: the card brings a component, it allows nothing.
  test.fails('legendary:thundersedge taken by an invasion gives the breakthrough', () => {
    const game = table([invasion('thundersedge')]);
    quote(game.pack, id, 'Gain your breakthrough when you gain this card if you do not already have it.');
    const end = endOf(game);
    expect(end.control.thundersedge).toBe('me');
    expect(end.holdings.breakthrough).toBe('held');
  });

  // Checks: taking another planet gives no breakthrough.
  test('legendary:thundersedge another planet taken gives no breakthrough', () => {
    expect(endOf(table([invasion('t1')])).holdings.breakthrough).toBeUndefined();
  });

  // "... if you do not already have it."
  // Checks: a breakthrough already held, and exhausted, stays exhausted: it is not gained again, so not readied.
  test('legendary:thundersedge does not ready a breakthrough already held', () => {
    expect(endOf(table([invasion('thundersedge')], { breakthrough: 'exhausted' })).holdings.breakthrough).toBe('exhausted');
  });

  // "When you gain this card ..."
  // Checks: a game that begins with Thunder's Edge controlled takes the breakthrough from the start holdings marked
  // by hand; the plan gives none.
  test('legendary:thundersedge controlled from the start gives nothing the start holdings do not', () => {
    expect(endOf(table([], {}, { planetControl: { thundersedge: 'me' } })).holdings.breakthrough).toBeUndefined();
  });

  // "You may exhaust this card at the end of your turn to perform another action."
  // Checks: the card used is exhausted, so a second use in the round is warned of.
  // Why nothing is validated for the other action: the plan does not count the actions of a turn (each entry is one),
  // so there is no check to lift; the card is a reminder beside its exhaustion.
  test('legendary:thundersedge is exhausted by its use: a second use in the round is warned of', () => {
    const second = using(tactical(FAR), id);
    const game = table([using(tactical(NEAR), id), second], {}, { planetControl: { thundersedge: 'me' } });
    expectStanding(warningsOf(game, second), 'componentExhausted');
  });

  // LRR 53.3 with 53.2: the card is in the play area of the player who controls the planet.
  test.fails('legendary:thundersedge used without controlling Thunder\'s Edge is warned of as not held', () => {
    const entry = using(tactical(FAR), id);
    expectStanding(warningsOf(table([entry]), entry), 'componentNotHeld');
  });

  test('legendary:thundersedge waives nothing', () => {
    const { pack } = table([]);
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
