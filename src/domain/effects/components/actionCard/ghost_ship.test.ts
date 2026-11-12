import { describe, expect, test } from 'vitest';
import type { DataPack, Game } from '../../../types';
import { bench, componentAction, effect, endOf, expectNone, expectStanding, FAR, FARTHER, HOME, NEAR, quote, TARGET, warningsOf } from '../kit';
import ghostShipSystem from '../../../rules/codes/ghostShipSystem';
import { id } from './ghost_ship';

/**
 * The code pass 2 declares (src/domain/rules/codes/ghostShipSystem.ts): the system Ghost Ship names is outside
 * what its text allows.
 */
const TARGET_CODE = ghostShipSystem.code;

/** FAR holds an alpha wormhole; my home system is given a beta one, to test "non-home". */
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-alpha', [FARTHER]: 'r-empty' };
const homeWormhole = (pack: DataPack) => { pack.tiles['r-home'] = { ...pack.tiles['r-home'], wormholes: ['beta'] }; };
const ghost = (system: string) => componentAction(id, { choices: { system } } as never);
const table = (play = ghost(FAR), game: Partial<Game> = {}, hand: string[] = [id]) =>
  ({ play, ...bench({ faction: 'sol', start: { hand }, entries: [play], game: { map: MAP, ...game }, edit: homeWormhole }) });

describe('actionCard:ghost_ship Ghost Ship', () => {
  // "Place 1 destroyer from your reinforcements in a non-home system that contains a wormhole and does not contain
  //  other players' ships."
  // Checks: played on FAR, a system with a wormhole and nobody's ships, a destroyer of mine stands there.
  // Why nothing is waived: a unit placed by an ability breaks no rule; the board changes.
  test('actionCard:ghost_ship places a destroyer in an empty system with a wormhole', () => {
    const table1 = table();
    quote(table1.pack, id, 'Place 1 destroyer from your reinforcements in a non-home system that contains a wormhole');
    expect(endOf(table1).systems[FAR]).toEqual({ destroyer: 1 });
    expectNone(warningsOf(table1, table1.play), TARGET_CODE);
  });

  // "... a non-home system that contains a wormhole ..."
  // Checks: a system without a wormhole is warned of; the destroyer is placed all the same.
  // Why the check is NOT redundant here: the card names systems with a wormhole only.
  test('actionCard:ghost_ship in a system without a wormhole is warned of, and still placed', () => {
    const plain = table(ghost(NEAR));
    expectStanding(warningsOf(plain, plain.play), TARGET_CODE);
    expect(endOf(plain).systems[NEAR]).toEqual({ destroyer: 1 });
  });

  // "... a non-home system ..."
  // Checks: my home system, though it holds a wormhole here, is warned of.
  // Why the check is NOT redundant here: the card excludes home systems.
  test('actionCard:ghost_ship in a home system is warned of', () => {
    const home = table(ghost(HOME));
    expectStanding(warningsOf(home, home.play), TARGET_CODE);
  });

  // "... and does not contain other players' ships."
  // Checks: the wormhole system holding another player's destroyer is warned of.
  // Why the check is NOT redundant here: the card excludes systems with other players' ships.
  test('actionCard:ghost_ship in a system with other players\' ships is warned of', () => {
    const taken = table(ghost(FAR), { enemyUnits: { [FAR]: { o1: { destroyer: 1 } } } });
    expectStanding(warningsOf(taken, taken.play), TARGET_CODE);
  });

  // LRR 22.1 / 2.7: an action card is played from the hand.
  // Checks: without the card in hand the play is warned of.
  // Why the check is NOT redundant here: the card is not held.
  test('actionCard:ghost_ship played without being in hand is warned of', () => {
    const none = table(ghost(FAR), {}, []);
    expectStanding(warningsOf(none, none.play), 'componentNotHeld');
  });

  test('actionCard:ghost_ship is a play effect', () => {
    const { pack } = table();
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
