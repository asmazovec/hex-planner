import { describe, expect, test } from 'vitest';
import { hintsAt } from '../../registry';
import { bench, componentAction, effect, endOf, quote, warningsOf } from '../kit';
import { id } from './arch_expedition';

const holding = (hand: string[], entries = [] as ReturnType<typeof componentAction>[]) =>
  bench({ faction: 'sol', expansions: ['pok'], start: { hand }, entries });

describe('actionCard:arch_expedition Archaeological Expedition', () => {
  // "Reveal the top 3 cards of an exploration deck that matches a planet you control; gain any relic fragments that
  //  you reveal and discard the rest."
  // Checks: the card is a hint of the component action and lifts nothing.
  // Why nothing is validated here: what the deck reveals is chance, and the plan counts no relic fragments.
  test('actionCard:arch_expedition is a hint of the component action', () => {
    const { pack } = holding([]);
    quote(pack, id, 'gain any relic fragments that you reveal and discard the rest');
    expect(effect(pack, id)).toMatchObject({ tier: 'hint', rule: id, hintAt: ['component'] });
  });

  // LRR 2.6.1: an action card headed "Action" is resolved as a component action.
  // Checks: the component action that plays it, with a fragment entered as gained, makes no warning and discards the
  // card; held in hand the card is reminded at the component action.
  // Why nothing is validated here: the play of an action card from the hand is all the replay knows of it.
  test('actionCard:arch_expedition played as a component action leaves the hand with no warning', () => {
    const play = componentAction(id, { gains: ['exploration:crf1'] });
    const table = holding([id], [play]);
    expect(warningsOf(table, play)).toEqual([]);
    expect(endOf(table).holdings.hand).not.toContain(id);
    const held = holding([id]);
    expect(hintsAt(held.pack, endOf(held), 'component', ['me']).map(c => c.id)).toContain(id);
  });
});
