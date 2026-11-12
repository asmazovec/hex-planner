/**
 * The Acropolis (Emelpar, Thunder's Edge): "You may exhaust this card at the end of your turn to ready another
 * component that isn't a strategy card."
 *
 * Decided: `play`. Named in the `uses` of an entry with the choice `ready` (a component of the owner that is
 * exhausted), it readies that component after the entry: an agent is unlocked again, a breakthrough held, any other
 * card taken off `exhausted`. Never itself ("another"): the card the replay exhausted for this use stays exhausted.
 * The `play` also checks LRR 53.3 with 53.2: the card lies in the play area of whoever controls Emelpar.
 *
 * Not modelled: a component in another player's play area (Acropolis note 1); the plan readies the owner's holdings only.
 */
import { componentById, componentsOf } from '../../../components';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';

export const id = 'legendary:emelpar';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'ready',
    kind: 'component',
    label: { ru: 'Подготовить с The Acropolis', en: 'Ready with The Acropolis' },
    options: ({ state, pack, game }) => {
      const { holdings } = state;
      const exhausted = Object.entries(holdings.leaders).flatMap(([leader, mode]) => (mode === 'exhausted' ? [leader] : []));
      const breakthrough = holdings.breakthrough === 'exhausted'
        ? componentsOf(pack).filter(def => def.kind === 'breakthrough' && def.faction === game.faction).map(def => def.id)
        : [];
      return [...exhausted, ...breakthrough, ...holdings.exhausted].filter(component => component !== id && componentById(pack, component) !== undefined);
    },
  }],
  play: turn => {
    const { state, choices, pack } = turn;
    if (state.control.emelpar !== 'me') turn.warnings.push(violation('componentNotHeld', { id, name: componentById(pack, id)?.name ?? id }));
    const ready = typeof choices.ready === 'string' ? choices.ready : undefined;
    const def = ready === undefined ? undefined : componentById(pack, ready);
    if (ready === undefined || def === undefined || ready === id) return;
    const { holdings } = state;
    if (def.kind === 'leader') {
      if (holdings.leaders[ready] === 'exhausted') holdings.leaders[ready] = 'unlocked';
    } else if (def.kind === 'breakthrough') {
      if (holdings.breakthrough === 'exhausted') holdings.breakthrough = 'held';
    } else holdings.exhausted = holdings.exhausted.filter(component => component !== ready);
  },
};
