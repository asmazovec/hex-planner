/** LRR 79 Space Dock. Source: tirules2 rules-reference/space-dock.md. A space dock I produces its planet's resources + 2. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import type { Game } from '../../types';
import { codesOf, forecast, HOME, NEAR, primary, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();

const RIVAL = 'rival';
const rivalPack = rulesPack(p => {
  p.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
});
const withRival = (extra: Partial<Game> = {}): Partial<Game> => ({
  opponents: [{ id: RIVAL, faction: 'rules-rival', vp: 0, seat: 2, color: 2 }], ...extra,
});

describe('LRR 79 Space Dock', () => {
  test('79.1: a space dock\'s Production sets how many units it produces: the dock on h2 (1 + 2) makes 3, not 4', () => {
    const build = tactical(HOME, { production: { destroyer: 4 } });
    expect(codesOf(rulesGame({ entries: [build], game: { docks: ['h2'] } }), pack, build)).toContain('productionOver');
  });

  test('79.2: the Construction primary places a space dock', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'spacedock', planetId: 'h2' }] });
    expect(forecast(rulesGame({ entries: [play] }), pack).state.docks).toContain('h2');
  });

  test('79.2: a dock placed this round lets a later tactical action produce there', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'spacedock', planetId: 'h1' }] });
    const build = tactical(HOME, { production: { destroyer: 1 }, payment: { planets: ['h2'], tradeGoods: 0 } });
    expect(codesOf(rulesGame({ entries: [play, build] }), pack, build)).not.toContain('noProduction');
  });

  test('79.3 / 85.4: a planet holds at most one space dock', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'spacedock', planetId: 'h1' }] });
    expect(codesOf(rulesGame({ entries: [play], game: { docks: ['h1'] } }), pack, play)).toContain('structureLimit');
  });

  test('79.4: my space dock on a planet without my ground forces is destroyed when an opponent lands there', () => {
    const landing = tactical(HOME, { landings: [{ planetId: 'h1', units: { infantry: 1 } }] }, { owner: RIVAL });
    const game = rulesGame({ entries: [landing], game: withRival({ docks: ['h1'], enemyUnits: { [HOME]: { [RIVAL]: { carrier: 1, infantry: 1 } } } }) });
    const { state } = forecast(game, rivalPack);
    expect(state.control.h1).toBe('enemy');
    expect(state.docks).not.toContain('h1');
  });

  test('79.4: an opponent\'s space dock is destroyed when I take its planet, so it does not become mine', () => {
    const invade = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
    });
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [invade],
      game: withRival({ docks: ['t1'], planetControl: { t1: 'enemy' }, planetOwner: { t1: RIVAL } }),
    });
    const { state } = forecast(game, rivalPack);
    expect(state.control.t1).toBe('me');
    expect(state.docks).not.toContain('t1');
  });

  test('79.4: an opponent\'s dock gives me no Production: producing in its system is warned about', () => {
    const build = tactical(TARGET, { production: { destroyer: 1 }, payment: { planets: ['h2'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [build], game: withRival({ docks: ['t1'], planetControl: { t1: 'enemy', t2: 'me' }, planetOwner: { t1: RIVAL } }) });
    expect(codesOf(game, rivalPack, build)).toContain('noProduction');
  });

  test.todo('79.4.1: the Saar Floating Factory is destroyed when blockaded — not modelled: faction units are not applied');
  test.todo('79 note 1: a space dock is both a structure and a unit — not modelled: structures are kept apart from units and nothing refers to the distinction');
  test.todo('79 note 2: fighters stay with their carrier until movement ends and cannot be parked on a dock mid-move — not modelled: space dock fighter capacity is not counted');
  test.todo('79 note 2.1: a ship cannot free capacity by handing fighters to a dock to pick up ground forces — not modelled: space dock fighter capacity is not counted');
});
