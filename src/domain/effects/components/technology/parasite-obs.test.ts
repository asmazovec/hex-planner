import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry, Game } from '../../../types';
import { adjust, bench, effect, primary, quote, secondary, warningsOf, type Bench } from '../kit';
import { id } from './parasite-obs';

/** The code the research step is to give for a technology that cannot be researched; not in the app yet. */
const UNAVAILABLE = 'researchUnavailable';

/** The Technology card is mine this round, so its primary is free and mine to play. */
const holdingTechnology = (game: Game): Game => {
  const [first, ...rest] = game.plans[0].rounds;
  return { ...game, plans: [{ ...game.plans[0], rounds: [{ ...first, strategyCard: CARD.technology }, ...rest] }] };
};
const table = (faction: string, entry: Entry, holding = true): Bench => {
  const made = bench({ faction, expansions: ['pok', 'te'], entries: [entry] });
  return holding ? { ...made, game: holdingTechnology(made.game) } : made;
};
const codes = (made: Bench, entry: Entry): string[] => warningsOf(made, entry).map(w => w.code as string);

describe('technology:parasite-obs Neural Parasite (Obsidian)', () => {
  // "At the start of your turn, destroy 1 of another player's infantry in or adjacent to a system that contains your
  //  infantry."
  // Checks: the technology is a reminder at the start of a turn and lifts no check.
  // Why nothing is validated: the infantry destroyed is another player's unit chosen by the player; no entry has a
  // place for it, so the loss is entered by hand.
  test('technology:parasite-obs is a reminder at the start of a turn and waives nothing', () => {
    const { pack } = bench({ faction: 'obsidian', expansions: ['pok', 'te'] });
    quote(pack, id, 'destroy 1 of another player\'s infantry in or adjacent to a system that contains your infantry');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['activation']);
  });

  // "This technology cannot be researched."
  // Checks: researching the card with the Technology primary warns.
  // Why the check is NOT redundant here: the card forbids its own research for every player; the replay has no such
  // check yet.
  test('technology:parasite-obs researched by the Technology primary is warned of', () => {
    const research = primary(CARD.technology, { researched: [id] });
    const made = table('obsidian', research);
    quote(made.pack, id, 'This technology cannot be researched.');
    expect(codes(made, research)).toContain(UNAVAILABLE);
  });

  // "This technology cannot be researched."
  // Checks: the secondary of Technology is a research too, and warns the same.
  // Why the check is NOT redundant here: any research of the card is forbidden, whichever ability of the card.
  test('technology:parasite-obs researched by the Technology secondary is warned of', () => {
    const research = secondary(CARD.technology, { researched: [id], payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    expect(codes(table('obsidian', research, false), research)).toContain(UNAVAILABLE);
  });

  // Checks: the card gained by an entry (the Obsidian's components taken over) is not warned of.
  // Why the check is redundant here: gaining a technology is not researching it (LRR 90 note 2).
  test('technology:parasite-obs gained, not researched, is not warned of', () => {
    const gain = { ...adjust({}), gains: [id] } as Entry;
    expect(codes(table('obsidian', gain), gain)).toEqual([]);
  });

  // Checks: the Firmament side (Neural Parasite (Firmament)) is researched as any faction technology.
  // Why the check is NOT made here: only the Obsidian side says it cannot be researched.
  test('technology:parasite-obs: the Firmament side is researched without that warning', () => {
    const research = primary(CARD.technology, { researched: ['technology:parasite-firm'] });
    expect(codes(table('firmament', research), research)).not.toContain(UNAVAILABLE);
  });
});
