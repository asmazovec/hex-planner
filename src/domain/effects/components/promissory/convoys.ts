/**
 * Trade Convoys (Emirates of Hacan, promissory note): "ACTION: Place this card faceup in your play area. While this
 * card is in your play area, you may negotiate transactions with players who are not your neighbor. If you activate a
 * system that contains 1 or more of the Hacan player's units, return this card to the Hacan player."
 *
 * Decided: `play` puts the note in the play area (`Holdings.inPlay`); from then on, whatever the round, it waives
 * `notNeighbor` (94.1) in every entry of its holder, because a note in the play area is asked by the waivers. In hand it
 * does nothing (Hacan note 4). When its holder activates a system holding units of the Hacan, `onActivate` returns it:
 * it leaves the holder's holdings and the play area and goes back to the Hacan. One transaction per player per turn
 * still stands (note 3).
 */
import { noteAddress } from '../../../components';
import { playerHolds } from '../../helpers/movement';
import '../../points/movement';
import { notesInPlay } from '../../points/rivals';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:convoys';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // Played, the note stays held and lies in the play area: nothing on the board changes.
  play: turn => {
    const { holdings } = turn.state;
    if (!(holdings.inPlay ??= []).includes(turn.id)) holdings.inPlay.push(turn.id);
  },
  onActivate: turn => {
    const { holdings } = turn.state;
    const hacan = noteAddress(turn.id);
    if (turn.owner !== turn.activator || hacan === undefined || hacan === turn.owner || !notesInPlay(holdings).includes(turn.id)) return;
    if (!playerHolds(turn.game, turn.shared, hacan, turn.systemId, turn.pack)) return;
    holdings.promissory = holdings.promissory.filter(held => held !== turn.id);
    holdings.inPlay = (holdings.inPlay ?? []).filter(held => held !== turn.id);
    const theirs = hacan === 'me' ? turn.shared : turn.shared.rivals?.[hacan];
    if (theirs && !theirs.holdings.promissory.includes(turn.id)) theirs.holdings.promissory.push(turn.id);
  },
  waive: [{ code: 'notNeighbor', rule: 'While this card is in your play area, you may negotiate transactions with players who are not your neighbor.' }],
};
