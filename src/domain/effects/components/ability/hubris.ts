/**
 * Hubris (Mahact, ability):
 * During setup, purge your "Alliance" promissory note. Other players cannot give you their 'Alliance" promissory
 * note.
 *
 * Mixed, red in pass 1: the Mahact player begins without their own Alliance (setup), and receiving another player's
 * Alliance in a transaction is warned of. Both are restrictions, not waivers.
 * Decided (pass 2): the second half is a `dealt` hook of the receiver: an Alliance note of another player among what
 * the Mahact player got is warned of with `noteRefused` (it still changes hands: the plan forbids nothing). The setup
 * purge is the deal of the start (`startForFaction`, a shared file): it is left to the holdings.
 */
import noteRefused from '../../../rules/codes/noteRefused';
import { componentById, noteAddress, noteBase } from '../../../components';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'ability:hubris';

const ALLIANCE = 'promissory:<color>_an';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  dealt: turn => {
    for (const note of turn.got.components ?? []) {
      if (noteBase(note) !== ALLIANCE || noteAddress(note) === turn.self) continue;
      turn.warnings.push(violation(noteRefused.code, { id: note, name: componentById(turn.pack, note)?.name ?? note }));
    }
  },
};
