/**
 * "ACTION: Exhaust this card to allow each other player to spend 3 trade goods and give you 1 promissory note.
 * Each player that does may research a non-faction, non-unit upgrade technology. You also gain each technology
 * researched in this way."
 *
 * Hint. What the other players pay, give and research is their choice; the notes and technologies gained are
 * entered as gains. Exhausting it is the common rule of "Exhaust this card", already replayed.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'breakthrough:deepwroughtbt';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['component'] };
