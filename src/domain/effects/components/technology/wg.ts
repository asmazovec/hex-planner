/**
 * Wormhole Generator (Ghosts of Creuss, technology): "ACTION: Exhaust this card to place or move a Creuss wormhole
 * token into either a system that contains a planet you control or a non-home system that does not contain another
 * player's ships."
 *
 * Decided: `play`. A component action (choices.token, choices.systemId) places or moves a Creuss wormhole token (the
 * shared `wormholeTokens`, which joins the system to the matching wormholes and counts for Slipstream), into a system
 * with a planet the player controls or a non-home system without other players' ships, else warned of
 * (`wormholeTokenPlace`); the replay already exhausts the card ("Exhaust this card").
 */
import type { GameEvent } from '../../../../game/events';
import type { AbilityContext, Hooked } from '../../../../game/abilities/types';
import wormholeTokenPlace from '../../../rules/codes/wormholeTokenPlace';
import { violation } from '../../../rules/registry';
import { othersHaveShips } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'technology:wg';

const TOKENS = ['alpha', 'beta'];
const NAMES = { alpha: { ru: 'Альфа', en: 'Alpha' }, beta: { ru: 'Бета', en: 'Beta' } };

/** Whether a system takes the token: a planet the owner controls, or a non-home system with no other player's ships. */
function takesToken(ctx: AbilityContext, slot: string): boolean {
  if (ctx.planetsIn(slot).some(planetId => ctx.board.planets[planetId]?.owner === ctx.holder)) return true;
  if (ctx.tileKind(slot) === 'home') return false;
  return !othersHaveShips(ctx, slot);
}

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'token', kind: 'option', options: () => TOKENS, names: NAMES, label: { ru: 'Жетон', en: 'Token' } },
    { key: 'systemId', kind: 'system' },
  ],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const token = String(ctx.choices.token);
    const systemId = ctx.choices.systemId;
    if (!ctx.held || !TOKENS.includes(token) || typeof systemId !== 'string') return [];
    if (!takesToken(ctx, systemId)) ctx.warn(violation(wormholeTokenPlace.code, { systemId }));
    // The token is one: it moves from the system it stands in (the last one named, as the old state kept it), or is placed.
    const from = Object.entries(ctx.board.common.wormholeTokens).filter(([, types]) => types.includes(token)).map(([slot]) => slot).pop();
    if (from === systemId) return [];
    const event: GameEvent = from === undefined
      ? { type: 'WormholeTokenPlaced', system: systemId, wormhole: token }
      : { type: 'WormholeTokenMoved', from, to: systemId, wormhole: token };
    return [event];
  },
};
