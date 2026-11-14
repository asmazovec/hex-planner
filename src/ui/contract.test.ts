/** The screens that read the game model only: what they know of a player and the table comes from the views and the queries of the kernel. */
import { describe, expect, test } from 'vitest';

/** The files moved so far; each next step of the move adds its own. */
export const KERNEL_ONLY = [
  'drawers/ComponentTabs.tsx', 'drawers/ComponentsPanel.tsx', 'drawers/ExpeditionWidget.tsx', 'drawers/FractureControl.tsx', 'drawers/MapLegend.tsx', 'drawers/ThundersEdgePanel.tsx',
  'players/FactionCard.tsx', 'players/FactionComponents.tsx', 'players/FactionPicker.tsx', 'players/PlayerList.tsx', 'players/ShipStats.tsx', 'players/names.ts', 'players/useSeatDrag.ts',
  'screens/GameScreen.tsx', 'screens/EnergySettings.tsx', 'screens/LegalNotice.tsx',
  'map/HexMap.tsx', 'map/TileView.tsx', 'map/PlanetBadge.tsx', 'map/useFractureFlight.ts', 'map/offMapHomes.ts', 'map/marks.tsx', 'map/RouteArrows.tsx', 'map/FlightLayer.tsx',
  'map/stage/ControlPanel.tsx', 'map/stage/BuildPanel.tsx', 'map/stage/PlanetDetails.tsx', 'map/stage/UnitShop.tsx', 'map/stage/BattlePanel.tsx', 'map/stage/SetupPanel.tsx', 'map/stage/HexStage.tsx',
  'map/geometry.ts', 'map/edgePan.ts', 'map/useArrowDrag.ts', 'map/usePanZoom.ts', 'map/viewLimits.ts',
  'feedback/StepHints.tsx', 'feedback/WarningText.tsx', 'feedback/warningPlaces.ts', 'components/noteMark.ts', 'map/systemName.ts',
  'plan/SummaryBar.tsx', 'plan/actLines.ts', 'screens/plan/mapMarks.ts', 'screens/plan/useFlightLoop.tsx',
  'plan/blocks/LandingBlock.tsx', 'plan/blocks/PaymentBlock.tsx', 'plan/blocks/TokenTiles.tsx', 'plan/blocks/ScoredBlock.tsx', 'plan/blocks/GainsBlock.tsx', 'plan/blocks/UsesBlock.tsx', 'plan/blocks/ChoicesBlock.tsx',
  'plan/editors/ExpeditionEditor.tsx', 'plan/editors/TurnEditor.tsx',
  'plan/editors/AdjustmentEditor.tsx', 'plan/editors/TransactionStep.tsx', 'plan/blocks/AgendaChoices.tsx', 'plan/editors/TacticalEditor.tsx', 'plan/editors/UnitPicker.tsx', 'plan/TacticalSteps.tsx', 'units/UnitPictures.tsx', 'plan/StrategySteps.tsx', 'map/stage/turnPurchases.ts',
  'plan/editors/StrategyEditor.tsx', 'plan/blocks/EntryUpgrades.tsx', 'plan/editors/cards/construction.tsx', 'plan/editors/cards/diplomacy.tsx', 'plan/editors/cards/imperial.tsx', 'plan/editors/cards/index.ts',
  'plan/editors/cards/kit.ts', 'plan/editors/cards/leadership.tsx', 'plan/editors/cards/politics.tsx', 'plan/editors/cards/technology.tsx', 'plan/editors/cards/trade.tsx', 'plan/editors/cards/warfare.tsx',
  'plan/StatusFields.tsx', 'plan/EntrySteps.tsx', 'plan/EntryList.tsx', 'plan/editors/TurnHost.tsx',
  'components/ComponentPicker.tsx', 'components/useComponentSearch.ts', 'components/ComponentCard.tsx', 'components/ComponentSearchField.tsx', 'plan/blocks/ComponentSlot.tsx', 'plan/blocks/ResearchBlock.tsx', 'plan/blocks/TurnActs.tsx', 'plan/editors/TacticalEditorHost.tsx', 'plan/editors/UnitPickerHost.tsx', 'plan/tactical.ts', 'plan/kernelView.ts',
  'screens/PlanScreen.tsx', 'screens/plan/pick.ts',
  'common/expansions.ts', 'common/gameAddress.ts', 'common/motion.ts', 'common/preferences.ts', 'common/scrollbar.ts', 'common/usePack.ts', 'common/useReorderDrag.ts', 'feedback/Banner.tsx', 'map/builder/TileNumberInput.tsx', 'overlays/Drawer.tsx', 'overlays/Modal.tsx', 'overlays/Popover.tsx', 'plan/ActionMenu.tsx', 'plan/blocks/CardGrid.tsx', 'primitives/ConfirmBar.tsx', 'primitives/EditorFrame.tsx', 'primitives/EditorPart.tsx', 'primitives/Icon.tsx', 'primitives/MapPickButton.tsx', 'primitives/NoteField.tsx', 'primitives/player.tsx', 'primitives/Section.tsx', 'primitives/SectionTitle.tsx', 'primitives/Stepper.tsx', 'primitives/Vanishing.tsx', 'screens/plan/useDrawers.ts', 'units/TokenLayer.tsx', 'units/unitArt.ts', 'units/UnitDraft.tsx', 'units/UnitIcon.tsx', 'units/unitOrder.ts', 'units/unitsText.ts', 'units/UnitTile.tsx', 'units/UnitToken.tsx',
];

