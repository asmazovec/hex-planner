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
import { planetsOf, tileAt } from '../../../replay/board';
import { unitIds } from '../../../replay/state';
import wormholeTokenPlace from '../../../rules/codes/wormholeTokenPlace';
import { violation } from '../../../rules/registry';
import type { UnitCounts } from '../../../types';
import type { ComponentEffect, EffectTurn } from '../../types';

export const id = 'promissory:iff';

const TOKENS = ['alpha', 'beta'];
const NAMES = { alpha: { ru: 'Альфа', en: 'Alpha' }, beta: { ru: 'Бета', en: 'Beta' } };

/** Whether a system takes the token: a planet the owner controls, or a non-home system with no other player's ships. */
function takesToken({ game, pack, state, states, player }: EffectTurn, slot: string): boolean {
  if (planetsOf(game, slot, pack).some(planetId => state.control[planetId] === 'me')) return true;
  if (tileAt(game, slot, pack)?.kind === 'home') return false;
  const ships = (units: UnitCounts | undefined): boolean => unitIds(units ?? {}).some(unit => pack.units[unit] && !pack.units[unit].ground);
  const others = Object.entries(states).some(([who, other]) => who !== player && ships(other.systems[slot]));
  return !others && !Object.entries(game.enemyUnits[slot] ?? {}).some(([who, units]) => !(who in states) && who !== player && ships(units));
}

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'token', kind: 'option', options: () => TOKENS, names: NAMES, label: { ru: 'Жетон', en: 'Token' } },
    { key: 'systemId', kind: 'system' },
  ],
  play: turn => {
    const { choices, shared, warnings, held } = turn;
    const token = String(choices.token);
    if (!held || !TOKENS.includes(token) || typeof choices.systemId !== 'string') return;
    if (!takesToken(turn, choices.systemId)) warnings.push(violation(wormholeTokenPlace.code, { systemId: choices.systemId }));
    shared.wormholeTokens = { ...shared.wormholeTokens, [token]: choices.systemId };
  },
};
