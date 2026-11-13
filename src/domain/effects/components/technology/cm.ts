/**
 * Chaos Mapping (Clan of Saar, technology): "Other players cannot activate asteroid fields that contain 1 or more of
 * your ships. At the start of your turn during the action phase, you may produce 1 unit in a system that contains at
 * least 1 of your units that has PRODUCTION."
 *
 * Today a hint of the production. Both sentences touch what the plan counts, but neither fits it yet: the first
 * forbids something to other players (a check made on an opponent's entry because of my component: the foundation
 * only lifts checks, it adds none), the second is a production outside a tactical action, paid (Saar, Chaos Mapping
 * note 1), once on each of my turns, for which no entry has a field (see the test.todo of its test).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:cm';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['production'] };
