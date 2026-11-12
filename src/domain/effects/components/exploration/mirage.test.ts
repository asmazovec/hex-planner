import { describe, expect, test } from 'vitest';
import { inForce } from '../../registry';
import type { Entry } from '../../../types';
import { bench, effect, endOf, HOME, NEAR, quote, tactical, using } from '../kit';
import { id } from './mirage';

const explore = (named = true): Entry => {
  const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
  return named ? using(move, id) : move;
};
const table = (move: Entry) => bench({ faction: 'sol', expansions: ['pok'], units: { [HOME]: { carrier: 1 } }, entries: [move] });

describe('exploration:mirage Mirage', () => {
  // "Place the Mirage planet token in this system. Gain the Mirage planet card and ready it."
  // Checks: after the explore that names the card, I control the planet Mirage, readied.
  // Why this is automated: control of planets is what the plan counts for resources, influence and legendary cards;
  // the card gives control by itself, without a landing (no check of the landing applies, none is waived).
  test('exploration:mirage gives control of the planet Mirage, readied', () => {
    const mirage = table(explore());
    quote(mirage.pack, id, 'Gain the Mirage planet card and ready it.');
    const end = endOf(mirage);
    expect(end.control.mirage).toBe('me');
    expect(end.exhausted).not.toContain('mirage');
  });

  // LRR 53.2: "When a player gains control of a legendary planet, they also place its legendary planet ability card in
  //  their play area."
  // Checks: with the planet comes Mirage Flight Academy, in force for me.
  test('exploration:mirage brings Mirage Flight Academy into force', () => {
    const mirage = table(explore());
    expect(inForce(mirage.pack, mirage.game, endOf(mirage))).toContain('legendary:mirage');
  });

  // Checks: a tactical action that does not name the card gives no planet.
  // Why the control is NOT changed here: nothing was explored.
  test('exploration:mirage not explored, Mirage is nobody\'s', () => {
    const plain = table(explore(false));
    expect(endOf(plain).control.mirage).toBeUndefined();
    expect(inForce(plain.pack, plain.game, endOf(plain))).not.toContain('legendary:mirage');
  });

  test.todo('exploration:mirage the Mirage token stands in the explored system, so units can land on it: the systems take their planets from their tiles only');

  test('exploration:mirage is a play effect', () => {
    const { pack } = table(explore());
    expect(effect(pack, id).tier).toBe('play');
  });
});
