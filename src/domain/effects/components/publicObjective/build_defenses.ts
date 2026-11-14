/**
 * Build Defenses (public objective, stage I): "Have 4 or more structures."
 *
 * An objective lifts no check and changes no number of the count; it adds one: the requirement must be met when it is
 * scored (LRR 61.4, 61.5.1, 81.1). Decided: a requirement: the owner's space docks and PDS on planets they control (a
 * structure belongs to whoever controls its planet, src/domain/replay/structures.ts); unmet is the warning
 * objectiveUnmet (61.5.1).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'publicObjective:build_defenses';

export const ability: Ability = {
  tier: 'play',
  rule: id,
requirement: ({ my }) => {
    const docks = my.structures().filter(s => (s.structures.spacedock ?? 0) > 0).length;
    const pds = my.structures().reduce((sum, s) => sum + Math.max(0, s.structures.pds ?? 0), 0);
    return { have: docks + pds, need: 4 };
  },
  holder: 'self',
};
