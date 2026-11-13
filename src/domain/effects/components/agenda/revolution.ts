/**
 * Anti-Intellectual Revolution (agenda, law): "For: After a player researches a technology, that player must destroy 1
 * of their non-fighter ships. Against: At the start of the next strategy phase, each player chooses and exhausts 1
 * planet for each technology that they own."
 *
 * A hint. "For" asks the player to choose a ship to destroy after researching: the plan would need the choice entered
 * (the losses of an adjustment), and it forbids nothing, so the reminder stands where research is chosen. "Against" is
 * a one-off choice of planets at the next strategy phase, made at the table.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:revolution';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['card'] };
