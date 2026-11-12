/**
 * Lucky Shot (action card, Action): "Destroy 1 dreadnought, cruiser, or destroyer in a system that contains a planet
 * you control."
 *
 * Pass 2 makes it a `play` with the choices `system`, `player`, `unit`: one dreadnought, cruiser or destroyer of that
 * opponent in that system is destroyed. A system without a planet the player controls, another unit type or one's own
 * units cannot be chosen (tirules2 ruling 1): `componentUnresolved` (2.6.1). Pass 1 keeps it the hint it is today; its
 * tests say what it must do.
 */
import { componentById } from '../../../components';
import { violation } from '../../../rules/registry';
import componentUnresolved from '../../../rules/codes/componentUnresolved';
import type { ComponentEffect, EffectTurn } from '../../types';
import { planetsOf } from '../../../replay/board';
import type { UnitId } from '../../../types';

export const id = 'actionCard:lucky';

const SHIPS = ['dreadnought', 'cruiser', 'destroyer'];

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'system', kind: 'system' },
    { key: 'player', kind: 'player' },
    { key: 'unit', kind: 'unit', options: () => SHIPS },
  ],
  play: turn => {
    const { system, player, unit } = turn.choices;
    if (system === undefined || player === undefined || unit === undefined) return;
    const target = turn.states[String(player)];
    if (!target || target === turn.state) return unresolved(turn, 'another player must be chosen');
    if (!SHIPS.includes(String(unit))) return unresolved(turn, 'only a dreadnought, cruiser or destroyer');
    const slot = String(system);
    if (!planetsOf(turn.game, slot, turn.pack).some(planetId => turn.state.control[planetId] === 'me')) {
      return unresolved(turn, 'the system has no planet you control');
    }
    const there = target.systems[slot];
    const ship = unit as UnitId;
    if (!there || (there[ship] ?? 0) < 1) return unresolved(turn, 'that player has no such ship in the system');
    there[ship] = (there[ship] ?? 0) - 1;
    if (there[ship] === 0) delete there[ship];
  },
};

const unresolved = (turn: EffectTurn, reason: string): void => {
  turn.warnings.push(violation(componentUnresolved.code, { id: turn.id, name: componentById(turn.pack, turn.id)?.name ?? turn.id, reason }));
};
