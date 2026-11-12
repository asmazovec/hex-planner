import { describe, expect, test } from 'vitest';
import type { EntryBody } from '../../../types';
import { bench, effect, endOf, planned, quote } from '../kit';
import { id } from './nexus';

const agenda = () => planned({ type: 'adjustment', label: '', delta: {} } as EntryBody, 'agenda', { gains: [id] });

describe('agenda:nexus Nexus Sovereignty', () => {
  // "For: Alpha and beta wormholes in the wormhole nexus have no effect during movement."
  // Checks: the law resolved "For" is in play, and the card is a hint of the movement step.
  // Why nothing is validated yet: the law takes away a joining of systems. The route check of the plan does not warn
  // of a step between systems that are not joined (it is a jump: the Fracture, a portal, an ability), so no warning
  // changes; only the reach drawn on the map would, which is the todo below.
  test('agenda:nexus resolved is a law in play, shown as a reminder of the movement step', () => {
    const table = bench({ faction: 'sol', expansions: ['pok'], entries: [agenda()] });
    quote(table.pack, id, 'Alpha and beta wormholes in the wormhole nexus have no effect during movement');
    expect(endOf(table).laws).toContain(id);
    expect(effect(table.pack, id).tier).toBe('hint');
    expect(effect(table.pack, id).hintAt).toEqual(['movement']);
  });

  test.todo('agenda:nexus "For": the reach on the map no longer joins the wormhole nexus by its alpha and beta wormholes (Creuss excepted, rulings): routeGraph in src/domain/movement.ts does not know the laws');
  test.todo('agenda:nexus "Against": the law is not put in play, and a gamma wormhole token joins Mecatol Rex to the gamma wormholes: the agenda entry has no outcome, and the board has no wormhole tokens');
});
