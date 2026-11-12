import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../types';
import { adjust, bench, effect, expectStanding, expectWaived, quote, secondary, using, warningsOf } from '../kit';
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import { id } from './rt_cybernetic';

/**
 * The prerequisite check (90.12) does not exist yet: pass 2 declares it as `src/domain/rules/codes/prerequisiteMissing.ts`
 * (LRR 90.12, 90.8; step 'card'), made for every research of a technology whose prerequisites the researcher lacks, with
 * the missing symbols by colour in its params. Until then the code is named by its string.
 */
const CODE = prerequisitesMissing.code;

/** The agenda resolved in the agenda phase of round 1: the card the entry gains, with the planet elected for it. */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

/** Technology's secondary researching one technology, paid with both home planets (4 resources). */
const research = (technology: string): Entry =>
  secondary(CARD.technology, { researched: [technology], payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });

/**
 * Round 1 resolves the law on `elect` (h1 is my home planet, t1 nobody's); round 2 researches. I hold `held` from the start.
 * Transit Diodes needs two cybernetic symbols: with Neural Motivator held one is missing.
 */
const table = (entry: Entry, { held = ['technology:st'], elect = 'h1' }: { held?: string[]; elect?: string } = {}) =>
  ({ entry, ...bench({ faction: 'sol', start: { technologies: held }, rounds: [[resolved(elect)], [entry]] }) });

describe('agenda:rt_cybernetic Research Team: Cybernetic', () => {
  // "When the owner of this planet researches technology, they may exhaust this card to ignore 1 yellow prerequisite."
  // Checks: I control the elected planet, research Transit Diodes with one cybernetic symbol of the two it needs, and
  // name the card in «Used»; the missing prerequisite is still listed and lifted by the card.
  // Why the check is redundant here: LRR 90.12 asks for every prerequisite, and the card lets its owner ignore one
  // yellow one, which is exactly the one missing.
  test('agenda:rt_cybernetic used by the owner of the elected planet lifts one missing yellow prerequisite', () => {
    const t = table(using(research('technology:td'), id));
    quote(t.pack, id, 'they may exhaust this card to ignore 1 yellow prerequisite');
    expectWaived(warningsOf(t, t.entry), CODE, id);
  });

  // LRR 90.12: "To research a technology, a player must satisfy all of the technology's prerequisites."
  // Checks: the same research without the card in «Used» is warned of.
  // Why the check is NOT redundant here: the card is exhausted to be used ("may exhaust this card"); unused, it ignores nothing.
  test('agenda:rt_cybernetic in play but not used leaves the missing prerequisite standing', () => {
    const t = table(research('technology:td'));
    expectStanding(warningsOf(t, t.entry), CODE);
  });

  // "... to ignore 1 yellow prerequisite."
  // Checks: holding no cybernetic technology, two yellow symbols are missing; the card ignores one, so the warning stands.
  // Why the check is NOT redundant here: the card ignores one prerequisite, not two.
  test('agenda:rt_cybernetic does not ignore two missing yellow prerequisites', () => {
    const t = table(using(research('technology:td'), id), { held: [] });
    expectStanding(warningsOf(t, t.entry), CODE);
  });

  // Checks: Duranium Armor lacks one red symbol (Plasma Scoring held gives the other); the yellow team does not cover it.
  // Why the check is NOT redundant here: the card names the yellow colour only.
  test('agenda:rt_cybernetic does not ignore a prerequisite of another colour', () => {
    const t = table(using(research('technology:da'), id), { held: ['technology:ps'] });
    expectStanding(warningsOf(t, t.entry), CODE);
  });

  // "When the owner of this planet researches technology ..."
  // Checks: the law is attached to Target One, which I do not control; using the card lifts nothing.
  // Why the check is NOT redundant here: only the player who controls the elected planet owns the card's ability.
  test('agenda:rt_cybernetic used by a player who does not control the elected planet lifts nothing', () => {
    const t = table(using(research('technology:td'), id), { elect: 't1' });
    expectStanding(warningsOf(t, t.entry), CODE);
  });

  // "... they may exhaust this card ..."
  // Checks: used twice in one round, the second use finds the card exhausted.
  // Why the check is NOT redundant here: an exhausted card cannot be exhausted again until it is readied (34.4).
  test('agenda:rt_cybernetic is exhausted by its use: a second use in the round is warned of', () => {
    const first = using(research('technology:td'), id);
    const again = using(research('technology:ie'), id);
    const t = bench({ faction: 'sol', start: { technologies: ['technology:st'] }, rounds: [[resolved('h1')], [first, again]] });
    expect(warningsOf(t, again).map(w => w.code)).toContain('componentExhausted');
    expectWaived(warningsOf(t, first), CODE, id);
  });

  test('agenda:rt_cybernetic is played with an entry and waives one missing prerequisite', () => {
    const { pack } = table(research('technology:td'));
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual([CODE]);
  });
});
