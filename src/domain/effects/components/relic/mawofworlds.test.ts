import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, quote, using } from '../kit';
import { id } from './mawofworlds';

/** Fleet Logistics asks two propulsion technologies, which I do not have. */
const TECH = 'technology:fl';
/** The entry of the agenda phase that uses the Maw and gains the technology. */
const maw = (): Entry => ({ ...using(adjust({}, 'agenda'), id), gains: [TECH] });
const table = (entries: Entry[]) => bench({
  faction: 'sol', expansions: ['pok'], start: { relics: [id] }, entries, game: { planetControl: { h1: 'me', h2: 'me', t1: 'me' } },
});

describe('relic:mawofworlds Maw of Worlds', () => {
  // "At the start of the agenda phase, you may purge this card and exhaust all of your planets to gain any 1 technology."
  // Checks: the entry that uses the Maw exhausts every planet I control.
  // Why it is counted here: a play; the planets exhausted are the board's, and an exhausted planet pays nothing.
  test.fails('relic:mawofworlds exhausts every planet I control', () => {
    const relic = table([maw()]);
    quote(relic.pack, id, 'you may purge this card and exhaust all of your planets to gain any 1 technology');
    expect([...endOf(relic).exhausted].sort()).toEqual(['h1', 'h2', 't1']);
  });

  // Maw of Worlds note 1: "The player does not have to meet the prerequisites of the technologies they acquire using
  //  Maw of Worlds."
  // Checks: the technology gained with the Maw is held, and the relic is purged.
  // Why the check is redundant here: the technology is gained, not researched, so no prerequisite is asked of it.
  test('relic:mawofworlds the technology is gained and the relic purged', () => {
    const end = endOf(table([maw()]));
    expect(end.holdings.technologies).toContain(TECH);
    expect(end.holdings.relics).not.toContain(id);
  });

  test.todo('relic:mawofworlds "At the start of the agenda phase": the plan does not order the steps of the agenda phase');

  test.fails('relic:mawofworlds is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
