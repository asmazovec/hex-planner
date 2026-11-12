import { describe, expect, test } from 'vitest';
import type { DataPack, Entry, Game } from '../../../types';
import { bench, effect, endOf, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './styx';

const RIVAL = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };

/** Styx stands in the target system beside Target One. */
const withStyx = (pack: DataPack) => { pack.tiles['r-target'] = { ...pack.tiles['r-target'], planetIds: ['t1', 'styx'] }; };

/** A carrier with one infantry flies from the next system into the target and lands it on `planetId`. */
const invasion = (planetId: string) =>
  tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId, units: { infantry: 1 } }] });
const table = (entries: Entry[], game: Partial<Game> = {}) =>
  bench({ faction: 'letnev', expansions: ['te'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries, game, edit: withStyx });

describe('legendary:styx A Song Like Marrow', () => {
  // "When you gain this card, gain 1 victory point."; LRR 53.2: the card is gained with the control of the planet.
  // Checks: landing on Styx and taking it gives one victory point.
  // Why no check is lifted: the card changes the score, it allows nothing.
  test('legendary:styx taken by an invasion gives one victory point', () => {
    const game = table([invasion('styx')]);
    quote(game.pack, id, 'When you gain this card, gain 1 victory point.');
    const end = endOf(game);
    expect(end.control.styx).toBe('me');
    expect(end.vp).toBe(1);
  });

  // Checks: taking another planet of the same system gives nothing.
  test('legendary:styx another planet taken gives no point', () => {
    expect(endOf(table([invasion('t1')])).vp).toBe(0);
  });

  // "When you gain this card ..."
  // Checks: a game that begins with Styx controlled keeps the score entered by hand: the point was counted when the
  // card was gained, before the plan.
  // Why nothing changes here: the card gives its point on the gain, not for every round it is held (it is no `modify` of vp).
  test('legendary:styx controlled from the start adds nothing to the score entered', () => {
    expect(endOf(table([], { planetControl: { styx: 'me' }, vp: 3 })).vp).toBe(3);
  });

  // "When you lose this card, lose 1 victory point."
  // Checks: an opponent lands on Styx, which I controlled from the start: I lose it, and with it one point.
  // Why nothing is lifted: the card changes the score.
  test.fails('legendary:styx lost to an opponent takes one victory point away', () => {
    const theirs = tactical(TARGET, { landings: [{ planetId: 'styx', units: { infantry: 1 } }] }, { owner: RIVAL.id });
    const end = endOf(table([theirs], { planetControl: { styx: 'me' }, vp: 3, opponents: [RIVAL], enemyUnits: { [TARGET]: { [RIVAL.id]: { infantry: 1 } } } }));
    expect(end.control.styx).toBe('enemy');
    expect(end.vp).toBe(2);
  });

  test.todo('legendary:styx the opponent who takes Styx gains the point: the opponents\' scores move only by their status entries');

  test('legendary:styx is no modify of the victory points', () => {
    const { pack } = table([]);
    expect(effect(pack, id).modify?.vp).toBeUndefined();
  });
});
