/** The screens that read the game model only: what they know of a player and the table comes from the views and the queries of the kernel. */
import { describe, expect, test } from 'vitest';

/** The files moved so far; each next step of the move adds its own. */
export const KERNEL_ONLY = [
  'drawers/ComponentTabs.tsx', 'drawers/ComponentsPanel.tsx', 'drawers/ExpeditionWidget.tsx', 'drawers/FractureControl.tsx', 'drawers/MapLegend.tsx', 'drawers/ThundersEdgePanel.tsx',
  'players/FactionCard.tsx', 'players/FactionComponents.tsx', 'players/FactionPicker.tsx', 'players/PlayerList.tsx', 'players/ShipStats.tsx', 'players/names.ts', 'players/useSeatDrag.ts',
  'screens/GameScreen.tsx', 'screens/EnergySettings.tsx', 'screens/LegalNotice.tsx',
  'map/HexMap.tsx', 'map/TileView.tsx', 'map/PlanetBadge.tsx', 'map/useFractureFlight.ts', 'map/offMapHomes.ts', 'map/marks.tsx', 'map/RouteArrows.tsx', 'map/FlightLayer.tsx',
  'map/geometry.ts', 'map/edgePan.ts', 'map/useArrowDrag.ts', 'map/usePanZoom.ts', 'map/viewLimits.ts',
];

const raw = import.meta.glob<string>(['./**/*.ts', './**/*.tsx', '!./**/*.test.*'], { query: '?raw', import: 'default', eager: true });
const text = (file: string): string => {
  const found = raw[`./${file}`];
  if (found === undefined) throw new Error(`${file} is not a file of src/ui`);
  return found;
};

describe('the screens that read the game model only', () => {
  test('every file of the list exists', () => {
    for (const file of KERNEL_ONLY) expect(() => text(file), file).not.toThrow();
  });

  test('none imports the old per-player state or its holders, or reads a state built by the bridge', () => {
    for (const file of KERNEL_ONLY) {
      const source = text(file);
      const imports = [...source.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g)];
      for (const [, names, path] of imports) {
        expect(names, `${file} imports the type of the old state`).not.toMatch(/\b(GameState|Holdings)\b/);
        expect(path, `${file} imports ${path}`).not.toMatch(/domain\/replay|effects\/registry|legacyViews|fromLegacy/);
      }
      expect(source, `${file} reads a state of the old model`).not.toMatch(/\bstate\.(holdings|rivals|laws|opponentVp)\b|\.rivals\?*\.\[|opponentVp/);
    }
  });
});
