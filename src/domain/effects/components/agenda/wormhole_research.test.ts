import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import { adjust, bench, effect, endOf, FARTHER, HOME, NEAR, quote, TARGET } from '../kit';
import { id } from './wormhole_research';

/** The agenda resolved in the agenda phase of round 1, with the outcome that received the most votes. */
const resolved = (outcome: 'for' | 'against', extra: Partial<Entry> = {}): Entry =>
  ({ ...adjust({}, 'agenda'), gains: [id], choices: { outcome }, ...extra } as Entry);

/** Alpha in the next system, beta at the far end; my cruisers in both, a carrier at home and a destroyer in the target. */
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-alpha', [TARGET]: 'r-empty', '3,0': 'r-empty', [FARTHER]: 'r-beta' };
const table = (agenda: Entry) => bench({
  faction: 'sol', game: { map: MAP },
  units: { [NEAR]: { cruiser: 1, fighter: 1 }, [FARTHER]: { cruiser: 2 }, [HOME]: { carrier: 1 }, [TARGET]: { destroyer: 1 } },
  rounds: [[agenda]],
});

describe('agenda:wormhole_research Wormhole Research', () => {
  // "For: ... Then, destroy all ships in systems that contain an alpha or beta wormhole."
  // Checks: my ships in the alpha and the beta systems are destroyed; those elsewhere stay.
  // Why: a directive changes the board once (7.8), and the ships are what the plan counts.
  test.fails('agenda:wormhole_research For destroys every ship in the alpha and beta systems', () => {
    const t = table(resolved('for'));
    quote(t.pack, id, 'Then, destroy all ships in systems that contain an alpha or beta wormhole.');
    const end = endOf(t);
    expect(end.systems[NEAR] ?? {}).toEqual({});
    expect(end.systems[FARTHER] ?? {}).toEqual({});
    expect(end.systems[HOME]).toEqual({ carrier: 1 });
    expect(end.systems[TARGET]).toEqual({ destroyer: 1 });
  });

  // "For: Each player who has 1 or more ships in a system that contains a wormhole may research 1 technology."
  // Checks: the technology researched is entered in the agenda entry's gains and is then held (90.9).
  // Why nothing is validated: research outside the Technology card is entered as gains, which forbid nothing.
  test('agenda:wormhole_research the technology it lets research is entered as a gain of the entry', () => {
    const t = table(resolved('for', { gains: [id, 'technology:gd'] }));
    expect(endOf(t).holdings.technologies).toContain('technology:gd');
  });

  // "Against: Each player that voted "Against" removes 1 command token from their command sheet ..."
  // Checks: the Against outcome destroys nothing.
  // Why nothing is counted: who voted is not in the plan; a token lost is entered by hand in the same entry.
  test('agenda:wormhole_research Against destroys no ship', () => {
    expect(endOf(table(resolved('against'))).systems[NEAR]).toEqual({ cruiser: 1, fighter: 1 });
  });

  // LRR 7.8: a directive is discarded once resolved.
  test('agenda:wormhole_research leaves nothing in play', () => {
    expect(endOf(table(resolved('for'))).laws ?? []).not.toContain(id);
  });

  test.fails('agenda:wormhole_research is played by the agenda entry that resolves it', () => {
    expect(effect(table(resolved('for')).pack, id).tier).toBe('play');
  });
});
