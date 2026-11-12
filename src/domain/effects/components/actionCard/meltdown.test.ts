import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, DataPack, Entry, Game } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, quote, warningsOf } from '../kit';
import { id } from './meltdown';

/** LRR 2.6.1 in a file of its own (pass 2): a component action whose ability cannot be resolved completely. */
const UNRESOLVED = 'componentUnresolved' as AnyWarningCode;
const RIVAL = 'o1';
const seatRival = (pack: DataPack) => {
  pack.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
};
/** The opponent holds t1 of the target system (no home system) with a space dock on it. */
const THEIRS: Partial<Game> = { docks: ['t1'], planetControl: { t1: 'enemy' }, planetOwner: { t1: RIVAL } };
const table = (entries: Entry[], game: Partial<Game> = THEIRS, hand: string[] = [id]) => bench({
  faction: 'sol', start: { hand }, entries, edit: seatRival,
  game: { opponents: [{ id: RIVAL, faction: 'rules-rival', vp: 0, seat: 2, color: 2 }], ...game },
});
const meltdown = (planet: string) => componentAction(id, { choices: { planet } });

describe('actionCard:meltdown Reactor Meltdown', () => {
  // "Destroy 1 space dock in a non-home system."
  // Checks: the opponent's space dock on t1 is destroyed.
  // Why no check is lifted: destroying another player's structure by a card breaks no rule.
  test.fails('actionCard:meltdown destroys the opponent\'s space dock on the planet chosen', () => {
    const play = meltdown('t1');
    const card = table([play]);
    quote(card.pack, id, 'Destroy 1 space dock in a non-home system');
    expect(endOf(card).rivals?.[RIVAL].docks).not.toContain('t1');
    expectNone(warningsOf(card, play), UNRESOLVED);
  });

  // "... in a non-home system." tirules2, Reactor Meltdown 3: a space dock in another player's home system cannot be
  //  targeted.
  // Checks: a dock of the opponent on h2, a planet of the home system, is chosen: the play is warned of.
  // Why the check is NOT redundant here: the card excludes home systems; LRR 2.6.1 then forbids the action.
  test.fails('actionCard:meltdown on a dock in a home system is warned of', () => {
    const play = meltdown('h2');
    const game: Partial<Game> = { docks: ['h2'], planetControl: { h2: 'enemy' }, planetOwner: { h2: RIVAL } };
    expectStanding(warningsOf(table([play], game), play), UNRESOLVED);
  });

  // tirules2, Reactor Meltdown 1: "A player cannot destroy their own space dock with Reactor Meltdown."
  // Checks: my own dock on t1 is chosen: the play is warned of.
  // Why the check is NOT redundant here: the ruling keeps the card for other players' docks.
  test.fails('actionCard:meltdown on my own space dock is warned of', () => {
    const play = meltdown('t1');
    expectStanding(warningsOf(table([play], { docks: ['t1'], planetControl: { t1: 'me' } }), play), UNRESOLVED);
  });

  // Checks: the card only held destroys nothing.
  // Why nothing is destroyed: the card is an ACTION and acts only when played.
  test('actionCard:meltdown held but not played destroys nothing', () => {
    expect(endOf(table([])).rivals?.[RIVAL].docks).toContain('t1');
  });

  test.fails('actionCard:meltdown is a play effect that waives nothing', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
