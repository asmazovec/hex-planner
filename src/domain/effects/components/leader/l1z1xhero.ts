/**
 * The Helmsman, Dark Space Navigation (L1Z1X Mindnet, hero): "ACTION: Choose 1 system that does not contain other
 * players' ships. you may move your flagship and any number of your dreadnoughts from other systems into the chosen
 * system. Then, purge this card."
 *
 * Decided: a `play` of a component action with choices: the chosen system (`system`) and the ships taken to it
 * (`dreadnought@<slot>`, `flagship@<slot>`: how many from that system). The ships move straight there, with no route
 * and no move value (faction note 3), and only flagships and dreadnoughts move. A chosen system with other players'
 * ships is warned of. The replay already purges the hero. Pass 2 writes the move and the check.
 *
 * Pass 2: `play` with `moveUnits` (the ships fly as entered; a missing one is `unitsMissing`) and the check
 * `systemOccupied`. Only the system can be chosen on the screen (the choices declare no per-system ship counts); with no
 * `<unit>@<slot>` choice at all the play takes the flagship and every dreadnought of the other systems.
 */
import { moveUnits } from '../../../replay/movement';
import systemOccupied from '../../../rules/codes/systemOccupied';
import { violation } from '../../../rules/registry';
import type { UnitCounts, UnitId } from '../../../types';
import type { ComponentEffect } from '../../types';

const SHIPS = ['flagship', 'dreadnought'] as const;

export const id = 'leader:l1z1xhero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'system', kind: 'system' }],
  play: ({ game, pack, state, states, player, choices, warnings }) => {
    if (game.faction !== 'l1z1x') return;
    const target = choices.system;
    if (typeof target !== 'string') return;
    // Other players' ships in the chosen system: the replayed states, and what stands there by hand for the others.
    const others = Object.entries(states).filter(([owner]) => owner !== player);
    const shipsIn = (units: UnitCounts | undefined): boolean =>
      Object.entries(units ?? {}).some(([unit, count]) => (count ?? 0) > 0 && pack.units[unit as UnitId] !== undefined && !pack.units[unit as UnitId]?.ground);
    const occupied = others.some(([, other]) => shipsIn(other.systems[target]))
      || Object.entries(game.enemyUnits[target] ?? {}).some(([owner, units]) => owner !== player && !(owner in states) && shipsIn(units));
    if (occupied) warnings.push(violation(systemOccupied.code, {}));
    const named = Object.entries(choices).flatMap(([key, count]) => {
      const [unit, from] = key.split('@');
      return (SHIPS as readonly string[]).includes(unit) && from !== undefined && from !== target && typeof count === 'number' && count > 0
        ? [{ from, units: { [unit]: count } as UnitCounts }] : [];
    });
    const everything = Object.keys(choices).some(key => key.includes('@')) ? [] : Object.entries(state.systems).flatMap(([from, units]) => {
      const ships: UnitCounts = {};
      for (const unit of SHIPS) if (from !== target && (units[unit] ?? 0) > 0) ships[unit] = units[unit];
      return Object.keys(ships).length > 0 ? [{ from, units: ships }] : [];
    });
    moveUnits(game, state, target, [...named, ...everything], pack, warnings);
  },
};
