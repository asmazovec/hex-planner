import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, expectNone, expectStanding, expectWaived, HOME, primary, quote, secondary, tactical, warningsOf } from '../kit';
import { id } from './minister_sciences';

/** The law comes into play in the strategy phase; `owner` is the player elected, me unless an opponent is named. */
const law = (owner?: string): Entry => ({ ...adjust({}, 'strategy'), gains: [id], ...(owner ? { owner } : {}) });

const RIVAL = { opponents: [{ id: 'x', faction: 'letnev', vp: 0, seat: 2, color: 2 }] };

/** Technology's primary researching two technologies with nothing paid: the second costs 6 resources (91.2). */
const research = () => primary(7, { researched: ['technology:gd', 'technology:amd'] });

describe('agenda:minister_sciences Minister of Sciences', () => {
  // "When the owner of this card resolves the primary or secondary ability of the "Technology" strategy card, they do
  //  not need to spend resources to research technology."
  // Checks: the owner resolves Technology's primary with two technologies and pays nothing; the shortfall of 6
  // resources is still listed and lifted by the law.
  // Why the check is redundant here: 91.2 makes the second technology of the primary cost 6 resources, and the law
  // says its owner does not need to spend resources to research through Technology.
  test('agenda:minister_sciences lifts the resources of Technology\'s primary', () => {
    const entry = research();
    const table = bench({ faction: 'sol', entries: [law(), entry] });
    quote(table.pack, id, 'they do not need to spend resources to research technology');
    const warnings = warningsOf(table, entry);
    expectWaived(warnings, 'shortResources', id);
    expect(warnings.find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 6, paid: 0 });
  });

  // Checks: the secondary's 4 resources (91.3) are lifted the same way.
  // Why the check is redundant here: the card names "the primary or secondary ability" alike.
  test('agenda:minister_sciences lifts the resources of Technology\'s secondary', () => {
    const entry = secondary(7, { researched: ['technology:gd'] });
    expectWaived(warningsOf(bench({ faction: 'sol', entries: [law(), entry] }), entry), 'shortResources', id);
  });

  // LRR 91.2: "the active player may research one additional technology by spending 6 resources."
  // Checks: without the law the shortfall stands.
  // Why the check is NOT redundant here: the law is not in play.
  test('agenda:minister_sciences not in play leaves the resources of Technology owed', () => {
    const entry = research();
    expectStanding(warningsOf(bench({ faction: 'sol', entries: [entry] }), entry), 'shortResources');
  });

  // "The elected player gains this card. When the owner of this card resolves..."
  // Checks: the law elected another player: my Technology still owes its resources.
  // Why the check is NOT redundant here: the law is its owner's alone, not every player's like a law for all.
  test('agenda:minister_sciences owned by another player leaves my Technology owing', () => {
    const entry = research();
    const table = bench({ faction: 'sol', entries: [law('x'), entry], game: RIVAL });
    expectStanding(warningsOf(table, entry), 'shortResources');
  });

  // LRR 67/68: a production is paid in resources.
  // Checks: the owner produces a carrier (3 resources) in a tactical action and pays nothing: the shortfall stands.
  // Why the check is NOT redundant here: the law speaks of researching through Technology only.
  test('agenda:minister_sciences does not lift the cost of units produced', () => {
    const entry = tactical(HOME, { production: { carrier: 1 } });
    const table = bench({ faction: 'sol', entries: [law(), entry], game: { docks: ['h1'] } });
    expectStanding(warningsOf(table, entry), 'shortResources');
  });

  // LRR 91.2: the first technology of the primary is free.
  // Checks: one technology on the primary owes nothing, so there is nothing for the law to lift.
  // Why the check is NOT redundant here: it is not made at all; the waiver must not invent a warning.
  test('agenda:minister_sciences a Technology entry with nothing to pay is not warned of', () => {
    const entry = primary(7, { researched: ['technology:gd'] });
    expectNone(warningsOf(bench({ faction: 'sol', entries: [law(), entry] }), entry), 'shortResources');
  });

  test('agenda:minister_sciences is a passive effect that waives the shortfall of resources', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['shortResources']);
  });
});
