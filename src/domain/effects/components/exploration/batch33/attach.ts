/**
 * Shared by the exploration cards of batch 33. Not a component file: it sits one folder deeper, where the registry
 * does not look.
 */
import { exploreCondition } from '../../../../replay/invasion';
import type { EffectTurn } from '../../../types';

/** The planet an explored card goes with: the one named in `choices.planetId`, else the first planet the entry lands on. */
export function exploredPlanet(turn: EffectTurn): string | undefined {
  const named = turn.choices.planetId;
  if (typeof named === 'string') return named;
  return turn.entry.type === 'tactical' ? turn.entry.landings[0]?.planetId : undefined;
}

/** The card joins the attachments of the planet it was explored with (LRR 35.8); they stand on my state (`shared`). */
export function attachExplored(turn: EffectTurn): void {
  const planetId = exploredPlanet(turn);
  if (planetId === undefined) return;
  const attached = (turn.shared.attachments ??= {});
  attached[planetId] = [...(attached[planetId] ?? []).filter(id => id !== turn.id), turn.id];
}

/**
 * The condition of the hazardous cards that read "if you have at least 1 mech on this planet, or if you remove 1
 * infantry from this planet" (35.2): true when the card's gain is made. Without a planet it warns as with no ground forces.
 */
export function exploredCondition(turn: EffectTurn): boolean {
  return exploreCondition(turn.state, exploredPlanet(turn) ?? '', turn.warnings);
}
