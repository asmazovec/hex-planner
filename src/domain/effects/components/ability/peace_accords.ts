/**
 * Peace Accords (Xxcha, faction ability): "After you resolve the primary or secondary ability of the "Diplomacy"
 * strategy card: You may gain control of 1 planet other than Mecatol Rex that does not contain any units and is in a
 * system that is adjacent to a planet you control."
 *
 * Decided: `play`. The ability is named in `uses` of a Diplomacy entry with the planet chosen; the player gains it
 * exhausted (ruling 3). A planet the text does not allow (Mecatol Rex, one with units, one not adjacent to a planet of
 * the player) is warned of with a new code and gained all the same.
 */
import { componentById } from '../../../components';
import { MECATOL_PLANETS } from '../../../mecatol';
import { adjacentTo } from '../../../movement';
import { planetsOf, sourceSlot } from '../../../replay/board';
import { CARD } from '../../../replay/cards/ids';
import { takeControl } from '../../../replay/invasion';
import componentCondition from '../../../rules/codes/componentCondition';
import planetNotGainable from '../../../rules/codes/planetNotGainable';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'ability:peace_accords';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  play: ({ game, state, states, pack, entry, choices, warnings, held }) => {
    if (!held || game.faction !== 'xxcha') return;
    const diplomacy = (entry.type === 'strategic' || entry.type === 'secondary') && entry.card === CARD.diplomacy;
    if (!diplomacy) warnings.push(violation(componentCondition.code, { id, name: componentById(pack, id)?.name ?? id, condition: 'Diplomacy' }));
    const planet = typeof choices.planet === 'string' ? choices.planet : undefined;
    if (planet === undefined) return;
    const holds = (units: Record<string, number | undefined> | undefined): boolean => Object.values(units ?? {}).some(n => (n ?? 0) > 0);
    const occupied = Object.values(states).some(each => holds(each.ground[planet]) || each.docks.includes(planet) || (each.pds[planet] ?? 0) > 0)
      || Object.values(game.enemyGround[planet] ?? {}).some(units => holds(units));
    const slot = sourceSlot(game, pack, planet);
    // In a system adjacent to one that holds a planet of the player's.
    const near = slot !== null && adjacentTo(game, slot, pack).some(next => planetsOf(game, next, pack).some(id => state.control[id] === 'me'));
    if (MECATOL_PLANETS.includes(planet) || occupied || !near) warnings.push(violation(planetNotGainable.code, { planet }));
    // Ruling 3: gained exhausted, which `takeControl` does.
    takeControl(game, state, planet, pack, warnings, entry);
  },
};
