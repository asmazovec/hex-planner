/**
 * Cripple Defenses (action card; "Action"): "Choose 1 planet. Destroy each PDS on that planet."
 *
 * Decided: `play`. It is a component action that changes the board the plan counts: every PDS on the chosen planet
 * (`choices.planet`), whoever's, is destroyed and goes back to its owner's reinforcements. The planet may hold no PDS
 * (ruling): then nothing happens and nothing is warned of.
 */
import { structures } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:cripple';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  holder: 'self',
  play: ctx => {
    const planet = String(ctx.choices.planet ?? '');
    // The structures stand with whoever controls the planet; nothing to destroy is no warning (ruling).
    const owner = ctx.board.planets[planet]?.owner;
    const pds = ctx.board.planets[planet]?.structures.pds ?? 0;
    return planet && owner && pds > 0 ? [structures.remove(owner, planet, { pds })] : [];
  },
};
