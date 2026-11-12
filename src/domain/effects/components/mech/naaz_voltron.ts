/**
 * Eidolon Maximum (Naaz-Rokha Alliance, mech, Thunder's Edge): "This unit is both a ship and ground force. It cannot be
 * assigned hits from unit abilities. Repair it at the start of every combat round. Game effects cannot place or
 * produce your mechs. When this unit is destroyed or removed, flip this card and return it to your play area."
 * The flipped side of Absolute Synergy gives it "Combat 4 (x4), Move 3, Sustain Damage".
 *
 * To be a `passive` waiver (pass 2) of the capacity checks (`capacityGroup` 16.1, `capacitySystem` 16.3): being a ship
 * it moves by itself and is not transported, so the load without one mech must fit. Only one, as the Naaz-Rokha can
 * never have two Eidolon Maximums on the board (Eidolon Maximum note 4), and only once Absolute Synergy has been
 * gained: the card lies on the mech card only after the breakthrough is flipped. The plan holds a breakthrough as held
 * or exhausted, not flipped, so held stands for flipped. Its fleet pool share ("counts towards either of the Naaz-Rokha
 * player's capacity or fleet pool", note 1) and its move 3 are not counted. Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:naaz_voltron';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
