/**
 * T'ro (Sardakk N'orr, agent): "At the end of a player's tactical action: You may exhaust this card: if you do, that
 * player may place 2 infantry from their reinforcements on a planet they control in the active system."
 *
 * Decided: `play`. Named in the `uses` of a tactical action of mine, the agent (exhausted by the replay, as any agent
 * used) places 2 infantry from reinforcements on the planet chosen in the entry's `choices.planet`, at the end of the
 * action: after the landing and the production, so a planet taken by this action counts as controlled. The planet must
 * be in the active system and controlled by the player then; otherwise nothing is placed. Used for another player
 * (an opponent's entry naming my agent) it is not modelled: an opponent's entry does not change my state.

 */
import { placeUnits } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:sardakkagent';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  holder: 'self',
  play: ctx => {
    const entry = ctx.entry;
    if (!ctx.held || entry?.type !== 'tactical') return [];
    const planet = String(ctx.choices.planet ?? '');
    if (!planet || ctx.board.planets[planet]?.owner !== ctx.holder || ctx.systemOf(planet) !== entry.systemId) return [];
    return [placeUnits(ctx.holder, { planet }, { infantry: 2 })];
  },
};
