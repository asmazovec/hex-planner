/**
 * Military Support (Federation of Sol, promissory note): "At the start of the Sol player's turn: Remove 1 token from
 * the Sol player's strategy pool, if able, and return it to their reinforcements. Then, you may place 2 infantry from
 * your reinforcements on any planet you control. Then, return this card to the Sol player."
 *
 * Pass 1: a hint. Decided: `play`. The holder plays it as a component entry (choices.planet): 2 infantry from reinforcements
 * on that planet, which must be theirs; the Sol player loses 1 token of the strategy pool, if able. The card goes back to
 * the Sol player by the generic rule of notes that return (69.3). The timing (the start of the Sol player's turn) is not checked.
 */
import { noteAddress } from '../../../components';
import { placeOnPlanet } from '../../../replay/invasion';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:ms';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'planet', kind: 'planet' }],
  play: ({ id: noteId, held, choices, state, states, warnings }) => {
    if (!held) return;
    // "Remove 1 token from the Sol player's strategy pool, if able": an empty pool loses nothing.
    const owner = noteAddress(noteId);
    const sol = owner === undefined ? undefined : states[owner];
    if (sol && sol.strategy > 0) sol.strategy -= 1;
    if (typeof choices.planet === 'string') placeOnPlanet(state, choices.planet, { infantry: 2 }, warnings);
  },
};
