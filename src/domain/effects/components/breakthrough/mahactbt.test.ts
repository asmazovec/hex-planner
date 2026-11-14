import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './mahactbt';

const TECH = 'technology:amd';
const RELIC = 'relic:shard';
const vaults = () => componentAction(id, { spends: [TECH], gains: [RELIC] });
const table = (entries: Entry[]) =>
  bench({ faction: 'mahact', expansions: ['pok', 'te'], start: { breakthrough: 'held', technologies: [TECH] }, entries });

describe('breakthrough:mahactbt Vaults of the Heir', () => {
  // "ACTION: Exhaust this card and purge 1 of your technologies to gain 1 relic."
  // Checks: the action names the technology purged (`spends`) and the relic gained (`gains`): the breakthrough is
  // exhausted, the technology is gone and the relic is held.
  // Why nothing more is needed: the component action already exhausts a card whose text says so (34.4), and the
  // entry's gains and spends carry the rest; the effect stays a hint.
  test('breakthrough:mahactbt exhausts itself, purges the technology and gains the relic', () => {
    const table_ = table([vaults()]);
    quote(table_.pack, id, 'Exhaust this card and purge 1 of your technologies to gain 1 relic.');
    const end = endOf(table_);
    expect(end.holdings.breakthrough).toBe('exhausted');
    expect(end.holdings.technologies).not.toContain(TECH);
    expect(end.holdings.relics).toContain(RELIC);
    expect(effect(table_.pack, id).tier).toBe('hint');
  });

  // LRR 34.4: an exhausted card cannot be used again until readied.
  // Checks: a second use in the same round is warned of.
  test('breakthrough:mahactbt exhausted, a second use is warned of', () => {
    const again = vaults();
    expectStanding(warningsOf(table([vaults(), again]), again), 'componentExhausted');
  });
});
