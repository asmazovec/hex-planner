/**
 * Creuss IFF (Ghosts of Creuss, promissory note): "At the start of your turn during the action phase: Place or move a
 * Creuss wormhole token into either a system that contains a planet you control or a non-home system that does not
 * contain another player's ships. Then, return this card to the Creuss player."
 *
 * Decided: `play`. The holder plays it as a component entry (choices.token alpha or beta, choices.systemId): the Creuss
 * wormhole token is placed or moved there (the shared `wormholeTokens`), into a system with a planet the holder
 * controls or a non-home system without other players' ships, else warned of (`wormholeTokenPlace`). The card goes back
 * to the Creuss player by the generic rule (69.3). The timing (the start of the turn) is not checked.
 */
import wormholeTokenPlace from '../../../rules/codes/wormholeTokenPlace';
import { violation } from '../../../rules/registry';
import type { AbilityContext, Hooked } from '../../../../game/abilities/types';
import { othersHaveShips } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:iff';

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
    const to = ctx.choices.systemId;
    if (!ctx.held || !TOKENS.includes(token) || typeof to !== 'string') return [];
    if (!takesToken(ctx, to)) ctx.warn(violation(wormholeTokenPlace.code, { systemId: to }));
    const from = Object.keys(ctx.board.common.wormholeTokens).find(key => ctx.board.common.wormholeTokens[key].includes(token));
    if (from === to) return [];
    return [from === undefined ? { type: 'WormholeTokenPlaced', system: to, wormhole: token } : { type: 'WormholeTokenMoved', from, to, wormhole: token }];
  },
};
