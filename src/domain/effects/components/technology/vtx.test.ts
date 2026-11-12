import { describe, expect, test } from 'vitest';
import { bench, componentAction, effect, expectStanding, quote, warningsOf } from '../kit';
import { id } from './vtx';

const cabal = (entries: ReturnType<typeof componentAction>[]) =>
  bench({ faction: 'cabal', expansions: ['pok'], start: { technologies: [id] }, entries });

describe('technology:vtx Vortex', () => {
  // "ACTION: Exhaust this card to choose another player's non-structure unit in a system that is adjacent to 1 or more
  //  of your space docks. Capture 1 unit of that type from that player's reinforcements."
  // Checks: the technology is a reminder of the component action.
  // Why nothing is validated here: other players' reinforcements and captured units are not counted by the plan.
  test('technology:vtx is a hint of the component action', () => {
    const { pack } = cabal([]);
    quote(pack, id, 'Capture 1 unit of that type from that player\'s reinforcements');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['component']);
  });

  // "Exhaust this card ..." LRR 34.1: an exhausted card cannot be used until readied.
  // Checks: the action exhausts the card, so a second action in the same round is warned of.
  // Why the check is NOT redundant here: the card is used once per round, until the status phase readies it.
  test('technology:vtx is exhausted by its action: a second one in the round is warned of', () => {
    const again = componentAction(id);
    const table = cabal([componentAction(id), again]);
    expectStanding(warningsOf(table, again), 'componentExhausted');
  });

  test.todo('technology:vtx captures a unit from another player\'s reinforcements: captured units are not modelled');
});
