import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry, Game } from '../../../types';
import { adjust, bench, effect, primary, quote, warningsOf, type Bench } from '../kit';
import { id } from './planesplitter-obs';

/** The code the research step is to give for a technology that cannot be researched; not in the app yet. */
const UNAVAILABLE = 'researchUnavailable';

/** The Technology card is mine this round, so its primary is free and mine to play. */
const holdingTechnology = (game: Game): Game => {
  const [first, ...rest] = game.plans[0].rounds;
  return { ...game, plans: [{ ...game.plans[0], rounds: [{ ...first, strategyCard: CARD.technology }, ...rest] }] };
};
const table = (faction: string, entry: Entry): Bench => {
  const made = bench({ faction, expansions: ['pok', 'te'], entries: [entry] });
  return { ...made, game: holdingTechnology(made.game) };
};
const codes = (made: Bench, entry: Entry): string[] => warningsOf(made, entry).map(w => w.code as string);

describe('technology:planesplitter-obs Planesplitter (Obsidian)', () => {
  // "When you perform a strategic action, you may move an ingress token into a system that contains or is adjacent to
  //  your units."
  // Checks: the technology is a reminder of the strategy card and lifts no check.
  // Why nothing is validated: the ingress tokens lie on the board of the game, not in the replay of a plan.
  test('technology:planesplitter-obs is a reminder of the strategy card and waives nothing', () => {
    const { pack } = bench({ faction: 'obsidian', expansions: ['pok', 'te'] });
    quote(pack, id, 'you may move an ingress token into a system that contains or is adjacent to your units');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['card']);
    expect(effect(pack, id).waive).toBeUndefined();
  });

  // "This technology cannot be researched." LRR 90.9: "A player can research technology by resolving either the
  //  primary or secondary ability of the Technology strategy card".
  // Checks: researching the card with the Technology primary warns, even for the Obsidian.
  // Why the check is NOT redundant here: the card forbids its own research; it comes only by being gained (Puppets
  // of the Blade), so a research of it is a breach for every player. The replay has no such check yet.
  test.fails('technology:planesplitter-obs researched by the Technology primary is warned of', () => {
    const research = primary(CARD.technology, { researched: [id] });
    const made = table('obsidian', research);
    quote(made.pack, id, 'This technology cannot be researched.');
    expect(codes(made, research)).toContain(UNAVAILABLE);
  });

  // LRR 90 note 2: "If a player is instructed to gain a technology, that player does not have to meet the
  //  prerequisites".
  // Checks: the card gained (Puppets of the Blade hands over the Obsidian's components) is not warned of.
  // Why the check is redundant here: gaining is not researching; the card forbids research only.
  test('technology:planesplitter-obs gained, not researched, is not warned of', () => {
    const gain = { ...adjust({}), gains: [id] } as Entry;
    const made = table('obsidian', gain);
    expect(codes(made, gain)).not.toContain(UNAVAILABLE);
    expect(codes(made, gain)).toEqual([]);
  });

  // Checks: the Firmament side of the card (Planesplitter (Firmament)) is researched as any faction technology.
  // Why the check is NOT made here: only the Obsidian side says it cannot be researched.
  test('technology:planesplitter-obs: the Firmament side is researched without that warning', () => {
    const research = primary(CARD.technology, { researched: ['technology:planesplitter-firm'] });
    expect(codes(table('firmament', research), research)).not.toContain(UNAVAILABLE);
  });
});
