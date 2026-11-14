import { describe, expect, test } from 'vitest';
import type { Entry, Game } from '../../../types';
import { bench, componentAction, effect, endOf, expectStanding, quote, warningsOf } from '../kit';
import { id } from './nanomachines';

/** The first ability: the PDS goes on the planet named in `choices.pds`. */
const placePds = (planet: string): Entry => componentAction(id, { choices: { pds: planet } } as Partial<Entry>);
const ralnel = (entries: Entry[], game: Partial<Game> = {}, faction = 'ralnel', technologies = [id]) =>
  bench({ faction, expansions: ['te'], start: { technologies }, entries, game: { planetControl: { h1: 'me' }, ...game } });

describe('technology:nanomachines Nanomachines', () => {
  // "ACTION: Exhaust this card to place 1 PDS on a planet you control."
  // Checks: the component action with the planet h1 chosen places a PDS on h1.
  // Why this is counted: PDS are counted by the plan (structures, the limits of a planet and of the reinforcements);
  // the technology places one outside the Construction card (24.2), so its play must do it.
  test('technology:nanomachines places a PDS on the planet chosen', () => {
    const table = ralnel([placePds('h1')]);
    quote(table.pack, id, 'Exhaust this card to place 1 PDS on a planet you control');
    expect(endOf(table).pds.h1).toBe(1);
  });

  // "... on a planet you control."
  // Checks: a PDS placed on t1, which I do not control, is warned of.
  // Why the check is NOT redundant here: the technology places on a planet the player controls only.
  test('technology:nanomachines a PDS placed on a planet I do not control is warned of', () => {
    const entry = placePds('t1');
    expectStanding(warningsOf(ralnel([entry]), entry), 'structureNotControlled');
  });

  // LRR 85.5: a planet holds at most two PDS.
  // Checks: a third PDS on h1 is warned of, and still placed as entered elsewhere would be.
  // Why the check is NOT redundant here: the technology places a PDS, it does not lift the limit of a planet.
  test('technology:nanomachines a third PDS on a planet is warned of', () => {
    const entry = placePds('h1');
    expectStanding(warningsOf(ralnel([entry], { pds: { h1: 2 } }), entry), 'structureLimit');
  });

  // "ACTION: Exhaust this card to ..." Ruling (Nanomachines note 1): "they perform only one of the three component
  //  actions listed on the card."
  // Checks: the card is exhausted by its first use, so a second use in the same round is warned of.
  // Why the check is NOT redundant here: each ability exhausts the same card; the status phase readies it (34.2).
  test('technology:nanomachines is exhausted by one use: a second use in the round is warned of', () => {
    const again = componentAction(id);
    const table = ralnel([placePds('h1'), again]);
    quote(table.pack, id, 'Exhaust this card to repair all of your damaged units');
    expect(endOf(table).holdings.exhausted).toContain(id);
    expectStanding(warningsOf(table, again), 'componentExhausted');
  });

  // Checks: a player who has not researched Nanomachines is warned that they do not hold it.
  // Why the check is NOT redundant here: the ability is the technology's own.
  test('technology:nanomachines not researched is warned of when played', () => {
    const entry = placePds('h1');
    expectStanding(warningsOf(ralnel([entry], {}, 'ralnel', []), entry), 'componentNotHeld');
  });

  // "ACTION: Exhaust this card to repair all of your damaged units. ACTION: Exhaust this card and discard 1 action card
  //  to draw 1 action card."
  // Checks: these two only exhaust the card; nothing else of the board changes.
  // Why nothing is validated: the plan counts no damage, and the cards discarded and drawn are entered by the player
  // in «Taken and discarded» like any other.
  test('technology:nanomachines the repair and the draw only exhaust the card', () => {
    const table = ralnel([componentAction(id)]);
    quote(table.pack, id, 'discard 1 action card to draw 1 action card');
    const end = endOf(table);
    expect(end.holdings.exhausted).toContain(id);
    expect(end.pds).toEqual({});
  });


  test('technology:nanomachines is a play effect', () => {
    const { pack } = ralnel([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
