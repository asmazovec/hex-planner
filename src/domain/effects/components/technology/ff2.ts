/**
 * Fighter II (unit upgrade, base game): "Cost 1(x2), Combat 8, Move 2 / This unit may move without being transported.
 * / Fighters in excess of your ships' capacity count against your fleet pool."
 *
 * A `modify` generated from the unit table (`unitUpgrades.ts`, LRR 97.4): the fighter gets move 2. The count reads the
 * rest from that move value (`fightersFly` in replay/transport.ts): a fighter that moves by itself is no load on
 * board, and those beyond the capacity left count as ships against the fleet pool. Nothing is waived: the capacity
 * check does not find them, and the fleet pool check finds more.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:ff2';

export const effect: ComponentEffect = { tier: 'passive', rule: '97.4' };
