/**
 * Mirage Flight Academy (Mirage, legendary planet): "You may exhaust this card at the end of your turn to place up to 2
 * fighters from your reinforcements in any system that contains 1 or more of your ships"
 *
 * To be a `play` effect: any entry of my turn names the card in `uses` with `choices.mirageSystem` (a slot) and
 * `choices.mirageFighters` (1 or 2); the fighters stand in that space area after the entry.
 */
import { componentById } from '../../../components';
import { systemSlots } from '../../../replay/board';
import { violation } from '../../../rules/registry';
import type { ChoiceContext, ComponentEffect, EffectTurn } from '../../types';

/** The card lies in the play area of whoever controls its planet (53.2, 53.3); used without it, it is warned of. */
const requireControl = (turn: EffectTurn, planet: string): void => {
  if (turn.state.control[planet] !== 'me') turn.warnings.push(violation('componentNotHeld', { id: turn.id, name: componentById(turn.pack, turn.id)?.name ?? turn.id }));
};
/** The systems of the map where the player has a ship. */
const withShips = (ctx: ChoiceContext): string[] =>
  systemSlots(ctx.game).filter(slot => Object.values(ctx.state.systems[slot] ?? {}).some(count => count > 0));


export const id = 'legendary:mirage';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'mirageSystem', kind: 'system', options: withShips },
    { key: 'mirageFighters', kind: 'number', range: [0, 2], label: { ru: 'Истребитель', en: 'Fighter' } },
  ],
  play: turn => {
    requireControl(turn, 'mirage');
    const system = turn.choices.mirageSystem;
    const count = Number(turn.choices.mirageFighters ?? 0);
    if (typeof system !== 'string' || count <= 0) return;
    const space = (turn.state.systems[system] ??= {});
    space.fighter = (space.fighter ?? 0) + count;
  },
};
