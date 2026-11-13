import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { componentById, componentsOf, ownedBy, textOf } from './components';
import { startingAgents } from './holdings';
import { factionSheet } from './factionSheet';
import type { ExpansionId } from './types';

const SETS: ExpansionId[][] = [[], ['pok'], ['te'], ['pok', 'te']];

test('componentsOf holds every technology, leader, ability, mech, breakthrough and legendary planet of the pack', () => {
  for (const expansions of SETS) {
    const pack = loadPack(expansions);
    const ids = new Set(componentsOf(pack).map(c => c.id));
    const where = `[${expansions.join(',')}]`;
    for (const faction of Object.values(pack.factions)) {
      const sheet = factionSheet(faction, expansions);
      for (const item of sheet.abilities) expect(ids.has(`ability:${item.id}`), `${where} ability ${item.id}`).toBe(true);
      for (const item of sheet.leaders) expect(ids.has(`leader:${item.id}`), `${where} leader ${item.id}`).toBe(true);
      for (const item of sheet.mechs) expect(ids.has(`mech:${item.id}`), `${where} mech ${item.id}`).toBe(true);
      for (const item of sheet.techs) expect(ids.has(`technology:${item.id}`), `${where} technology ${item.id}`).toBe(true);
      if (sheet.breakthrough) expect(ids.has(`breakthrough:${sheet.breakthrough.id}`), `${where} ${sheet.breakthrough.id}`).toBe(true);
      for (const id of [...faction.startingTech, ...(faction.startingTechChoice?.options ?? [])]) expect(ids.has(`technology:${id}`), `${where} ${id}`).toBe(true);
    }
    for (const planet of Object.values(pack.planets)) if (planet.legendary) expect(ids.has(`legendary:${planet.id}`), `${where} ${planet.id}`).toBe(true);
  }
});

test('componentsOf holds nothing a faction does not have with these expansions', () => {
  for (const expansions of SETS) {
    const pack = loadPack(expansions);
    const all = componentsOf(pack);
    const sheets = Object.values(pack.factions).map(faction => factionSheet(faction, expansions));
    const expected = (kind: string, ids: string[]) => {
      const got = all.filter(c => c.kind === kind).map(c => c.id).sort();
      expect(got, `[${expansions.join(',')}] ${kind}`).toEqual([...new Set(ids.map(id => `${kind}:${id}`))].sort());
    };
    expected('leader', sheets.flatMap(sheet => sheet.leaders.map(item => item.id)));
    expected('mech', sheets.flatMap(sheet => sheet.mechs.map(item => item.id)));
    expected('breakthrough', sheets.flatMap(sheet => (sheet.breakthrough ? [sheet.breakthrough.id] : [])));
    expected('ability', sheets.flatMap(sheet => sheet.abilities.map(item => item.id)));
  }
});

test('the base game alone has its cards and common technologies, and no leaders, relics or exploration', () => {
  const kinds = new Set(componentsOf(loadPack([])).map(c => c.kind));
  expect([...kinds].sort()).toEqual(['ability', 'actionCard', 'agenda', 'promissory', 'publicObjective', 'secretObjective', 'technology']);
});

test('a component carries its kind, pack, faction, copies and the fields of its kind', () => {
  const pack = loadPack(['pok', 'te']);
  expect(componentById(pack, 'actionCard:sabo1')).toMatchObject({ kind: 'actionCard', name: 'Sabotage', pack: 'base', copies: 4, detail: { phase: 'any' } });
  expect(componentById(pack, 'technology:amd')).toMatchObject({ kind: 'technology', name: 'Antimass Deflectors', pack: 'base', detail: { type: 'propulsion' } });
  expect(componentById(pack, 'technology:lw2')).toMatchObject({ faction: 'arborec', detail: { type: 'unitUpgrade', upgrade: 'infantry' } });
  expect(componentById(pack, 'leader:arborecagent')).toMatchObject({ kind: 'leader', pack: 'pok', faction: 'arborec', detail: { type: 'agent' } });
  expect(componentById(pack, 'legendary:primor')).toMatchObject({ kind: 'legendary', name: 'The Atrament', pack: 'pok' });
  expect(componentById(pack, 'publicObjective:corner')).toMatchObject({ detail: { stage: 1, points: 1 } });
  expect(componentById(pack, 'promissory:stymie')).toMatchObject({ faction: 'arborec' });
  expect(componentById(pack, 'nope:nothing')).toBeUndefined();
});

test('a card Thunder\'s Edge replaces is no component while it is on', () => {
  expect(componentById(loadPack(['pok']), 'leader:jolnarcommander-pok')?.name).toBe('Ta Zern');
  expect(componentById(loadPack(['pok']), 'leader:jolnarcommander')).toBeUndefined();
  expect(componentById(loadPack(['pok', 'te']), 'leader:jolnarcommander-pok')).toBeUndefined();
  expect(componentById(loadPack(['pok', 'te']), 'leader:jolnarcommander')?.name).toBe('Agnlan Oln');
  expect(componentById(loadPack(['pok']), 'technology:iihq')).toBeDefined();
  expect(componentById(loadPack(['pok', 'te']), 'technology:iihq')).toBeUndefined();
  expect(componentById(loadPack(['pok', 'te']), 'technology:executiveorder')).toBeDefined();
});

test('textOf gives the printed text by id, also for what is no component, and an empty string for an unknown id', () => {
  const pack = loadPack(['pok', 'te']);
  expect(textOf(pack, 'technology:amd')).toMatch(/^Your ships can move into and through asteroid fields\./);
  expect(textOf(pack, 'actionCard:sabo1')).toBe(componentById(pack, 'actionCard:sabo1')!.text);
  expect(textOf(pack, 'leader:arboreccommander#unlock')).toMatch(/\w/);
  expect(textOf(pack, 'leader:arborecagent#unlock')).toBe('');
  expect(textOf(pack, 'strategy:pok5trade')).toMatch(/^Gain 3 trade goods\./);
  expect(textOf(pack, 'strategy:pok5trade#secondary')).toMatch(/replenish your commodities/);
  expect(textOf(pack, 'unit:arborec_flagship')).toMatch(/\w/);
  expect(textOf(pack, 'nope:nothing')).toBe('');
  expect(textOf(loadPack([]), 'leader:arborecagent')).toBe('');
});

describe('the Council Keleres variants share one sheet', () => {
  const shared = loadPack(['pok', 'te']);
  test('each variant owns the shared abilities, agent, commander, mech and technologies', () => {
    for (const id of ['ability:the_tribuni', 'leader:keleresagent', 'leader:kelerescommander', 'mech:keleres_mech', 'technology:asn']) {
      const def = componentById(shared, id)!;
      for (const faction of ['keleresm', 'keleresx', 'keleresa']) expect(ownedBy(def, faction), `${id} of ${faction}`).toBe(true);
      expect(ownedBy(def, 'sol')).toBe(false);
    }
  });

  test('the agent starts unlocked for every variant, the hero only for its own', () => {
    for (const faction of ['keleresm', 'keleresx', 'keleresa']) expect(startingAgents(shared, faction)).toEqual(['leader:keleresagent']);
    expect(ownedBy(componentById(shared, 'leader:keleresherokuuasi')!, 'keleresm')).toBe(false);
  });
});
