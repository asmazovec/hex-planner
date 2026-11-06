import { describe, expect, it } from 'vitest';
import { loadPack } from '../data/loadPack';
import { factionSheet } from './factionSheet';
import type { ExpansionId } from './types';

const sheetOf = (id: string, expansions: ExpansionId[]) => factionSheet(loadPack(expansions).factions[id], expansions);
const names = (items: { name: string }[]) => items.map(item => item.name);

describe('factionSheet', () => {
  it('shows only the abilities without expansions: leaders and mechs need Prophecy of Kings', () => {
    const sheet = sheetOf('jolnar', []);
    expect(names(sheet.abilities).length).toBeGreaterThan(0);
    expect(sheet.leaders).toEqual([]);
    expect(sheet.mechs).toEqual([]);
    expect(sheet.breakthrough).toBeUndefined();
  });

  it('removes leaders and mechs with Thunder\'s Edge alone, as its rulebook says, and keeps the breakthrough', () => {
    const sheet = sheetOf('jolnar', ['te']);
    expect(sheet.leaders).toEqual([]);
    expect(sheet.mechs).toEqual([]);
    expect(sheet.breakthrough?.pack).toBe('te');
  });

  it('gives Jol-Nar Ta Zern with Prophecy of Kings and Agnlan Oln once Thunder\'s Edge is on', () => {
    const commander = (expansions: ExpansionId[]) => sheetOf('jolnar', expansions).leaders.filter(l => l.type === 'commander');
    expect(names(commander(['pok']))).toEqual(['Ta Zern']);
    expect(commander(['pok'])[0].pack).toBe('pok');
    expect(names(commander(['pok', 'te']))).toEqual(['Agnlan Oln']);
    expect(commander(['pok', 'te'])[0].pack).toBe('te');
  });

  it('replaces the other printed cards of Thunder\'s Edge, one of each', () => {
    const ids = (id: string, expansions: ExpansionId[]) => {
      const sheet = sheetOf(id, expansions);
      return [...sheet.leaders, ...sheet.mechs].map(item => item.id);
    };
    expect(ids('naalu', ['pok'])).toEqual(expect.arrayContaining(['naaluagent', 'naalu_mech_omega']));
    expect(ids('naalu', ['pok', 'te'])).toEqual(expect.arrayContaining(['naaluagent-te', 'naalu_mech_te']));
    expect(ids('naalu', ['pok', 'te'])).not.toContain('naaluagent');
    expect(ids('xxcha', ['pok'])).toContain('xxchahero');
    expect(ids('xxcha', ['pok', 'te'])).toContain('xxchahero-te');
    expect(ids('xxcha', ['pok', 'te'])).not.toContain('xxchahero');
  });

  it('lists leaders as agent, commander, hero; every faction with both expansions has at least one of each and a mech', () => {
    const expansions: ExpansionId[] = ['pok', 'te'];
    const { factions } = loadPack(expansions);
    for (const faction of Object.values(factions)) {
      const sheet = factionSheet(faction, expansions);
      const types = sheet.leaders.map(l => l.type);
      expect(types, faction.id).toEqual([...types].sort((a, b) => ['agent', 'commander', 'hero'].indexOf(a) - ['agent', 'commander', 'hero'].indexOf(b)));
      expect(new Set(types).size, faction.id).toBe(3);
      expect(sheet.mechs.length, faction.id).toBeGreaterThan(0);
      expect(sheet.abilities.length, faction.id).toBeGreaterThan(0);
      expect(sheet.breakthrough, faction.id).toBeDefined();
    }
  });
});
