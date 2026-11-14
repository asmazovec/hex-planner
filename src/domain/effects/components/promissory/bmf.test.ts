import { describe, expect, test } from 'vitest';
import type { Player } from '../../../players';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './bmf';

const NAAZ: Player = { id: 'o1', faction: 'naaz', vp: 0, seat: 2, color: 2 };

describe('promissory:bmf Black Market Forgery', () => {
  // "ACTION: Purge 2 of your relic fragments of the same type to gain 1 relic."
  // Checks: the note is a reminder at the component step and lifts nothing.
  // Why nothing is validated here: relic fragments are exploration cards, which the plan does not hold; the relic is
  // entered with the action.
  test('promissory:bmf is a hint at the component step', () => {
    const { pack } = bench({ faction: 'sol', expansions: ['pok'] });
    quote(pack, id, 'Purge 2 of your relic fragments of the same type to gain 1 relic.');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', hintAt: ['component'] });
  });

  // "... Then, return this card to the Naaz-Rokha player." (LRR 69.3)
  // Checks: played by another player with its relic entered, the note goes back to the Naaz-Rokha player.
  // Why nothing is lifted here: the return is the generic rule of notes that say so, already replayed.
  test('promissory:bmf played by another player gains the relic and goes back to the Naaz-Rokha', () => {
    const note = `${id}@o1`;
    const play = componentAction(note, { gains: ['relic:obsidian'] });
    const table = bench({
      faction: 'sol', expansions: ['pok'], start: { promissory: [note] }, entries: [play],
      game: { opponents: [NAAZ], start: { me: { promissory: [note] }, opponents: { o1: {} } } },
    });
    quote(table.pack, id, 'Then, return this card to the Naaz-Rokha player.');
    const end = endOf(table);
    expect(end.holdings.relics).toContain('relic:obsidian');
    expect(end.holdings.promissory).not.toContain(note);
    expect(end.rivals?.o1?.holdings.promissory).toContain(note);
  });

  // LRR 69.2: "A player cannot play their own promissory note."
  // Checks: the Naaz-Rokha playing their own note is warned of.
  test('promissory:bmf the Naaz-Rokha cannot play their own', () => {
    const note = `${id}@me`;
    const play = componentAction(note);
    const table = bench({ faction: 'naaz', expansions: ['pok'], start: { promissory: [note] }, entries: [play] });
    expectStanding(warningsOf(table, play), 'ownPromissory');
  });
});
