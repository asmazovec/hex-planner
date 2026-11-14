import { describe, expect, test } from 'vitest';
import type { Entry } from '../../testing/old/domain/types';
import { adjust, bench, expectStanding, expectWaived, HOME, secondary, tactical, using, warningsOf } from './components/kit';

const AGENT = 'leader:winnuagent';
const HTP = 'technology:htp';
const KELERES = 'leader:keleresagent';

/** The Winnu build a flagship and 2 mechs (cost 8 + 4 = 12... a flagship and a mech, 10) paying the planet h1 (influence 4, resources 3) and 4 trade goods: 7 paid, 3 short. */
const winnu = (...named: string[]) => {
  const build: Entry = using(tactical(HOME, { production: { flagship: 1, mech: 1 }, payment: { planets: ['h1'], tradeGoods: 4 } }), ...named);
  const table = bench({
    faction: 'winnu', expansions: ['pok'], start: { technologies: [HTP], leaders: { [AGENT]: 'unlocked' } }, entries: [adjust({ tradeGoods: 4 }), build],
    game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } },
    edit: data => { data.planets.h1 = { ...data.planets.h1!, resources: 3, influence: 4 }; },
  });
  return { table, build };
};

describe('components that cover one shortfall together', () => {
  // Berekar Berekon: "reduce the combined cost of the produced units by 2"; Hegemonic Trade Policy: "swap the resource
  // and influence values of 1 planet you control": 2 + 1 cover a shortfall of 3 that neither covers alone.
  test('Agent of the Winnu and Hegemonic Trade Policy together lift a shortfall of 3', () => {
    const { table, build } = winnu(AGENT, HTP);
    const short = warningsOf(table, build).find(w => w.code === 'shortResources');
    expect(short?.params).toMatchObject({ needed: 10, paid: 7 });
    expectWaived(warningsOf(table, build), 'shortResources', AGENT);
    expectWaived(warningsOf(table, build), 'shortResources', HTP);
  });

  test('either of them alone leaves the shortfall of 3 standing', () => {
    for (const named of [[AGENT], [HTP]]) {
      const { table, build } = winnu(...named);
      expectStanding(warningsOf(table, build), 'shortResources');
    }
  });

  // Xander: "spend commodities as if they were trade goods": the commodities count as paid.
  test('the Keleres agent lifts the resources short by what its commodities cover', () => {
    const build: Entry = using(tactical(HOME, { production: { cruiser: 1 }, payment: { planets: [], tradeGoods: 2 } }), KELERES);
    const table = bench({
      faction: 'keleresm', expansions: ['pok'], start: { leaders: { [KELERES]: 'unlocked' } }, entries: [secondary(5), build],
      game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } },
    });
    const warnings = warningsOf(table, build);
    expectWaived(warnings, 'shortTradeGoods', KELERES);
    expectWaived(warnings, 'shortResources', KELERES);
  });
});
