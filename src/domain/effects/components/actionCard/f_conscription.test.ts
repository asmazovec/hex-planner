import { describe, expect, test } from 'vitest';
import type { Opponent, UnitCounts } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, FAR, HOME, NEAR, quote, TARGET, warningsOf } from '../kit';
import { id } from './f_conscription';

const RIVAL: Opponent = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };

/** My space dock on Home One; my ships by system; the Hacan cruiser in the target. */
const table = (units: Record<string, UnitCounts>) => {
  const play = componentAction(id);
  return {
    play,
    ...bench({
      faction: 'sol', expansions: ['pok'], units, start: { hand: [id] }, entries: [play],
      game: { docks: ['h1'], opponents: [RIVAL], enemyUnits: { [TARGET]: { [RIVAL.id]: { cruiser: 1 } } } },
    }),
  };
};

describe('actionCard:f_conscription Fighter Conscription', () => {
  // "ACTION: Place 1 fighter from your reinforcements in each system that contains 1 or more of your space docks or
  //  units that have capacity. They cannot be placed in systems that contain other players' ships."
  // Note 1 of the card: "Only one fighter will be placed in a system containing both a space dock and a ship with capacity."
  // Checks: home (dock and carrier) gets one fighter; a carrier next to home gets one; a cruiser (no capacity) none;
  // the carrier beside the Hacan cruiser none.
  // Why the check is redundant here: nothing is lifted; fighters are placed, not produced, so no production is asked.
  test('actionCard:f_conscription places one fighter in each system with my dock or my unit with capacity', () => {
    const card = table({ [HOME]: { carrier: 1 }, [NEAR]: { carrier: 1 }, [FAR]: { cruiser: 1 }, [TARGET]: { carrier: 1 } });
    quote(card.pack, id, 'Place 1 fighter from your reinforcements in each system that contains 1 or more of your space docks or units that have capacity.');
    const end = endOf(card);
    expect(end.systems[HOME]).toEqual({ carrier: 1, fighter: 1 });
    expect(end.systems[NEAR]).toEqual({ carrier: 1, fighter: 1 });
    expect(end.systems[FAR]).toEqual({ cruiser: 1 });
    expect(end.systems[TARGET]).toEqual({ carrier: 1 });
  });

  // "They cannot be placed in systems that contain other players' ships."
  // Checks: the carrier beside the Hacan cruiser gets no fighter, even alone.
  // Why the check is NOT redundant here: the card excludes systems with other players' ships.
  test('actionCard:f_conscription places no fighter where other players have ships', () => {
    const card = table({ [TARGET]: { carrier: 1 } });
    quote(card.pack, id, 'They cannot be placed in systems that contain other players\' ships.');
    expect(endOf(card).systems[TARGET]).toEqual({ carrier: 1 });
  });

  // Note 2 of the card: "A player may place a fighter in a system that is at its capacity limit. If they do so, they
  //  must then remove a fighter or ground force from the space area of that system."
  // Checks: a carrier full with six fighters (the Sol carrier carries six) gets a seventh; the capacity of the system is warned of and stands.
  // Why the check is NOT redundant here: the card places beyond capacity but does not lift it (16.3): one must go.
  test('actionCard:f_conscription into a full carrier leaves the capacity warning standing', () => {
    const card = table({ [NEAR]: { carrier: 1, fighter: 6 } });
    expect(endOf(card).systems[NEAR]).toEqual({ carrier: 1, fighter: 7 });
    expectStanding(warningsOf(card, card.play), 'capacitySystem');
  });

  test('actionCard:f_conscription is a play effect', () => {
    expect(effect(table({}).pack, id).tier).toBe('play');
  });
});
