/**
 * Lucky Shot (action card, Action): "Destroy 1 dreadnought, cruiser, or destroyer in a system that contains a planet
 * you control."
 *
 * Pass 2 makes it a `play` with the choices `system`, `player`, `unit`: one dreadnought, cruiser or destroyer of that
 * opponent in that system is destroyed. A system without a planet the player controls, another unit type or one's own
 * units cannot be chosen (tirules2 ruling 1): `componentUnresolved` (2.6.1). Pass 1 keeps it the hint it is today; its
 * tests say what it must do.
 */
import { removeUnits } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import type { UnitId } from '../../../types';
import { unresolvedBy } from '../../helpers/cardPlay';

export const id = 'actionCard:lucky';

const SHIPS = ['dreadnought', 'cruiser', 'destroyer'];

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'system', kind: 'system' },
    { key: 'player', kind: 'player' },
    { key: 'unit', kind: 'unit', options: () => SHIPS },
  ],
  holder: 'self',
  play: ctx => {
    const { system, player, unit } = ctx.choices;
    if (system === undefined || player === undefined || unit === undefined) return [];
    const target = ctx.playerOf(String(player));
    if (target === undefined || target === ctx.holder) { unresolvedBy(ctx, 'another player must be chosen'); return []; }
    if (!SHIPS.includes(String(unit))) { unresolvedBy(ctx, 'only a dreadnought, cruiser or destroyer'); return []; }
    const slot = String(system);
    if (!ctx.planetsIn(slot).some(planetId => ctx.board.planets[planetId]?.owner === ctx.holder)) {
      unresolvedBy(ctx, 'the system has no planet you control');
      return [];
    }
    const ship = unit as UnitId;
    if ((ctx.of(target).unitsIn(slot)[ship] ?? 0) < 1) { unresolvedBy(ctx, 'that player has no such ship in the system'); return []; }
    return [removeUnits(target, { slot }, { [ship]: 1 })];
  },
};
