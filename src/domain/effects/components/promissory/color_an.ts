/**
 * Alliance (promissory note, Prophecy of Kings): "When you receive this card, if you are not the <color> player, you
 * must place it faceup in your play area. While this card is in your play area, you can use the <color> player's
 * commander ability, if it is unlocked. When you activate a system that contains 1 or more of the <color> player's
 * units, return this card to the <color> player."
 *
 * To be `passive` with an automatic return: while I hold another player's Alliance, their commander, if they have it
 * unlocked, is in force for me as if it were mine, so whatever it modifies or waives holds for my entries; activating
 * a system with any unit of the owner returns the card (promissory notes, Alliance 2, 4).
 */
import { noteAddress, noteBase } from '../../../components';
import { planetsOf } from '../../../replay/board';
import type { ComponentEffect, EffectTurn } from '../../types';

/** Whether the player of `owner` has a unit, a structure included, in the system activated: ships, ground forces, docks or PDS. */
const hasUnitsIn = (turn: EffectTurn, owner: string, slot: string): boolean => {
  const theirs = turn.states[owner];
  if (!theirs) return false;
  const any = (counts: Record<string, number> | undefined): boolean => Object.values(counts ?? {}).some(count => count > 0);
  return any(theirs.systems[slot]) || planetsOf(turn.game, slot, turn.pack).some(planet =>
    any(theirs.ground[planet]) || theirs.docks.includes(planet) || (theirs.pds[planet] ?? 0) > 0);
};

/** When the player activates a system with units of the owner of a note they hold, the note goes back to its owner; `onReturn` is what else happens. */
const returnOnActivation = (turn: EffectTurn, onReturn: () => void): void => {
  if (turn.entry.type !== 'tactical' || turn.entry.systemId === null) return;
  const slot = turn.entry.systemId;
  for (const note of [...turn.state.holdings.promissory]) {
    const owner = noteAddress(note);
    if (noteBase(note) !== noteBase(turn.id) || owner === undefined || owner === turn.player || !hasUnitsIn(turn, owner, slot)) continue;
    turn.state.holdings.promissory = turn.state.holdings.promissory.filter(held => held !== note);
    const theirs = turn.states[owner];
    if (theirs && !theirs.holdings.promissory.includes(note)) theirs.holdings.promissory.push(note);
    onReturn();
  }
};



export const id = 'promissory:<color>_an';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // The owner's unlocked commander is in force for the holder (`holderOf`, `Holder.others`); the card goes back on activation.
  restrict: turn => returnOnActivation(turn, () => undefined),
};
