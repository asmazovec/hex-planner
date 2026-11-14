import { describe, expect, test } from 'vitest';
import type { StartHoldings } from '../../../types';
import type { Entry } from '../../../../testing/old/domain/types';
import type { Player } from '../../../players';
import { bench, effect, endOf, expectStanding, expectWaived, FAR, FARTHER, HOME, planned, quote, TARGET, warningsOf } from '../kit';
import { id } from './keleresbt';

const MECATOL_TILE = '18';
const RIVAL: Player = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };

/** A turn whose only act is a transaction of nothing with o1. */
const deal = (): Entry => planned({ type: 'pass', acts: [{ kind: 'transaction', with: 'o1', give: {}, get: {} }] }, 'action');

/**
 * Mecatol Rex lies in the target slot. My carrier is at home, three systems from the rival's cruiser at `rival`, so we
 * are not neighbours by the board.
 */
const table = (rival: string, start: StartHoldings = { breakthrough: 'held' }, entries: Entry[] = [deal()]) => ({
  last: entries[entries.length - 1],
  ...bench({
    faction: 'keleresm', expansions: ['pok', 'te'], units: { [HOME]: { carrier: 1 } }, start, entries,
    game: { opponents: [RIVAL], enemyUnits: { [rival]: { o1: { cruiser: 1 } } }, map: { [HOME]: 'r-home', '1,0': 'r-empty', [TARGET]: MECATOL_TILE, [FAR]: 'r-empty', [FARTHER]: 'r-empty' } },
  }),
});

describe('breakthrough:keleresbt I.I.H.Q. Modernization', () => {
  // "You are neighbors with all players that have units or control planets in or adjacent to the Mecatol Rex system."
  // Checks: the rival's cruiser stands next to Mecatol Rex, far from my units; the transaction with them is warned of
  // as not between neighbours, and the warning is lifted by the breakthrough.
  // Why the check is redundant here: LRR 94.1 allows transactions with neighbours only, and neighbours are found by
  // the board (60.1); the breakthrough makes this player my neighbour whatever the board says.
  test('breakthrough:keleresbt a player next to Mecatol Rex is a neighbour: the transaction warning is waived', () => {
    const keleres = table(FAR);
    quote(keleres.pack, id, 'You are neighbors with all players that have units or control planets in or adjacent to the Mecatol Rex system.');
    expectWaived(warningsOf(keleres, keleres.last), 'notNeighbor', id);
  });

  // LRR 94.1: a player can resolve transactions only with their neighbours.
  // Checks: a rival two systems from Mecatol Rex is no neighbour of mine, breakthrough or not.
  // Why the check is NOT redundant here: the breakthrough covers players in or adjacent to the Mecatol Rex system.
  test('breakthrough:keleresbt a player away from Mecatol Rex is still no neighbour', () => {
    const keleres = table(FARTHER);
    expectStanding(warningsOf(keleres, keleres.last), 'notNeighbor');
  });

  // LRR 60.1: two players are neighbours if they have units or control planets in the same or adjacent systems.
  // Checks: without the breakthrough held, the rival beside Mecatol Rex is no neighbour.
  // Why the check is NOT redundant here: the breakthrough is gained, not printed on the sheet; it is not in force.
  test('breakthrough:keleresbt not held: the player beside Mecatol Rex is no neighbour', () => {
    const keleres = table(FAR, {});
    expectStanding(warningsOf(keleres, keleres.last), 'notNeighbor');
  });

  // "When you gain this card, gain the Custodia Vigilia planet card and its legendary planet ability card."
  // Ruling (Keleres, Custodia Vigilia 1): "The Custodia Vigilia planet card is gained exhausted."
  // Checks: an entry that gains the breakthrough gives me control of Custodia Vigilia, exhausted.
  // Why the default count does not apply: a planet is otherwise gained by landing on it (25.1); this one is gained
  // by the card and lies on no tile.
  test('breakthrough:keleresbt gained, it brings the Custodia Vigilia planet, exhausted', () => {
    const gaining = { ...planned({ type: 'component', note: '' }, 'action'), gains: [id] } as Entry;
    const end = endOf(table(FAR, {}, [gaining]));
    expect(end.holdings.breakthrough).toBe('held');
    expect(end.control.custodiavigilia).toBe('me');
    expect(end.exhausted).toContain('custodiavigilia');
  });

  test('breakthrough:keleresbt is a passive effect that waives the neighbour check', () => {
    const { pack } = table(FAR);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual(['notNeighbor']);
  });
});
