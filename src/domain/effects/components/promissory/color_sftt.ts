/**
 * Support for the Throne (promissory note): "When you receive this card, if you are not the <color> player, you must
 * place it faceup in your play area and gain 1 victory point. When you activate a system that contains 1 or more of
 * the <color> player's units, or if the <color> player is eliminated, lose 1 victory point and return this card to
 * the <color> player."
 *
 * To be automatic, with no choice: the plan counts victory points (`vp`) and holdings. Receiving another player's note
 * in the plan (a transaction, `gains`) gives 1 point; activating a system that holds any unit of its owner, structures
 * alone included (promissory notes, Support for the Throne 2, 4), takes the point back and returns the card. A note
 * held when the plan begins is already in the points entered by hand.
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



export const id = 'promissory:<color>_sftt';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // Received in a transaction, from another player: faceup in my play area, and 1 victory point.
  dealt: turn => {
    for (const note of turn.got.components ?? []) {
      if (noteBase(note) === id && noteAddress(note) !== turn.self) turn.state.vp += 1;
    }
  },
  // Activating a system with the owner's units: lose the point and return the card.
  restrict: turn => returnOnActivation(turn, () => { turn.state.vp -= 1; }),
};
