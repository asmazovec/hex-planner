/** What is in force for a player without being played: the cards held, the faction sheet, the planets, the laws. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { emptyHoldings, holdingsOf } from '../holdings';
import { gameSchema } from '../../storage/schema';
import { rulesGame, tactical } from '../rules/kit';
import { applied } from './apply';
import { inForceOf, passivesOf } from './registry';

const pack = loadPack(['pok', 'te']);

describe('components in force', () => {
  test('the abilities and the mech of the faction sheet come with the faction, the breakthrough only once held', () => {
    const letnev = inForceOf(pack, { holdings: emptyHoldings(), faction: 'letnev' });
    expect(letnev).toEqual(expect.arrayContaining(['ability:armada', 'ability:munitions', 'mech:letnev_mech']));
    expect(letnev).not.toContain('breakthrough:letnevbt');
    expect(inForceOf(pack, { holdings: { ...emptyHoldings(), breakthrough: 'exhausted' }, faction: 'letnev' })).toContain('breakthrough:letnevbt');
    expect(inForceOf(pack, { holdings: emptyHoldings(), faction: 'argent' })).not.toContain('ability:armada');
    expect(inForceOf(pack, { holdings: emptyHoldings() })).toEqual([]);
  });

  test('a leader held is in force unless purged; a locked one is not held at all', () => {
    const holdings = holdingsOf({ leaders: { 'leader:letnevcommander': 'unlocked', 'leader:letnevagent': 'exhausted', 'leader:letnevhero': 'purged' } });
    const found = inForceOf(pack, { holdings });
    expect(found).toEqual(expect.arrayContaining(['leader:letnevcommander', 'leader:letnevagent']));
    expect(found).not.toContain('leader:letnevhero');
  });

  test('a legendary planet is in force for the player who controls it, a law for everyone', () => {
    const planet = Object.values(pack.planets).find(p => p.legendary)!;
    const law = pack.components.find(c => c.kind === 'agenda' && c.detail?.type === 'law')!;
    expect(inForceOf(pack, { holdings: emptyHoldings(), control: { [planet.id]: 'me' } })).toEqual([`legendary:${planet.id}`]);
    expect(inForceOf(pack, { holdings: emptyHoldings(), control: { [planet.id]: 'enemy' } })).toEqual([]);
    expect(inForceOf(pack, { holdings: emptyHoldings(), laws: [law.id] })).toEqual([law.id]);
  });

  test('a passive effect of the faction sheet changes the count only when the faction is given: ability:armada adds two to the fleet limit', () => {
    expect(passivesOf(pack, { holdings: emptyHoldings(), faction: 'letnev' }).map(([id]) => id)).toContain('ability:armada');
    expect(applied(pack, { holdings: emptyHoldings(), faction: 'letnev' }, 'fleetLimit', 3, { faction: 'letnev' })).toEqual({ value: 5, by: ['ability:armada'] });
    expect(applied(pack, emptyHoldings(), 'fleetLimit', 3, { faction: 'letnev' })).toEqual({ value: 3, by: [] });
  });

  test('a save keeps what an entry uses and the structures it takes on board and puts down', () => {
    const entry = { ...tactical('1,0', { moves: [{ from: 'h1', units: {}, structures: { pds: 1 } }], landings: [{ planetId: 't1', units: {}, structures: { pds: 1 } }] }), uses: ['leader:letnevagent'] };
    const saved = gameSchema.parse({ ...rulesGame({ entries: [entry], playerCount: 1 }) });
    expect(saved.plans[0].rounds[0].entries[0]).toMatchObject({ uses: ['leader:letnevagent'], moves: [{ structures: { pds: 1 } }], landings: [{ structures: { pds: 1 } }] });
  });
});
