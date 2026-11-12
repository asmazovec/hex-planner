/**
 * Yin Spinner Omega (Yin, faction technology): "After you produce units, place up to 2 infantry from your
 * reinforcements on any planet you control or in any space area that contains 1 or more of your ships."
 *
 * Decided: a `play` named in `uses` of an entry that produces. The infantry are placed, not produced: no cost, no
 * Production value, no dock. They go to the planet of the choice `place` (a planet id, or a slot of the map for a
 * space area), `count` of them (1 or 2; 1 when not set, as the stepper shows). The interface asks a planet (`place`) or,
 * while no planet is chosen, a system (`space`). A planet the Yin do not control, or a space area with none of their
 * ships, gets nothing and is warned of (`placeNotControlled`, 67.4.1; `componentUnresolved` for the space area).
 * An entry that produces nothing places nothing: "After you produce units" is the trigger. Reinforcements are not counted.
 */
import { componentById } from '../../../components';
import componentUnresolved from '../../../rules/codes/componentUnresolved';
import placeNotControlled from '../../../rules/codes/placeNotControlled';
import { planetsOf } from '../../../replay/board';
import { add, unitIds } from '../../../replay/state';
import { violation } from '../../../rules/registry';
import type { GameState } from '../../../types';
import type { ChoiceContext, ComponentEffect } from '../../types';

export const id = 'technology:yso';

/** The planets the player controls on this map. */
const controlled = ({ game, pack, state }: ChoiceContext): string[] =>
  [...new Set(Object.keys(game.map).flatMap(slot => planetsOf(game, slot, pack)))].filter(planetId => state.control[planetId] === 'me');

/** Whether the player has a ship in the space area of the slot. */
const hasShip = (state: GameState, slot: string, pack: ChoiceContext['pack']): boolean =>
  unitIds(state.systems[slot] ?? {}).some(unit => (state.systems[slot]?.[unit] ?? 0) > 0 && pack.units[unit]?.ground !== true);

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'place', kind: 'planet', label: { ru: 'Планета', en: 'Planet' }, options: controlled },
    {
      key: 'space', kind: 'system', label: { ru: 'Космос системы', en: 'Space area' }, when: chosen => chosen.place === undefined,
      options: ({ game, pack, state }) => Object.keys(game.map).filter(slot => hasShip(state, slot, pack)),
    },
    { key: 'count', kind: 'number', range: [1, 2], label: { ru: 'Сколько пехоты', en: 'How many infantry' } },
  ],
  play: ({ game, state, pack, choices, entry, warnings, held }) => {
    const produced = entry.type === 'tactical' && Object.values(entry.production ?? {}).some(count => (count ?? 0) > 0);
    const where = choices.place ?? choices.space;
    if (!held || !produced || where === undefined) return;
    const place = String(where);
    const units = { infantry: Math.min(2, Math.max(0, Number(choices.count ?? 1))) };
    if (pack.planets[place] !== undefined) {
      if (state.control[place] !== 'me') warnings.push(violation(placeNotControlled.code, { planetId: place }));
      else add(state.ground, place, units);
    } else if (game.map[place] !== undefined || game.fracture.tiles?.[place] !== undefined) {
      if (!hasShip(state, place, pack)) warnings.push(violation(componentUnresolved.code, { id, name: componentById(pack, id)?.name ?? id, reason: 'no ship of yours in that space area' }));
      else add(state.systems, place, units);
    }
  },
};