/** The files of the list above that no longer take the old `Game` either: they read the table and the board. */
export const WITHOUT_GAME = [
  'feedback/StepHints.tsx', 'feedback/WarningText.tsx', 'feedback/warningPlaces.ts', 'components/noteMark.ts', 'map/systemName.ts',
  'plan/SummaryBar.tsx', 'plan/actLines.ts',
  'plan/blocks/LandingBlock.tsx', 'plan/blocks/PaymentBlock.tsx', 'plan/blocks/TokenTiles.tsx', 'plan/blocks/ScoredBlock.tsx', 'plan/blocks/GainsBlock.tsx', 'plan/blocks/UsesBlock.tsx', 'plan/blocks/ChoicesBlock.tsx',
  'plan/editors/ExpeditionEditor.tsx', 'plan/editors/TurnEditor.tsx',
  'plan/editors/AdjustmentEditor.tsx', 'plan/editors/TransactionStep.tsx', 'plan/blocks/AgendaChoices.tsx', 'plan/editors/TacticalEditor.tsx', 'plan/editors/UnitPicker.tsx', 'plan/TacticalSteps.tsx', 'units/UnitPictures.tsx', 'plan/StrategySteps.tsx', 'map/stage/turnPurchases.ts',
  'plan/editors/StrategyEditor.tsx', 'plan/blocks/EntryUpgrades.tsx', 'plan/editors/cards/construction.tsx', 'plan/editors/cards/diplomacy.tsx', 'plan/editors/cards/imperial.tsx', 'plan/editors/cards/index.ts',
  'plan/editors/cards/kit.ts', 'plan/editors/cards/leadership.tsx', 'plan/editors/cards/politics.tsx', 'plan/editors/cards/technology.tsx', 'plan/editors/cards/trade.tsx', 'plan/editors/cards/warfare.tsx',
  'plan/StatusFields.tsx', 'plan/EntrySteps.tsx', 'plan/EntryList.tsx', 'plan/editors/TurnHost.tsx',
  'components/ComponentPicker.tsx', 'components/useComponentSearch.ts', 'components/ComponentCard.tsx', 'components/ComponentSearchField.tsx', 'plan/blocks/ComponentSlot.tsx', 'plan/blocks/ResearchBlock.tsx', 'plan/blocks/TurnActs.tsx', 'plan/editors/TacticalEditorHost.tsx', 'plan/editors/UnitPickerHost.tsx', 'plan/tactical.ts', 'plan/kernelView.ts',
  'screens/PlanScreen.tsx', 'screens/plan/pick.ts',
  'common/expansions.ts', 'common/gameAddress.ts', 'common/motion.ts', 'common/preferences.ts', 'common/scrollbar.ts', 'common/usePack.ts', 'common/useReorderDrag.ts', 'feedback/Banner.tsx', 'map/builder/TileNumberInput.tsx', 'overlays/Drawer.tsx', 'overlays/Modal.tsx', 'overlays/Popover.tsx', 'plan/ActionMenu.tsx', 'plan/blocks/CardGrid.tsx', 'primitives/ConfirmBar.tsx', 'primitives/EditorFrame.tsx', 'primitives/EditorPart.tsx', 'primitives/Icon.tsx', 'primitives/MapPickButton.tsx', 'primitives/NoteField.tsx', 'primitives/player.tsx', 'primitives/Section.tsx', 'primitives/SectionTitle.tsx', 'primitives/Stepper.tsx', 'primitives/Vanishing.tsx', 'screens/plan/useDrawers.ts', 'units/TokenLayer.tsx', 'units/unitArt.ts', 'units/UnitDraft.tsx', 'units/UnitIcon.tsx', 'units/unitOrder.ts', 'units/unitsText.ts', 'units/UnitTile.tsx', 'units/UnitToken.tsx',
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

  test('the files that read the table take no old game', () => {
    for (const file of WITHOUT_GAME) {
      expect(KERNEL_ONLY, file).toContain(file);
      const imports = [...text(file).matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'([^']+)'/g)];
      for (const [, names] of imports) expect(names, `${file} imports the old game`).not.toMatch(/\bGame\b/);
    }
  });
});
