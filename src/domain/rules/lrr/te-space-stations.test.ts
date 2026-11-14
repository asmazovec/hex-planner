/** Thunder's Edge: Space Stations. Source: tirules2 rules-reference/space-stations.md (Notes; no LRR section). */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { productionPlaces, systemPlanets } from '../../../testing/old/domain/project';
import { HOME, NEAR, TARGET, before, codesOf, forecast, primary, rulesGame, rulesPack, tactical } from '../kit';

const te = loadPack(['pok', 'te']);
const tePack = () => rulesPack(p => { Object.assign(p.tiles, te.tiles); Object.assign(p.planets, te.planets); });

/** Tile 109 holds the planet Bellatrix and Tsion Station. */
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: '109' };
const STATION = 'tsionstation';
const RIVAL = { id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 };

describe("Thunder's Edge: Space Stations", () => {
  test('space stations 1: a station is counted among the system\'s planets', () => {
    const game = rulesGame({ map: MAP, game: { expansions: ['pok', 'te'] } });
    expect(systemPlanets(game, TARGET, tePack()).map(p => p.id)).toContain(STATION);
  });

  test('space stations 2: being the only player with units in the system gives control of its station', () => {
    const pack = tePack();
    const go = tactical(TARGET, { moves: [{ from: HOME, units: { destroyer: 1 } }] });
    const game = rulesGame({ map: MAP, units: { [HOME]: { destroyer: 1 } }, entries: [go], game: { expansions: ['pok', 'te'] } });
    expect(forecast(game, pack).state.control[STATION]).toBe('me');
  });

  test('space stations 2.1: moving in beside another player\'s ships does not take the station before the combat is won', () => {
    const pack = tePack();
    const go = tactical(TARGET, { moves: [{ from: HOME, units: { destroyer: 1 } }] });
    const game = rulesGame({
      map: MAP, units: { [HOME]: { destroyer: 1 } }, entries: [go],
      game: { expansions: ['pok', 'te'], opponents: [RIVAL], enemyUnits: { [TARGET]: { o1: { cruiser: 1 } } } },
    });
    expect(forecast(game, pack).state.control[STATION]).not.toBe('me');
  });

  test('space stations 2.2: leaving the system keeps control of its station', () => {
    const pack = tePack();
    const away = tactical(NEAR, { moves: [{ from: TARGET, units: { destroyer: 1 } }] });
    const game = rulesGame({ map: MAP, units: { [TARGET]: { destroyer: 1 } }, entries: [away], game: { expansions: ['pok', 'te'], planetControl: { [STATION]: 'me' } } });
    expect(forecast(game, pack).state.control[STATION]).toBe('me');
  });

  test('space stations 3: a station pays like a planet and is ready again next round', () => {
    const pack = tePack();
    const pay = { planets: [STATION], tradeGoods: 0 };
    const first = tactical(TARGET, { production: { fighter: 2 }, payment: pay });
    const second = tactical(TARGET, { production: { fighter: 2 }, payment: pay });
    const game = rulesGame({ map: MAP, rounds: [[first], [second]], game: { expansions: ['pok', 'te'], planetControl: { [STATION]: 'me' } } });
    expect(codesOf(game, pack, first)).not.toContain('shortResources');
    expect(codesOf(game, pack, second)).not.toContain('planetExhausted');
  });

  test('space stations 4: ground forces cannot land on a station', () => {
    const pack = tePack();
    const land = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: STATION, units: { infantry: 1 } }] });
    const game = rulesGame({ map: MAP, units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [land], game: { expansions: ['pok', 'te'] } });
    expect(codesOf(game, pack, land)).toContain('stationGround');
  });

  test('space stations 4: produced infantry are never placed on a station', () => {
    const pack = tePack();
    const build = tactical(TARGET, { production: { infantry: 2 } });
    const game = rulesGame({ map: MAP, entries: [build], game: { expansions: ['pok', 'te'], planetControl: { [STATION]: 'me' } } });
    const places = productionPlaces(game, build as Extract<typeof build, { type: 'tactical' }>, before(game, pack, build), pack);
    expect(places.map(p => p.planetId)).not.toContain(STATION);
  });

  test('space stations 4: a structure cannot be put on a station', () => {
    const pack = tePack();
    const build = primary(4, { structures: [{ kind: 'pds', planetId: STATION }] });
    const game = rulesGame({ map: MAP, entries: [build], game: { expansions: ['pok', 'te'], planetControl: { [STATION]: 'me' } } });
    expect(codesOf(game, pack, build)).toContain('stationStructure');
  });

  test.todo('space stations 5: stations count as planets for voting — not modelled: votes are not counted');
  test.todo('space stations 6: stations are not planets for objectives, and one in a home system does not block scoring — not modelled: objectives are not checked');
  test.todo('space stations 7: each controlled station raises the commodity value by one — not modelled: commodities are not tracked, the faction card shows the printed value');
  test.todo('space stations 7.1: a commodity token may remind of the higher value — not modelled: commodities are not tracked');
  test.todo('space stations 7.2: losing a station drops commodities above the new value — not modelled: commodities are not tracked');
  test.todo('space stations 8: players with stations may trade without being neighbours — not modelled: transactions are not tracked');
  test.todo('space stations 8.1: such trading partners do not become neighbours for other effects — not modelled: transactions and neighbours are not tracked');
  test.todo('space stations 8.2: still one transaction per pair per turn or agenda — not modelled: transactions are not tracked');
  test.todo('space stations 9: exhausting a station converts commodities into trade goods — not modelled: commodities are not tracked');
  test.todo('space stations 9.1: such trade goods are not gained for other abilities — not modelled: abilities are not counted');
  test.todo('space stations 10: a system with a station and no planet gets a frontier token at setup — not modelled: frontier tokens are not tracked');
});
