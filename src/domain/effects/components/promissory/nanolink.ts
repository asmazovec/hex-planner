/**
 * Nano-Link Permit (Ral Nel Consortium, promissory note): "After you activate a system: You may move your structures
 * from adjacent systems that do not contain your command tokens onto planets you control in the active system. Then,
 * return this card to the Ral Nel player."
 *
 * Decided: a `play` waiver. The holder names the note in the tactical action's `uses`; the structures it moves are
 * entered as a structure taken from a planet of an adjacent system (`moves[].structures`) and put on a planet of the
 * active system (`landings[].structures`). The rules forbid moving a structure (85.3, `structureAboard`); the note lifts
 * that check for a structure whose source system is adjacent to the active one and holds no command token of the
 * holder. The structures are moved directly, not transported (Ral Nel, Nano-Link Permit note 2), so no ship is needed.
 * Placing only on a planet the holder controls stays checked (`structureNotControlled`); the note goes back to the Ral
 * Nel player after it is played (69.3), which the replay already does for every note that says so.
 *
 */
import structureAboard from '../../../rules/codes/structureAboard';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:nanolink';

const RULE = 'You may move your structures from adjacent systems that do not contain your command tokens onto planets you control in the active system.';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

/** Playing the note changes nothing on the board: what it lifts is the waiver above. */
export const ability: Hooked = {
  holder: 'self',
  permit: [{
    code: structureAboard.code,
    rule: RULE,
    when: (warning, ctx) => {
      const from = String(warning.params.from);
      const { entry } = ctx;
      return entry?.type === 'tactical' && entry.systemId !== null && from !== entry.systemId && ctx.adjacent(entry.systemId).includes(from) && !ctx.before.systems[from]?.tokens.includes(ctx.holder);
    },
  }],
  play: () => [],
};
