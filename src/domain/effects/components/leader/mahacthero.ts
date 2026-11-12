/**
 * Airo Shir Aur, Benediction (Mahact, hero):
 * ACTION: Move all units in the space area of any system to an adjacent system that contains a different
 * player's ships. Space combat is resolved in that system. neither player can retreat or resolve abilities that
 * would move their ships. Then, purge this card.
 *
 * A play, red in pass 1: the component action moves every unit of the space area of one system to an adjacent one
 * that holds another player's ships (`choices.from`, `choices.to`); the replay already purges the hero.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:mahacthero';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['component'] };
