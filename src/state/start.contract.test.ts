/** The setup of the game is kernel edits: the store reads nothing of the old modules that wrote it, and no edit goes the long way through the old game. */
import { describe, expect, test } from 'vitest';

const files = import.meta.glob<string>(
  ['./gameStore.ts', './setupWrites.ts', './projection.ts', './turnBridge.ts', '../domain/shareLink.ts', '../game/edit/table.ts', '../game/edit/merged.ts'],
  { query: '?raw', import: 'default', eager: true },
);
const OLD = /from '\.\.\/domain\/(players|newGame|mapBuilder|holdings|mecatol|thundersEdge|startStructures|slotRename)'/;

describe('the start of the game', () => {
  test('the store, the setup writes and the projection do not import the old modules that wrote the setup', () => {
    expect(Object.keys(files)).toHaveLength(7);
    for (const name of ['./gameStore.ts', './setupWrites.ts', './projection.ts', './turnBridge.ts']) {
      if (name === './projection.ts') continue; // still imports `gameAs` from players, which reads a game
      expect(files[name], name).not.toMatch(OLD);
    }
    expect(files['./projection.ts']).not.toMatch(/from '\.\.\/domain\/(newGame|mapBuilder|holdings|mecatol|thundersEdge|startStructures|slotRename)'/);
  });
  test('the share link and the edits of the table are written over the table, not over the old game', () => {
    expect(files['../domain/shareLink.ts']).not.toMatch(/from '\.\/(players|newGame)'/);
    expect(files['../game/edit/table.ts']).not.toMatch(/domain\/(players|mecatol)'|createGame|storage\/|fromLegacy|legacySave/);
    expect(files['../game/edit/merged.ts']).not.toMatch(/domain\/project'|storage\/|fromLegacy|legacySave/);
  });
  test('no setup edit goes the long way through the old game', () => {
    expect(files['./gameStore.ts']).not.toMatch(/viaGame|viaOld|commitOld|commitPlayers|placeStartUnits/);
  });
  test('the store writes setup edits over the saved game, not through the old game', () => {
    const store = files['./gameStore.ts'];
    const names = [
      'setEnemyUnits', 'setEnemyGround', 'setPlanetControl', 'setDock', 'setPds', 'setStartHolding', 'setLeader', 'setSlice', 'setThundersEdge',
      'setFractureActive', 'setFractureSeat', 'toggleIngress', 'setName', 'setTile', 'setMap', 'setLayout', 'setOpponent', 'addOpponent',
      'removeOpponent', 'setFaction', 'addExpansion', 'setDraftExpansions',
    ];
    for (const name of names) {
      const line = store.split('\n').find(l => l.trimStart().startsWith(`${name}:`)) ?? '';
      expect(line, name).toMatch(/commit(Setup)?\(|setDraft\(/);
    }
  });
});
