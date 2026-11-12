/**
 * Repeal Law (action card, Action): "Discard 1 law from play."
 *
 * Pass 2 makes it a `play` with the choice `law`: that law leaves play for the whole game, as a law in `spends`
 * already does. Without a law in play the card cannot be resolved (tirules2 ruling 1): `componentUnresolved` (2.6.1).
 * Written in pass 2.
 */
import { componentById } from '../../../components';
import { violation } from '../../../rules/registry';
import componentUnresolved from '../../../rules/codes/componentUnresolved';
import type { ComponentEffect, EffectTurn } from '../../types';

export const id = 'actionCard:repeal';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'law', kind: 'component', options: ({ shared }) => [...(shared.laws ?? [])] }],
  play: turn => {
    if (turn.choices.law === undefined) return;
    const law = String(turn.choices.law);
    const laws = turn.shared.laws ?? [];
    // tirules2, Repeal Law 1: a law must be in play.
    if (!laws.includes(law)) return unresolved(turn, 'the law is not in play');
    laws.splice(laws.indexOf(law), 1);
    if (turn.shared.lawOwners) delete turn.shared.lawOwners[law];
    for (const [planetId, cards] of Object.entries(turn.shared.attachments ?? {})) turn.shared.attachments![planetId] = cards.filter(card => card !== law);
  },
};

const unresolved = (turn: EffectTurn, reason: string): void => {
  turn.warnings.push(violation(componentUnresolved.code, { id: turn.id, name: componentById(turn.pack, turn.id)?.name ?? turn.id, reason }));
};
