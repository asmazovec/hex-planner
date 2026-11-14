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
import { isMecatol } from '../../../mecatol';
import { CARD } from '../../../replay/cards/ids';
import type { Hooked } from '../../../../game/abilities/types';
import componentCondition from '../../../rules/codes/componentCondition';
import planetNotGainable from '../../../rules/codes/planetNotGainable';
import { violation } from '../../../rules/registry';
import { takeControlBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';

export const id = 'ability:peace_accords';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    if (!ctx.held || ctx.my.faction !== 'xxcha') return [];
    const entry = ctx.entry;
    const diplomacy = (entry?.type === 'strategic' || entry?.type === 'secondary') && entry.card === CARD.diplomacy;
    if (!diplomacy) ctx.warn(violation(componentCondition.code, { id, name: componentById(ctx.pack, id)?.name ?? id, condition: 'Diplomacy' }));
    const planet = typeof ctx.choices.planet === 'string' ? ctx.choices.planet : undefined;
    if (planet === undefined) return [];
    const holds = (units: Record<string, number | undefined> | undefined): boolean => Object.values(units ?? {}).some(n => (n ?? 0) > 0);
    const here = ctx.board.planets[planet];
    const occupied = Object.values(here?.ground ?? {}).some(holds) || holds(here?.structures);
    const slot = ctx.systemOf(planet);
    // In a system adjacent to one that holds a planet of the player's.
    const near = slot !== undefined && ctx.adjacent(slot).some(next => ctx.planetsIn(next).some(each => ctx.board.planets[each]?.owner === ctx.holder));
    if (isMecatol(planet) || occupied || !near) ctx.warn(violation(planetNotGainable.code, { planet }));
    // Ruling 3: gained exhausted, which the resolver does for every planet gained.
    return takeControlBy(ctx, planet);
  },
};
