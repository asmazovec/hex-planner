import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './titanshero';

/** A production at home paid with Elysium (4 resources) alone: `cruisers` cost 2 each. */
const build = (cruisers: number): Entry => tactical(HOME, { production: { cruiser: cruisers }, payment: { planets: ['elysium'], tradeGoods: 0 } });

/** The Titans' home holds Elysium in place of h1, with the space dock on it. */
const titans = (entries: Entry[]) => bench({
  faction: 'titans', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries,
  game: { docks: ['elysium'] },
  edit: pack => { pack.tiles['r-home'] = { ...pack.tiles['r-home'], planetIds: ['elysium', 'h2'] }; },
});

describe('leader:titanshero Ul the Progenitor', () => {
  // "ACTION: Ready Elysium and attach this card to it."
  // Checks: Elysium exhausted by a first payment is readied by the hero and pays again without a warning.
  // Why the check is redundant here: LRR 34 says an exhausted planet cannot be spent until readied; the hero readies it.
  test('leader:titanshero readies Elysium', () => {
    const second = build(1);
    const table = titans([build(1), componentAction(id), second]);
    quote(table.pack, id, 'Ready Elysium and attach this card to it');
    expectNone(warningsOf(table, second), 'planetExhausted');
  });

  // "Its resource and influence values are each increased by 3"
  // Checks: after the hero Elysium (4) pays for three cruisers (6) with 7, and the card is attached to it.
  // Why the check is redundant here: the payment counts a planet's printed value (LRR 75); the attached card adds 3.
  test('leader:titanshero raises Elysium\'s resources by 3', () => {
    const pay = build(3);
    const table = titans([componentAction(id), pay]);
    expectNone(warningsOf(table, pay), 'shortResources');
    expect(endOf(table).attachments?.elysium).toContain(id);
  });

  // LRR 34.1: an exhausted planet cannot be exhausted again.
  // Checks: without the hero the second payment with Elysium is warned of.
  // Why the check is NOT redundant here: the hero was not played.
  test('leader:titanshero not played, Elysium stays exhausted', () => {
    const second = build(1);
    expectStanding(warningsOf(titans([build(1), second]), second), 'planetExhausted');
  });

  // Checks: without the hero three cruisers are short of resources.
  // Why the check is NOT redundant here: Elysium is worth its printed 4.
  test('leader:titanshero not played, Elysium pays its printed value', () => {
    const pay = build(3);
    expectStanding(warningsOf(titans([pay]), pay), 'shortResources');
  });

  // LRR 51.12: a hero is purged after its ability is resolved.
  // Checks: a second play is warned of.
  test('leader:titanshero is purged by its action', () => {
    const again = componentAction(id);
    expectStanding(warningsOf(titans([componentAction(id), again]), again), 'componentNotHeld');
  });

  test.todo('leader:titanshero gives Elysium SPACE CANNON 5 (x3): combat is not simulated');

  test('leader:titanshero is played', () => {
    const { pack } = titans([]);
    expect(effect(pack, id).tier).toBe('passive'); // the base stacks the value of an attached card from passive effects only
    expect(effect(pack, id).nativePlay).toBeDefined();
  });
});
