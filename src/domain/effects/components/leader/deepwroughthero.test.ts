import { describe, expect, test } from 'vitest';
import type { Entry, Opponent } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './deepwroughthero';

const GRAVITY_DRIVE = 'technology:gd';
const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };

const play = (extra: Partial<Entry> = {}): Entry => componentAction(id, { choices: { technology: GRAVITY_DRIVE }, ...extra } as Partial<Entry>);
const deepwrought = (entries: Entry[]) => bench({
  faction: 'deepwrought', expansions: ['pok', 'te'], entries,
  start: { leaders: { [id]: 'unlocked' }, technologies: [GRAVITY_DRIVE] },
  game: { opponents: [RIVAL], start: { me: { leaders: { [id]: 'unlocked' }, technologies: [GRAVITY_DRIVE] }, opponents: { o1: { technologies: [GRAVITY_DRIVE] } } } },
});

describe('leader:deepwroughthero Ta Zern', () => {
  // "ACTION: Purge this card and a non-unit upgrade technology you own or from your deck; then, purge all cards with
  //  the same name owned by other players and in other players' decks."
  // Checks: the component action with the choice of Gravity Drive takes it from my holdings and from the rival's.
  // Why the default count does not apply: a technology owned is otherwise never lost; the hero purges it for every
  // player at once.
  test.fails('leader:deepwroughthero purges the chosen technology from me and from every other player', () => {
    const table = deepwrought([play()]);
    quote(table.pack, id, 'purge all cards with the same name owned by other players');
    const end = endOf(table);
    expect(end.holdings.technologies).not.toContain(GRAVITY_DRIVE);
    expect(end.rivals?.o1?.holdings.technologies).not.toContain(GRAVITY_DRIVE);
  });

  // "Then, each player that purged a technology they owned researches another technology." Ruling (Deepwrought,
  //  Ta Zern 1): the Deepwrought player researches too if they owned it.
  // Checks: the technology researched instead is entered as a gain of the action and is held.
  // Why nothing more is counted: which technology each player researches is their choice.
  test.fails('leader:deepwroughthero the technology researched instead, entered as a gain, is held', () => {
    const end = endOf(deepwrought([play({ gains: ['technology:fl'] })]));
    expect(end.holdings.technologies).toEqual(expect.arrayContaining(['technology:fl']));
    expect(end.holdings.technologies).not.toContain(GRAVITY_DRIVE);
  });

  // "Purge this card" LRR 51.12.
  // Checks: the hero is purged by its action; a second one is warned of as not held.
  // Why the check is NOT redundant here: the purge is the common rule of heroes.
  test('leader:deepwroughthero is purged by its action', () => {
    const again = componentAction(id);
    const table = deepwrought([play(), again]);
    expect(endOf(table).holdings.leaders[id]).toBe('purged');
    expectStanding(warningsOf(table, again), 'componentNotHeld');
  });

  test.todo('leader:deepwroughthero a unit upgrade chosen is not purged: no warning code says so yet (a new code at the step `component`)');

  test.fails('leader:deepwroughthero is a play effect', () => {
    const { pack } = deepwrought([]);
    expect(effect(pack, id).tier).toBe('play');
  });
});
