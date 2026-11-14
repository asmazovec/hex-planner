import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { before, bench, componentAction, effect, expectNone, expectStanding, HOME, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './obsidianhero';

/** Builds a cruiser at home, paid with both home planets. */
const spend = (): Entry => tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
/** A later action in the round pays with Home One again. */
const again = (): Entry => tactical(TARGET, { production: {}, payment: { planets: ['h1'], tradeGoods: 0 } });
const obsidian = (rounds: Entry[][], faction = 'obsidian') =>
  bench({ faction, expansions: ['pok', 'te'], start: { leaders: { [id]: 'unlocked' } }, rounds, game: { docks: ['h1'] } });

describe('leader:obsidianhero Sharsiss Hollow', () => {
  // "ACTION: Ready all of your planets. Then, purge this card."
  // Checks: after the hero's component action the planets spent earlier in the round are ready: a later payment with
  // Home One makes no warning at all.
  // Why the check is redundant here: LRR 71.4 forbids spending an exhausted planet until it is readied, and the hero
  // readies every planet of its player.
  test('leader:obsidianhero readies the planets spent earlier: a later payment with them is not warned of', () => {
    const later = again();
    const table = obsidian([[spend(), componentAction(id), later]]);
    quote(table.pack, id, 'ACTION: Ready all of your planets.');
    expectNone(warningsOf(table, later), 'planetExhausted');
  });

  // "Ready all of your planets."
  // Checks: right after the hero no planet of mine is left exhausted.
  test('leader:obsidianhero leaves no planet of its player exhausted', () => {
    const later = again();
    const table = obsidian([[spend(), componentAction(id), later]]);
    expect(before(table.game, table.pack, later).exhausted).toEqual([]);
  });

  // LRR 71.4: "If a card is exhausted, a player cannot resolve that card's abilities or spend resources or influence on
  //  that card until it is readied."
  // Checks: without the hero the second payment with Home One is warned of.
  // Why the check is NOT redundant here: nothing readied the planet.
  test('leader:obsidianhero not played leaves the exhausted planet warned of', () => {
    const later = again();
    expectStanding(warningsOf(obsidian([[spend(), later]]), later), 'planetExhausted');
  });

  // Checks: the hero played before the planets were spent readies nothing that is spent later.
  // Why the check is NOT redundant here: the card readies what is exhausted when it is played, it does not keep the
  // planets ready afterwards.
  test('leader:obsidianhero played before the spending does not ready the planets spent after it', () => {
    const later = again();
    expectStanding(warningsOf(obsidian([[componentAction(id), spend(), later]]), later), 'planetExhausted');
  });

  // "Then, purge this card."
  // Checks: the hero is purged by its play: a second play in a later round warns that it is no longer held.
  // Why the check is NOT redundant here: a purged hero is gone for the rest of the game (LRR 51.12).
  test('leader:obsidianhero is purged by its play', () => {
    const second = componentAction(id);
    expectStanding(warningsOf(obsidian([[componentAction(id)], [second]]), second), 'componentNotHeld');
  });

  test('leader:obsidianhero is a play effect', () => {
    const { pack } = obsidian([[]]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).nativePlay).toBeTypeOf('function');
  });
});
