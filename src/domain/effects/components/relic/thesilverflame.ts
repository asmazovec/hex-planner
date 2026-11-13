/**
 * The Silver Flame (relic, Thunder's Edge): "The Silver Flame may be exchanged as part of a transaction. > ACTION: Roll
 * 1 die and purge this card; if the result is a 10, gain 1 victory point. Otherwise, purge your home system and all
 * units in it; you cannot score public objectives. Put The Fracture into play if it is not already."
 *
 * Decided: a waiver. Relics cannot be exchanged in a transaction (94.3, Transactions note 1: "Relics themselves cannot
 * be"); the replay warns of it (`transactionKind`) and this card lifts that for itself only. The ACTION is a roll of a
 * die: the replay already purges the relic when its component action plays it ("purge this card"); what the die
 * decides is not modelled.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'relic:thesilverflame';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [{
    code: 'transactionKind',
    rule: 'The Silver Flame may be exchanged as part of a transaction.',
    when: warning => warning.params?.id === id,
  }],
};
