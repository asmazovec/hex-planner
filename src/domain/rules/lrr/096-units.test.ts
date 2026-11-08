/** LRR 96 Units. Source: tirules2 rules-reference/units.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { CARD } from '../../strategy';
import { productionCost } from '../../unitStats';
import { codesOf, forecast, HOME, NEAR, rulesGame, rulesPack, secondary, tactical } from '../kit';

const pack = rulesPack();
const pok = loadPack(['pok']);

describe('LRR 96 Units', () => {
  test('96.1: units are ships, ground forces and structures: infantry and mechs are the ground forces, PDS and docks the structures', () => {
    const ground = Object.values(pok.units).filter(u => u.ground).map(u => u.id).sort();
    expect(ground).toEqual(['infantry', 'mech']);
    expect(pok.structures.map(s => s.id).sort()).toEqual(['pds', 'spacedock']);
  });

  test('96.2: the base pack records how many of each ship a colour holds', () => {
    const limits = Object.fromEntries((['carrier', 'cruiser', 'destroyer', 'dreadnought', 'warsun', 'flagship'] as const).map(id => [id, pack.units[id]?.limit]));
    expect(limits).toEqual({ carrier: 4, cruiser: 8, destroyer: 8, dreadnought: 5, warsun: 2, flagship: 1 });
  });

  test('96.2: the packs record the structures and mechs of a colour: 3 space docks, 6 PDS, 4 mechs', () => {
    expect(Object.fromEntries(pok.structures.map(s => [s.id, s.limit]))).toEqual({ spacedock: 3, pds: 6 });
    expect(pok.units.mech?.limit).toBe(4);
  });

  test('96.3 / note 2: a unit is on the board or in reinforcements: producing with every war sun already on the board is warned about', () => {
    const limited = rulesPack(p => { if (p.units.warsun) p.units.warsun.limit = 2; });
    const build = secondary(CARD.warfare, { production: { systemId: HOME, units: { warsun: 1 } } });
    const game = rulesGame({ units: { [NEAR]: { warsun: 2 } }, entries: [build], game: { docks: ['h1'] } });
    expect(codesOf(game, limited, build)).toContain('reinforcementsOut');
  });

  test('96 note 1: a faction\'s own version of a ship is produced as that ship type, at its own cost', () => {
    const base = loadPack([]);
    expect(productionCost({ carrier: 1 }, 'sol', [], base)).toBe(3);
    const build = tactical(HOME, { production: { carrier: 1 } });
    expect(forecast(rulesGame({ entries: [build], game: { docks: ['h1'] } }), pack).state.systems[HOME]).toEqual({ carrier: 1 });
  });

  test('96 note 2.1: fighters and infantry are not limited by their figures: tokens stand in for them', () => {
    const limited = rulesPack(p => { if (p.units.infantry) p.units.infantry.limit = 12; if (p.units.fighter) p.units.fighter.limit = 10; });
    const build = tactical(HOME, { production: { infantry: 2 } });
    const game = rulesGame({ entries: [build], game: { docks: ['h1'] }, units: { [NEAR]: { carrier: 3, infantry: 12 } } });
    expect(codesOf(game, limited, build)).not.toContain('reinforcementsOut');
  });
});
