/**
 * "When you gain this card, gain the Custodia Vigilia planet card and its legendary planet ability card. You are
 * neighbors with all players that have units or control planets in or adjacent to the Mecatol Rex system."
 *
 * Passive: it waives notNeighbor for a player with units or controlled planets in or adjacent to the Mecatol Rex
 * system (94.1, 60.1), and gaining it gains the Custodia Vigilia planet card, exhausted (ruling: Custodia Vigilia 1),
 * with its legendary ability.
 */
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';
import type { GameEvent } from '../../../../game/abilities/types';

export const id = 'breakthrough:keleresbt';

const CUSTODIA = 'custodiavigilia';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
};

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Hooked = {
  permit: [{
    code: 'notNeighbor',
    rule: 'You are neighbors with all players that have units or control planets in or adjacent to the Mecatol Rex system.',
    when: (warning, ctx) => {
      const slot = ctx.mecatolSlot();
      return slot !== undefined && ctx.playerNear(String(warning.params.player), slot);
    },
  }],
  holder: 'anyone',
  on: {
    gained: ctx => {
      const held = ctx.my.planets().find(planet => planet.id === CUSTODIA);
      const events: GameEvent[] = held === undefined ? [{ type: 'PlanetGained', player: ctx.holder, planet: CUSTODIA }] : [];
      if (!held?.exhausted) events.push({ type: 'PlanetExhausted', player: ctx.holder, planet: CUSTODIA });
      return events;
    },
  },
};
