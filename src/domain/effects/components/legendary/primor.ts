/**
 * The Atrament (Primor, legendary planet): "You may exhaust this card at the end of your turn to place up to 2 infantry
 * from your reinforcements on any planet you control"
 *
 * To be a `play` effect: any entry of my turn names the card in `uses` (the replay exhausts it, its text says so) with
 * `choices.primorPlanet` and `choices.primorInfantry` (1 or 2); the infantry stand on that planet after the entry.
 * The card is played only by the player who controls Primor (53.3).
 */
import { componentById } from '../../../components';
import { planetsOf, systemSlots } from '../../../replay/board';
import { violation } from '../../../rules/registry';
import type { ChoiceContext, ComponentEffect, EffectTurn } from '../../types';

/** The card lies in the play area of whoever controls its planet (53.2, 53.3); used without it, it is warned of. */
const requireControl = (turn: EffectTurn, planet: string): void => {
  if (turn.state.control[planet] !== 'me') turn.warnings.push(violation('componentNotHeld', { id: turn.id, name: componentById(turn.pack, turn.id)?.name ?? turn.id }));
};
/** The planets of the map the player controls. */
const controlled = (ctx: ChoiceContext): string[] =>
  [...new Set(systemSlots(ctx.game).flatMap(slot => planetsOf(ctx.game, slot, ctx.pack)))].filter(planet => ctx.state.control[planet] === 'me');


export const id = 'legendary:primor';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'primorPlanet', kind: 'planet', options: controlled },
    { key: 'primorInfantry', kind: 'number', range: [0, 2], label: { ru: 'Пехота', en: 'Infantry' } },
  ],
  play: turn => {
    requireControl(turn, 'primor');
    const planet = turn.choices.primorPlanet;
    const count = Number(turn.choices.primorInfantry ?? 0);
    if (typeof planet !== 'string' || count <= 0) return;
    const ground = (turn.state.ground[planet] ??= {});
    ground.infantry = (ground.infantry ?? 0) + count;
  },
};
