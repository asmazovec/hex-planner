/**
 * Ghost Ship (action card; "Action"): "Place 1 destroyer from your reinforcements in a non-home system that contains a
 * wormhole and does not contain other players' ships."
 *
 * Decided: `play`. A component action that puts 1 destroyer in the system chosen (`choices.system`, a map slot). A
 * system outside the card's words (no wormhole, a home system, other players' ships there) is warned of
 * (`ghostShipSystem`, a code of this card); the destroyer is placed all the same. A wormhole token counts as a wormhole.
 */
import { wormholesOf } from '../../../movement';
import { tileAt } from '../../../replay/board';
import ghostShipSystem from '../../../rules/codes/ghostShipSystem';
import { violation } from '../../../rules/registry';
import type { UnitId } from '../../../types';
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:ghost_ship';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'system', kind: 'system' }],
  play: ({ game, state, shared, states, player, choices, pack, warnings }) => {
    const slot = String(choices.system ?? '');
    if (!slot) return;
    const isShip = (unit: string) => { const def = pack.units[unit as UnitId]; return def !== undefined && !def.ground; };
    const foreign = (units: Record<string, number | undefined> | undefined) => Object.entries(units ?? {}).some(([unit, n]) => (n ?? 0) > 0 && isShip(unit));
    const others = Object.entries(states).some(([who, s]) => who !== player && foreign(s.systems[slot]))
      || Object.entries(game.enemyUnits[slot] ?? {}).some(([who, units]) => !(who in states) && foreign(units));
    const reason = tileAt(game, slot, pack)?.kind === 'home' ? 'home'
      : wormholesOf(game, pack, slot, shared.wormholeTokens).length === 0 ? 'wormhole'
        : others ? 'ships' : undefined;
    if (reason) warnings.push(violation(ghostShipSystem.code, { systemId: slot, reason }, 'component'));
    const here = state.systems[slot] ?? (state.systems[slot] = {});
    here.destroyer = (here.destroyer ?? 0) + 1;
  },
};
