/**
 * Star Forge (Embers of Muaat): "ACTION: Spend 1 token from your strategy pool to place either 2 fighters or 1
 * destroyer from your reinforcements in a system that contains 1 or more of your war suns."
 *
 * Decided: `play`. A component action with the choices `systemId` and `unit` ('fighter' or 'destroyer'): it spends
 * one strategy token (`shortStrategy` when the pool is empty) and places the units in the space area of that system.
 * A system without a war sun of mine is warned of (a new code; the Muaat cannot use Star Forge without a war sun on
 * the board, Muaat note 1), and the units are placed all the same. The Ember Colossus' infantry is placed by this play
 * too (see `mech/muaat_mech.ts`). Pass 1: still the hint it is today.
 */
import warSunAbsent from '../../../rules/codes/warSunAbsent';
import { violation } from '../../../rules/registry';
import { placeUnits } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { spendStrategyBy } from '../../helpers/cardPlay';

export const id = 'ability:star_forge';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'systemId', kind: 'system', label: { ru: 'Система', en: 'System' } },
    { key: 'unit', kind: 'unit', options: () => ['fighter', 'destroyer'], label: { ru: 'Юниты', en: 'Units' } },
  ],
  holder: 'self',
  play: ctx => {
    // Printed on the Muaat sheet only: another faction's play of it does nothing.
    if (ctx.my.faction !== 'muaat' || !ctx.held) return [];
    const slot = ctx.choices.systemId;
    const unit = ctx.choices.unit;
    if (typeof slot !== 'string' || (unit !== 'fighter' && unit !== 'destroyer')) return [];
    const events = spendStrategyBy(ctx);
    if (!((ctx.my.unitsIn(slot).warsun ?? 0) > 0)) ctx.warn(violation(warSunAbsent.code, {}));
    events.push(placeUnits(ctx.holder, { slot }, { [unit]: unit === 'fighter' ? 2 : 1 }));
    // Ember Colossus (mech:muaat_mech): "you may place 1 infantry from your reinforcements with this unit", for each
    // of my mechs in this system or an adjacent one, in its space area or on its planet.
    for (const near of [slot, ...ctx.adjacent(slot)]) {
      const space = ctx.my.unitsIn(near).mech ?? 0;
      if (space > 0) events.push(placeUnits(ctx.holder, { slot: near }, { infantry: space }));
      for (const planetId of ctx.planetsIn(near)) {
        const ground = ctx.my.unitsOn(planetId).mech ?? 0;
        if (ground > 0) events.push(placeUnits(ctx.holder, { planet: planetId }, { infantry: ground }));
      }
    }
    return events;
  },
};
