/**
 * Nav Suite (action card, Prophecy of Kings): "After you activate a system: During the 'Movement' step of this tactical
 * action, ignore the effect of anomalies."
 *
 * A waiver for the tactical action that names the card in `uses`: the route checks of anomalies are lifted. Per the
 * card's notes (tirules2 components/action-cards.md, Nav Suite 3-6) ships move through or into an asteroid field and a
 * supernova, through a nebula, and out of a nebula with their normal move value, so `routeBlocked` is lifted where the
 * system is an anomaly holding no other player's ships (a system with ships still ends the move, 58.3.2; a hyperlane is
 * no anomaly), and `speedShort` where the move counted without anomalies is enough. Only this action: no `lasts`.
 */
import type { ComponentEffect } from '../../types';
import { routeBlockKind, speedWithoutAnomalies } from '../../helpers/movement';

export const id = 'actionCard:nav_suite';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  waive: [
    {
      code: 'routeBlocked',
      rule: 'ignore the effect of anomalies',
      when: (warning, ctx) => ['asteroid', 'supernova', 'nebula'].includes(routeBlockKind(warning, ctx) ?? ''),
    },
    {
      code: 'speedShort',
      rule: 'ignore the effect of anomalies',
      when: (warning, ctx) => Number(warning.params.steps) <= speedWithoutAnomalies(warning, ctx),
    },
  ],
};
