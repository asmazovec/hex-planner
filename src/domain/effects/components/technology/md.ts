/**
 * Magen Defense Grid ΩΩ (technology, Prophecy of Kings, Codex IV): "When any player activates a system that contains 1
 * or more of your structures, place 1 infantry from your reinforcements with each of those structures. At the start of
 * ground combat on a planet that contains 1 or more of your structures, produce 1 hit and assign it to 1 of your
 * opponent's ground forces."
 *
 * Decided: the first sentence changes the board the plan counts: on activation of a system with my structures, one
 * infantry stands with each space dock and each PDS of mine there. It is passive (no choice, no exhaust) but places
 * units, which no point of the count does yet: pass 2 needs a hook in the activation step. The second sentence is a
 * hit in a combat the plan does not fight.
 * Pass 2: passive, with the activation hook (`onActivate`).
 */
import { place } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:md';

export const ability: Ability = {
  tier: 'passive',
  rule: id,
  holder: 'anyone',
  on: {
    // Any player's activation reaches the owner's card; the infantry stand with the owner's own structures there.
    onActivate: (ctx, activation) => {
      const mine = ctx.my.structures();
      return activation.planets.flatMap(planet => {
        const here = mine.find(item => item.planet === planet)?.structures ?? {};
        const structures = (here.spacedock ? 1 : 0) + (here.pds ?? 0);
        return structures > 0 ? [place.units(ctx.holder, { planet }, { infantry: structures })] : [];
      });
    },
  },
};
