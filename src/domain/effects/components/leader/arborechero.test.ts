import { describe, expect, test } from 'vitest';
import type { CardEffects, Entry, Warning } from '../../../types';
import { isWaived } from '../../../rules/registry';
import { adjust, bench, componentAction, effect, endOf, FAR, quote, TARGET, warningsOf } from '../kit';
import { id } from './arborechero';

/**
 * The hero's component action with a production, in the shape of a card's (`CardEffects.production` and `payment`):
 * pass 2 gives the component entry that field, or renames it here.
 */
const heroPlay = (effects: CardEffects): Entry => componentAction(id, { effects } as Partial<Entry>);

/** My one infantry stands on t1, which I control, in the target system: no space dock anywhere. */
const table = (play: Entry, extra: Parameters<typeof bench>[0]['game'] = {}) => bench({
  faction: 'arborec', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } },
  entries: [adjust({ ground: { t1: { infantry: 1 } } }, 'strategy'), play],
  game: { planetControl: { t1: 'me' }, ...extra },
});

const PAID = { planets: ['h1', 'h2'], tradeGoods: 0 };
const standingOf = (warnings: Warning[], code: string) => warnings.filter(w => w.code === code && !isWaived(w));

describe('leader:arborechero Letani Miasmiala — Ultrasonic Emitter', () => {
  // "ACTION: Produce any number of units in any number of systems that contain 1 or more of your ground forces."
  // Checks: the hero produces a cruiser and two infantry in the target system, where only my infantry stands; the units
  // are on the board, and no warning stands of a missing producing unit or of a Production value.
  // Why the check is redundant here: 67/68 ask for a unit with Production and count its value; the hero produces "any
  // number" with no unit using Production (Arborec, hero note 3), only where my ground forces are.
  test.fails('leader:arborechero produces in a system with my ground forces and no space dock', () => {
    const play = heroPlay({ production: { systemId: TARGET, units: { cruiser: 1, infantry: 2 }, ground: { t1: { infantry: 2 } } }, payment: PAID });
    const hero = table(play);
    quote(hero.pack, id, 'Produce any number of units in any number of systems that contain 1 or more of your ground forces');
    const end = endOf(hero);
    expect(end.systems[TARGET]).toEqual({ cruiser: 1 });
    expect(end.ground.t1).toEqual({ infantry: 3 });
    const warnings = warningsOf(hero, play);
    expect(standingOf(warnings, 'noProduction')).toEqual([]);
    expect(standingOf(warnings, 'productionOver')).toEqual([]);
    expect(standingOf(warnings, 'shortResources')).toEqual([]);
  });

  // "... in any number of systems that contain 1 or more of your ground forces."
  // Checks: a production in a system without my ground forces is warned of.
  // Why the check is NOT redundant here: the hero names its own condition, and it is not met.
  test('leader:arborechero a system without my ground forces is warned of', () => {
    const play = heroPlay({ production: { systemId: FAR, units: { cruiser: 1 } }, payment: PAID });
    expect(standingOf(warningsOf(table(play), play), 'noProduction')).not.toEqual([]);
  });

  // Arborec, hero note 2: "A ship may be produced in the system only if no other player currently has ships in that system."
  // Checks: a cruiser produced where an opponent's ships stand is warned of.
  // Why the check is NOT redundant here: 67.6 holds for every production, whatever produces.
  test('leader:arborechero a ship among other players\' ships is still warned of', () => {
    const rival = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
    const play = heroPlay({ production: { systemId: TARGET, units: { cruiser: 1 } }, payment: PAID });
    const hero = table(play, { opponents: [rival], enemyUnits: { [TARGET]: { o1: { destroyer: 1 } } } });
    expect(standingOf(warningsOf(hero, play), 'productionBlockaded')).not.toEqual([]);
  });

  // Arborec, hero note 1: "The produced units must all be paid for."
  // Checks: the same production unpaid is short of resources.
  // Why the check is NOT redundant here: the hero frees the production from a producing unit, not from its cost (67.1).
  test('leader:arborechero the units must be paid for', () => {
    const play = heroPlay({ production: { systemId: TARGET, units: { cruiser: 1 } }, payment: { planets: [], tradeGoods: 0 } });
    expect(standingOf(warningsOf(table(play), play), 'shortResources')).not.toEqual([]);
  });

  // "Then, purge this card." LRR 51.12: a hero is purged after its ability is resolved.
  // Checks: played twice, the second play is warned of as a card no longer held.
  test('leader:arborechero is purged by its play', () => {
    const again = componentAction(id);
    const hero = bench({ faction: 'arborec', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [componentAction(id), again] });
    expect(warningsOf(hero, again).map(w => w.code)).toContain('componentNotHeld');
  });

  test.fails('leader:arborechero is a play effect', () => {
    expect(effect(table(componentAction(id)).pack, id).tier).toBe('play');
  });
});
