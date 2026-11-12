/**
 * Il Na Viroset (Mahact, commander):
 * During your tactical actions: you can activate systems that contain your command tokens. If you do, return
 * both command tokens to your reinforcements and end your turn.
 *
 * A play, red in pass 1: named in `uses` of a tactical action into a system with my command token, it lifts
 * `systemHasToken`; both tokens return to the reinforcements and the turn ends.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:mahactcommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['activation'] };
