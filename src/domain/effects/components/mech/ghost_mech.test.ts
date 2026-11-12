import { describe, expect, test } from 'vitest';
import { bench, effect, endOf, FAR, HOME, NEAR, quote, tactical, TARGET, using } from '../kit';
import { id } from './ghost_mech';

/** A Creuss mech stands in FAR; the entry activates TARGET with a cruiser from home. */
const activation = (named: boolean) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
  const entry = named ? using(move, id) : move;
  return { entry, ...bench({ faction: 'ghost', expansions: ['pok'], units: { [HOME]: { cruiser: 1 }, [FAR]: { mech: 1 } }, entries: [entry] }) };
};

describe('mech:ghost_mech Icarus Drive', () => {
  // "After any player activates a system, you may remove this unit from the game board to place or move a Creuss
  //  wormhole token into this system."
  // Checks: the activation names the mech; the one mech in FAR leaves the board.
  // Why the check is redundant here: a unit leaves the board when destroyed or by an ability; the mech removes itself.
  test('mech:ghost_mech named after an activation is removed from the board', () => {
    const table = activation(true);
    quote(table.pack, id, 'you may remove this unit from the game board to place or move a Creuss wormhole token into this system');
    expect(endOf(table).systems[FAR]?.mech ?? 0).toBe(0);
  });

  // Checks: an activation that does not name the mech leaves it where it stands.
  // Why the check is NOT redundant here: the ability is a "may"; it acts only when the player uses it.
  test('mech:ghost_mech not named, the mech stays', () => {
    expect(endOf(activation(false)).systems[FAR]?.mech).toBe(1);
  });

  test.todo('mech:ghost_mech places the alpha or the beta Creuss token in the system the mech was in (Creuss notes, Icarus Drive 2): `choices` exist on a component entry only, not on the activating entry that names the mech in `uses`');

  // Checks: the mech changes the board when named: a `play`.
  test('mech:ghost_mech is a play effect', () => {
    expect(effect(activation(false).pack, id).tier).toBe('play');
  });
});
