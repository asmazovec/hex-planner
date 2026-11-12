/**
 * Imperial Arms Vault (Hope's End, legendary planet): "You may exhaust this card at the end of your turn to place 1
 * mech from your reinforcements on any planet you control or draw 1 action card"
 *
 * To be a `play` effect: any entry of my turn names the card in `uses` with `choices.hopesend` = 'mech' and
 * `choices.hopesendPlanet`; the mech stands on that planet after the entry. The other branch draws an unknown card,
 * entered with `gains`, and changes nothing else.
 */
import { componentById } from '../../../components';
import { planetsOf, systemSlots } from '../../../replay/board';
import { unitLimitWarnings } from '../../../replay/production';
import { violation } from '../../../rules/registry';
import type { ChoiceContext, ComponentEffect, EffectTurn } from '../../types';

/** The card lies in the play area of whoever controls its planet (53.2, 53.3); used without it, it is warned of. */
const requireControl = (turn: EffectTurn, planet: string): void => {
  if (turn.state.control[planet] !== 'me') turn.warnings.push(violation('componentNotHeld', { id: turn.id, name: componentById(turn.pack, turn.id)?.name ?? turn.id }));
};
/** The planets of the map the player controls. */
const controlled = (ctx: ChoiceContext): string[] =>
  [...new Set(systemSlots(ctx.game).flatMap(slot => planetsOf(ctx.game, slot, ctx.pack)))].filter(planet => ctx.state.control[planet] === 'me');


export const id = 'legendary:hopesend';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    {
      key: 'hopesend', kind: 'option', label: { ru: 'Что сделать', en: 'Which' }, options: () => ['mech', 'card'],
      names: { mech: { ru: 'Мех', en: 'Mech' }, card: { ru: 'Карта действия', en: 'Action card' } },
    },
    { key: 'hopesendPlanet', kind: 'planet', options: controlled },
  ],
  play: turn => {
    requireControl(turn, 'hopesend');
    const planet = turn.choices.hopesendPlanet;
    // The other branch draws an unknown card, entered with the gains of the entry.
    if (turn.choices.hopesend !== 'mech' || typeof planet !== 'string') return;
    turn.warnings.push(...unitLimitWarnings(turn.state, { mech: 1 }, turn.pack));
    const ground = (turn.state.ground[planet] ??= {});
    ground.mech = (ground.mech ?? 0) + 1;
  },
};
