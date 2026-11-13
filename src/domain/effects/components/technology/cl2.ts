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
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:cl2';

export const ability: Ability = {
  tier: 'passive',
  rule: '97.4',
  holder: 'self',
  on: {
    // After this unit is destroyed, the unit is placed on this card (`CardHold.onCard`)...
    onDestroyed: (ctx, destroyed) => destroyed.losses
      .filter(loss => loss.unit === 'infantry')
      .map(loss => ({ type: 'CardLoaded' as const, player: ctx.holder, card: ctx.id, units: { infantry: loss.count } })),
    // ...and at the start of the next turn each unit on it is placed on a planet in the home system that the player controls.
    onTurnStart: ctx => {
      const waiting = ctx.board.players[ctx.holder]?.cards[ctx.id]?.onCard?.units;
      const planet = ctx.home(ctx.holder).find(candidate => ctx.board.planets[candidate]?.owner === ctx.holder);
      if (!waiting || planet === undefined || !Object.values(waiting).some(count => (count ?? 0) > 0)) return;
      return [
        { type: 'UnitsPlaced' as const, player: ctx.holder, at: { planet }, units: waiting },
        { type: 'CardUnloaded' as const, player: ctx.holder, card: ctx.id, units: waiting },
      ];
    },
  },
};
