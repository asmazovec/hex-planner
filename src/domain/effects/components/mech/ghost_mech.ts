/**
 * Icarus Drive (Ghosts of Creuss, mech): "After any player activates a system, you may remove this unit from the game
 * board to place or move a Creuss wormhole token into this system."
 *
 * Decided: `play`, named in `uses` of the entry that activates a system: one mech of the Creuss player leaves the board,
 * from the system `systemId` they chose (the first system holding one of their mechs when none is chosen), and the
 * Creuss wormhole token they chose (`token`, alpha or beta) is placed or moved into the system the mech was in (Creuss
 * notes, Icarus Drive 2). A mech on a planet is taken from the planet. No token is moved when none is chosen.
 */
import { systemOfPlanet } from '../../../stacks';
import type { ComponentEffect } from '../../types';

export const id = 'mech:ghost_mech';

const TOKENS = ['alpha', 'beta'];
const NAMES = { alpha: { ru: 'Альфа', en: 'Alpha' }, beta: { ru: 'Бета', en: 'Beta' } };

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'token', kind: 'option', options: () => TOKENS, names: NAMES, label: { ru: 'Жетон', en: 'Token' } },
    { key: 'systemId', kind: 'system', label: { ru: 'Система меха', en: 'System of the mech' }, options: ({ state }) => Object.entries(state.systems).filter(([, units]) => (units.mech ?? 0) > 0).map(([slot]) => slot) },
  ],
  play: ({ game, pack, state, shared, choices, held }) => {
    if (!held || game.faction !== 'ghost') return;
    const chosen = typeof choices.systemId === 'string' ? choices.systemId : undefined;
    let slot = chosen !== undefined && (state.systems[chosen]?.mech ?? 0) > 0 ? chosen : Object.keys(state.systems).find(key => (state.systems[key].mech ?? 0) > 0);
    if (slot !== undefined) {
      state.systems[slot] = { ...state.systems[slot], mech: (state.systems[slot].mech ?? 0) - 1 };
    } else {
      // On a planet: the mech is taken from it, and its system is the one the token goes into.
      const planetId = Object.keys(state.ground).find(key => (state.ground[key].mech ?? 0) > 0);
      if (planetId === undefined) return;
      state.ground[planetId] = { ...state.ground[planetId], mech: (state.ground[planetId].mech ?? 0) - 1 };
      slot = systemOfPlanet(game, planetId, pack);
    }
    const token = String(choices.token);
    if (slot !== undefined && TOKENS.includes(token)) shared.wormholeTokens = { ...shared.wormholeTokens, [token]: slot };
  },
};
