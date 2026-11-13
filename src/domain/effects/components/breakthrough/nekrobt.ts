/**
 * Valefar Assimilator Z (Nekro Virus, breakthrough, Thunder's Edge): "When you would gain another player's technology
 * using one of your faction abilities, you may instead place one of your "Z" assimilator tokens on that player's
 * faction sheet. Your flagship gains the text abilities of that faction's flagship in addition to its own."
 *
 * A hint with no step: the assimilator token is not kept by the plan, and a flagship's printed ability is not a
 * component of the catalogue (a known limit of the foundation).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'breakthrough:nekrobt';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
