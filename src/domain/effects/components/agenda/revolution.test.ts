import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import { adjust, bench, effect, endOf, HOME, primary, quote, warningsOf } from '../kit';
import { id } from './revolution';

const law = () => ({ ...adjust({}, 'agenda'), gains: [id] });

describe('agenda:revolution Anti-Intellectual Revolution', () => {
  // "For: After a player researches a technology, that player must destroy 1 of their non-fighter ships."
  // Checks: the law is a reminder at the step where research is chosen (the Technology card), with no waiver and no
  // number changed.
  // Why the check is NOT redundant here: there is no check to lift. The law adds a duty (choose a ship and destroy it)
  // that the player enters as a loss; the plan forbids nothing and chooses no ship for them.
  test('agenda:revolution is a reminder where research is chosen', () => {
    const table = bench({ faction: 'sol' });
    quote(table.pack, id, 'that player must destroy 1 of their non-fighter ships');
    expect(effect(table.pack, id)).toMatchObject({ tier: 'hint', hintAt: ['card'] });
  });

  // LRR 7.3 with the card: a law passed "For" stays in play.
  // Checks: once passed, the law is in play, and research under it leaves the ships where they are: the plan does not
  // destroy a ship it was not told to.
  // Why the check is NOT redundant here: which ship goes is the player's choice (Anti-Intellectual Revolution note 1:
  // a player that gains a technology directly is unaffected), so nothing is removed by itself.
  test('agenda:revolution in play destroys no ship by itself after research', () => {
    const research = primary(CARD.technology, { researched: ['technology:dacxive'] });
    const table = bench({ faction: 'sol', units: { [HOME]: { cruiser: 1 } }, rounds: [[law()], [research]] });
    expect(endOf(table).laws).toContain(id);
    expect(endOf(table).systems[HOME]).toEqual({ cruiser: 1 });
    expect(warningsOf(table, research).filter(w => w.waivedBy)).toEqual([]);
  });

  test.todo('agenda:revolution "Against" exhausts a planet per technology at the next strategy phase: a one-off choice of planets, not modelled');
});
