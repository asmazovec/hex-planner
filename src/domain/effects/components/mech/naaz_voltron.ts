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
import { sourceSlot } from '../../../replay/board';
import type { Warning } from '../../../types';
import type { ComponentEffect, WaiverContext } from '../../types';

export const id = 'mech:naaz_voltron';

const RULE = 'This unit is both a ship and ground force.';

/** Only the Naaz-Rokha, and only once Absolute Synergy is gained (held stands for flipped). */
const flipped = (ctx: WaiverContext): boolean => ctx.game.faction === 'naaz' && !!ctx.before.holdings.breakthrough;

/** The load without one mech (the one that is a ship) fits the capacity. */
const fitsWithout = (warning: Warning, mechs: number, ctx: WaiverContext): boolean => {
  if (!flipped(ctx) || mechs < 1) return false;
  const place = ctx.pack.units.mech?.capacityUsed ?? 1;
  return Number(warning.params.load) - place <= Number(warning.params.capacity);
};

const mechsOfGroup = (from: string, ctx: WaiverContext): number => {
  const { entry, game, pack } = ctx;
  if (entry?.type !== 'tactical') return 0;
  return entry.moves.filter(move => (move.pickupOf ?? sourceSlot(game, pack, move.from)) === from).reduce((sum, move) => sum + (move.units.mech ?? 0), 0);
};

const mechsInSpace = (systemId: string, ctx: WaiverContext): number => {
  const { entry, after } = ctx;
  const there = after.systems[systemId]?.mech ?? 0;
  if (entry?.type !== 'tactical' || entry.systemId !== systemId) return there;
  return there + entry.landings.reduce((sum, landing) => sum + (landing.units.mech ?? 0), 0) + (entry.losses?.mech ?? 0);
};

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [
    { code: 'capacityGroup', rule: RULE, when: (warning, ctx) => fitsWithout(warning, mechsOfGroup(String(warning.params.from), ctx), ctx) },
    { code: 'capacitySystem', rule: RULE, when: (warning, ctx) => fitsWithout(warning, mechsInSpace(String(warning.params.systemId), ctx), ctx) },
  ],
};
