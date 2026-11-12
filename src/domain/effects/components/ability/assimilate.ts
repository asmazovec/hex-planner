/**
 * Assimilate (L1Z1X Mindnet, faction ability): "When you gain control of a planet: Replace each PDS and space dock
 * that is on that planet with a matching unit from your reinforcements."
 *
 * Decided: a passive change of the board. When the L1Z1X take a planet, the structures of the player who held it are
 * not destroyed (49.5.1) but become L1Z1X ones (faction notes 1 and 4: mandatory, and a dock so gained may produce
 * in the same tactical action). Pass 2 needs a point in `gainControl` (src/domain/replay/invasion.ts) where a
 * component changes what happens to the structures on a planet gained.
 *
 * Pass 1: the hint it is today; its tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:assimilate';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
