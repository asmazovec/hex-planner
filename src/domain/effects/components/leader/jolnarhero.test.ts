import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './jolnarhero';

const jolnar = (entries: ReturnType<typeof componentAction>[]) => bench({
  faction: 'jolnar', expansions: ['pok'], start: { technologies: ['technology:gd', 'technology:nm'], leaders: { [id]: 'unlocked' } }, entries,
});

describe('leader:jolnarhero Rin, the Master\'s Legacy', () => {
  // "ACTION: For each non-unit upgrade technology you own, you may replace that technology with any technology of the
  //  same color from the deck. Then, purge this card."
  // Checks: the hero's component action with Gravity Drive returned and Antimass Deflectors taken (both propulsion):
  // the player owns the new one and not the old one.
  // Why nothing is validated here: the swap is a gain and a loss the plan records as entered; the new technologies
  // ignore prerequisites (tirules2, Jol-Nar, Genetic Memory 1) and the plan checks none, so no check stands to lift.
  test('leader:jolnarhero swaps a technology for one of the same colour on its component action', () => {
    const swap = componentAction(id, { spends: ['technology:gd'], gains: ['technology:amd'] });
    const table = jolnar([swap]);
    quote(table.pack, id, 'you may replace that technology with any technology of the same color from the deck');
    expect([...endOf(table).holdings.technologies].sort()).toEqual(['technology:amd', 'technology:nm']);
    expect(effect(table.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['component'] });
  });

  // "... Then, purge this card."
  // Checks: the hero is purged by its action; a second play is warned of.
  // Why the check is NOT redundant here: a purged hero is no longer held (51.12).
  test('leader:jolnarhero is purged by its action: a second play is warned of', () => {
    const again = componentAction(id);
    const table = jolnar([componentAction(id), again]);
    expectStanding(warningsOf(table, again), 'componentNotHeld');
  });
});
