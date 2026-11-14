import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from '../testing/old/domain/newGame';
import { setPlayerFaction } from '../testing/old/domain/players';
import { legacyPlayer, playerOfLegacy, tableOf } from '../testing/old/game/fromLegacy';

const pack = loadPack(['pok', 'te']);
const FACTIONS = ['sol', 'hacan', 'arborec', 'letnev'];

function fourPlayers() {
  let game = createGame({ expansions: ['pok', 'te'], playerCount: 4, faction: 'sol' }, pack);
  FACTIONS.slice(1).forEach((faction, i) => { game = setPlayerFaction(game, i + 1, faction, pack); });
  return game;
}

describe('the old game as a table', () => {
  const game = fourPlayers();
  const table = tableOf(game);

  test('every player is p<seat>, in seat order, with the faction of the old game', () => {
    expect(table.players.map(p => [p.id, p.faction, p.seat])).toEqual(FACTIONS.map((f, i) => [`p${i + 1}`, f, i + 1]));
    expect(table.players.map(p => p.color)).toEqual([1, 2, 3, 4]);
  });

  test('the viewer is me, and the map, layout, expansions and name come across', () => {
    expect(table.viewer).toBe('p1');
    expect(table.map).toEqual(game.map);
    expect(table).toMatchObject({ id: game.id, layout: game.layout, expansions: ['pok', 'te'] });
  });

  test('a player maps back to me or to the old opponent id', () => {
    expect(legacyPlayer(table, 'p1')).toBe('me');
    expect(legacyPlayer(table, 'p3')).toBe(game.opponents[1].id);
    expect(playerOfLegacy(table, game.opponents[2].id)).toBe('p4');
    expect(playerOfLegacy(table, 'me')).toBe('p1');
  });

  test('when I sit at another seat the viewer follows', () => {
    const moved = tableOf({ ...game, seat: 3, opponents: game.opponents.map(o => (o.seat === 3 ? { ...o, seat: 1 } : o)) });
    expect(moved.viewer).toBe('p3');
    expect(moved.players.map(p => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(legacyPlayer(moved, 'p3')).toBe('me');
  });

  test('the starting technologies marked in the old game are the setup choices', () => {
    const marked = { ...game, start: { ...game.start, me: { ...game.start.me, technologies: ['technology:neural-motivator'] } } };
    expect(tableOf(marked).players[0].setup.technologies).toEqual(['technology:neural-motivator']);
  });
});
