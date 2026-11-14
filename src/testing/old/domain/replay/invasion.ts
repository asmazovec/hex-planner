import type { GameState, UnitCounts, Warning, RuleStep, Game, DataPack } from '../../../../domain/types';
import { violation } from '../../../../domain/rules/registry';
import { code } from '../../../../domain/replay/invasion';
import { add, removeUnits } from '../../../../domain/replay/state';
import { inHomeSystem } from '../stacks';

/**
 * Effect of an ability or card that places units on a planet: they are added to it; a planet the player does not
 * control is warned of (67.4.1) and gets them all the same. Reinforcement limits are not counted here.
 */
export function placeOnPlanet(state: GameState, planetId: string, units: UnitCounts, warnings: Warning[], step?: RuleStep): void {
  if (state.control[planetId] !== 'me') warnings.push(violation(code('placeNotControlled'), { planetId }, step));
  add(state.ground, planetId, units);
}
/**
 * The condition of the exploration cards that read "if you have at least 1 mech on this planet, or if you remove 1
 * infantry from it" (35.2): a mech keeps everything, else one infantry is removed. With neither it warns
 * (`explorationCondition`) and returns false: the card's gain is then not made.
 */
export function exploreCondition(state: GameState, planetId: string, warnings: Warning[]): boolean {
  const here = state.ground[planetId] ?? {};
  if ((here.mech ?? 0) > 0) return true;
  if ((here.infantry ?? 0) > 0) {
    removeUnits(state.ground, planetId, { infantry: 1 });
    return true;
  }
  warnings.push(violation(code('explorationCondition'), { planetId }));
  return false;
}
/**
 * Effect of a card attached to a planet: it joins `state.attachments` (the whole game's, on my state). A target the
 * card does not allow is warned of (`attachTarget`, `reason`: notControlled, home or legendary) and still gets it.
 */
export function attachCard(
  game: Game, state: GameState, planetId: string, cardId: string, pack: DataPack, warnings: Warning[],
  limits: { notHome?: boolean; notLegendary?: boolean } = {},
): void {
  const reason = state.control[planetId] !== 'me' ? 'notControlled'
    : limits.notHome && inHomeSystem(game, planetId, pack) ? 'home'
      : limits.notLegendary && pack.planets[planetId]?.legendary !== undefined ? 'legendary' : undefined;
  if (reason) warnings.push(violation(code('attachTarget'), { planetId, reason }));
  const attached = (state.attachments ??= {});
  attached[planetId] = [...(attached[planetId] ?? []), cardId];
}
