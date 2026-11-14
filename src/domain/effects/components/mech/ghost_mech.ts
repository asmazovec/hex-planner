/**
 * Icarus Drive (Ghosts of Creuss, mech): "After any player activates a system, you may remove this unit from the game
 * board to place or move a Creuss wormhole token into this system."
 *
 * Decided: `play`, named in `uses` of the entry that activates a system: one mech of the Creuss player leaves the board,
 * from the system `systemId` they chose (the first system holding one of their mechs when none is chosen), and the
 * Creuss wormhole token they chose (`token`, alpha or beta) is placed or moved into the system the mech was in (Creuss
 * notes, Icarus Drive 2). A mech on a planet is taken from the planet. No token is moved when none is chosen.
 */
import { removeUnits } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import type { GameEvent } from '../../../../game/events';
import { systemsWithUnits } from '../../helpers/choices';

export const id = 'mech:ghost_mech';

const TOKENS = ['alpha', 'beta'];
const NAMES = { alpha: { ru: 'Альфа', en: 'Alpha' }, beta: { ru: 'Бета', en: 'Beta' } };

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'token', kind: 'option', options: () => TOKENS, names: NAMES, label: { ru: 'Жетон', en: 'Token' } },
    { key: 'systemId', kind: 'system', label: { ru: 'Система меха', en: 'System of the mech' }, options: ctx => systemsWithUnits(ctx, unit => unit === 'mech') },
  ],
  holder: 'self',
  play: ctx => {
    if (!ctx.held || ctx.my.faction !== 'ghost') return [];
    const chosen = typeof ctx.choices.systemId === 'string' ? ctx.choices.systemId : undefined;
    const mechsIn = (slot: string): number => ctx.board.systems[slot]?.ships[ctx.holder]?.mech ?? 0;
    const events: GameEvent[] = [];
    let slot = chosen !== undefined && mechsIn(chosen) > 0 ? chosen : Object.keys(ctx.board.systems).find(key => mechsIn(key) > 0);
    if (slot !== undefined) {
      events.push(removeUnits(ctx.holder, { slot }, { mech: 1 }));
    } else {
      // On a planet: the mech is taken from it, and its system is the one the token goes into.
      const planetId = Object.keys(ctx.board.planets).find(key => (ctx.my.unitsOn(key).mech ?? 0) > 0);
      if (planetId === undefined) return [];
      events.push(removeUnits(ctx.holder, { planet: planetId }, { mech: 1 }));
      slot = ctx.systemOf(planetId);
    }
    const token = String(ctx.choices.token);
    if (slot !== undefined && TOKENS.includes(token)) {
      const from = Object.keys(ctx.board.common.wormholeTokens).find(key => ctx.board.common.wormholeTokens[key].includes(token));
      if (from !== slot) events.push(from === undefined ? { type: 'WormholeTokenPlaced', system: slot, wormhole: token } : { type: 'WormholeTokenMoved', from, to: slot, wormhole: token });
    }
    return events;
  },
};
