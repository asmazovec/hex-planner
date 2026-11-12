/**
 * Crimson Legionnaire II (Mahact, unit upgrade):
 * Cost 1(x2), Combat 7 After this unit is destroyed, gain 1 commodity or convert 1 of your commodities to a
 * trade good. Then, place the unit on this card. At the start of your next turn, place each unit that is on this
 * card on a planet you control in your home system.
 *
 * Passive: the generated numbers of the upgrade, and the hooks `onDestroyed` and `onTurnStart` (points/moments.ts): an
 * infantry destroyed waits on the card and comes back on a controlled planet of the home system at the start of my
 * next turn; with none controlled it keeps waiting. The commodity gained or converted is the player's choice (not counted).
 */
import { placeOnPlanet } from '../../../replay/invasion';
import { homePlanets } from '../../../strategy';
import '../../points/moments';
import type { ComponentEffect } from '../../types';

export const id = 'technology:cl2';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: '97.4',
  // After this unit is destroyed, the unit is placed on this card (`GameState.onCard`)...
  onDestroyed: ({ state, losses, id: card }) => {
    for (const loss of losses) {
      if (loss.unit !== 'infantry') continue;
      const waiting = ((state.onCard ??= {})[card] ??= {});
      waiting.units = { ...waiting.units, infantry: (waiting.units?.infantry ?? 0) + loss.count };
    }
  },
  // ...and at the start of the next turn each unit on it is placed on a planet in the home system that the player controls.
  onTurnStart: ({ game, state, pack, warnings, id: card }) => {
    const waiting = state.onCard?.[card]?.units;
    const planetId = homePlanets(game, pack).find(home => state.control[home] === 'me');
    if (!waiting || planetId === undefined) return;
    placeOnPlanet(state, planetId, waiting, warnings);
    delete state.onCard![card];
  },
};
