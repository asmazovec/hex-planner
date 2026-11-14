import { describe, expect, test } from 'vitest';
import type { UnitCounts } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, expectNone, expectStanding, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './conscription';

const law = (): Entry => ({ ...adjust({}, 'strategy'), gains: [id] });

/** A production at the home dock (h1) paid with Home Two, worth 1 resource. */
const produce = (units: UnitCounts) => tactical(HOME, { production: units, payment: { planets: ['h2'], tradeGoods: 0 } });
const table = (entry: Entry, inPlay: boolean) =>
  bench({ faction: 'sol', units: { [HOME]: { carrier: 1 } }, entries: inPlay ? [law(), entry] : [entry], game: { docks: ['h1'] } });

describe('agenda:conscription Regulated Conscription', () => {
  // "For: When a player produces units, they produce only 1 fighter and infantry for its cost instead of 2."
  // Checks: with the law two infantry cost 2 resources; 1 paid leaves a shortfall of 1, named against the new cost.
  // Why the check is NOT redundant here: the law makes production dearer, it lifts nothing: it is a `modify` of the
  // unit cost (68.1.2 halves it for fighters and infantry, the law takes the halving away), and the payment check
  // then runs against the new number.
  test('agenda:conscription makes each infantry cost a whole resource: two infantry for 1 resource fall short', () => {
    const entry = produce({ infantry: 2 });
    const conscription = table(entry, true);
    quote(conscription.pack, id, 'they produce only 1 fighter and infantry for its cost instead of 2');
    const warnings = warningsOf(conscription, entry);
    expectStanding(warnings, 'shortResources');
    expect(warnings.find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 2, paid: 1 });
  });

  // Checks: fighters are dearer the same way: three fighters cost 3.
  // Why the check is NOT redundant here: the law names fighters beside infantry; the payment check runs on 3.
  test('agenda:conscription makes each fighter cost a whole resource too', () => {
    const entry = produce({ fighter: 3 });
    expect(warningsOf(table(entry, true), entry).find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 3, paid: 1 });
  });

  // LRR 68.1.2 (the cost of a unit shown with two icons): "the player produces two of that unit for that cost".
  // Checks: without the law two infantry cost 1 resource and nothing is warned of.
  // Why the check is NOT redundant here: the law is not in play, so the rules' price stands.
  test('agenda:conscription not in play: two infantry cost 1 resource', () => {
    const entry = produce({ infantry: 2 });
    expectNone(warningsOf(table(entry, false), entry), 'shortResources');
  });

  // Checks: one infantry costs 1 resource with the law as without it: nothing to warn of.
  // Why the check is NOT redundant here: a single infantry was already rounded up to a whole resource.
  test('agenda:conscription one infantry still costs 1 resource', () => {
    const entry = produce({ infantry: 1 });
    expectNone(warningsOf(table(entry, true), entry), 'shortResources');
  });

  // Checks: a unit with a single cost (a carrier, 3) costs the same with the law.
  // Why the check is NOT redundant here: the law names fighters and infantry only.
  test('agenda:conscription leaves the cost of other units alone', () => {
    const entry = produce({ carrier: 1 });
    expect(warningsOf(table(entry, true), entry).find(w => w.code === 'shortResources')?.params).toMatchObject({ needed: 3, paid: 1 });
  });

  test('agenda:conscription is a passive effect that changes the unit cost and waives nothing', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.unitCost?.(0.5, { faction: 'sol', unit: 'infantry' })).toBe(1);
    expect(effect(pack, id).modify?.unitCost?.(3, { faction: 'sol', unit: 'carrier' })).toBe(3);
  });
});
