/** The hand placements of the start are kernel edits: the store reads nothing of the old modules that wrote them. */
import { describe, expect, test } from 'vitest';

const files = import.meta.glob<string>(['./gameStore.ts', './setupWrites.ts', './projection.ts', './turnBridge.ts'], { query: '?raw', import: 'default', eager: true });

describe('the start of the game', () => {
  test('the store, the setup writes and the projection do not import the old holdings or start structures', () => {
    expect(Object.keys(files)).toHaveLength(4);
    for (const [name, text] of Object.entries(files)) {
      expect(text, name).not.toMatch(/from '\.\.\/domain\/(holdings|startStructures)'/);
    }
  });
  test('the store writes hand placements over the saved game, not through the old game', () => {
    const store = files['./gameStore.ts'];
    for (const name of ['setEnemyUnits', 'setEnemyGround', 'setPlanetControl', 'setDock', 'setPds', 'setStartHolding', 'setLeader', 'setSlice', 'setThundersEdge', 'setFractureActive', 'setFractureSeat', 'toggleIngress']) {
      const line = store.split('\n').find(l => l.trimStart().startsWith(`${name}:`)) ?? '';
      expect(line, name).toMatch(/commit\(/);
      expect(line, name).not.toMatch(/commitOld|commitPlayers|viaGame/);
    }
  });
});
