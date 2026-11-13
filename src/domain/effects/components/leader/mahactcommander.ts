/**
 * Il Na Viroset (Mahact, commander):
 * During your tactical actions: you can activate systems that contain your command tokens. If you do, return
 * both command tokens to your reinforcements and end your turn.
 *
 * A play, red in pass 1: named in `uses` of a tactical action into a system with my command token, it lifts
 * `systemHasToken`; both tokens return to the reinforcements and the turn ends.
 * Decided (pass 2): a waiver of `systemHasToken` for the action that names the commander, only while it is unlocked
 * (a locked one is not held and lifts nothing), and a `play` that takes the token of the active system off the board
 * when the activation was of a system that held one (the one that was there and the one just placed are the same
 * entry of the board). "End your turn" is not modelled: no code says an action after it is out of turn.
 */
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'leader:mahactcommander';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: ({ entry, state, held, warnings }) => {
    if (!held || entry.type !== 'tactical' || entry.systemId === null) return;
    const slot = entry.systemId;
    if (!warnings.some(w => w.code === 'systemHasToken' && w.params.systemId === slot)) return;
    state.tokensOnMap = state.tokensOnMap.filter(token => token !== slot);
  },
};

export const ability: Hooked = {
  holder: 'self',
  permit: [{
    code: 'systemHasToken',
    rule: 'you can activate systems that contain your command tokens.',
    when: (_warning, ctx) => ctx.had.card(id) === 'ready',
  }],
};
