/**
 * The old per-player model (`Game`, `Entry`, `GameState`, `Holdings`, ...) lives only in src/testing/old, where the
 * tests of the rules and the components speak it as their input language. The application names none of it and imports
 * nothing from src/testing. Nor does it keep the old model's shape under other names: a player is always a `PlayerId`
 * of the table, never `me` against "the opponents", and nothing translates to or from the old ids of players.
 *
 * `PENDING` lists, per rule, the files that still break it while the rewrite is under way: a list must equal what is
 * found, so a file that is fixed has to leave it. Every list is empty at the end; there is no permanent allow-list.
 */
import { describe, expect, test } from 'vitest';

const BANNED = ['GameState', 'Holdings', 'Opponent', 'EntryBody', 'enemyUnits', 'planetControl', 'fromCard', 'gameAs'];
/** The old ids of players and what translated them: `legacyId`, `legacyKey`, `legacyNote` and the like, the key functions, the viewer's own field of points. */
const OLD_KEYS = /\b(?:legacy[A-Z]\w*|playerOfLegacy|playerOfKey|ownerKey|opponentVp)\b/;
/** The viewer named in the logic. The one place it stays is the query parameter `me` of a share link, an external format. */
const ME = /['"`]me['"`]/;
const SHARE_LINK = 'src/domain/shareLink.ts';
const ME_IN_LINK = /query\.(?:get|set)\('me'/g;
/** A list of "the others" beside the viewer, as a field of a type or of a value. */
const OPPONENTS = /\bopponents\??\s*:/;

const PENDING: Record<'banned' | 'oldKeys' | 'me' | 'opponents', string[]> = {
  banned: [
    'src/game/turnFacts.ts',
  ],
  oldKeys: [
    'src/game/abilities/registry.ts',
    'src/game/actions.ts',
    'src/game/edit/start.ts',
    'src/game/edit/table.ts',
    'src/game/edit/turn.ts',
    'src/game/entry.ts',
    'src/game/keys.ts',
    'src/game/resolve/acts.ts',
    'src/game/resolve/cards/play.ts',
    'src/game/resolve/cards/trade.ts',
    'src/game/resolve/holdings.ts',
    'src/game/resolve/hooks.ts',
    'src/game/resolve/index.ts',
    'src/game/resolve/invasion.ts',
    'src/game/resolve/status.ts',
    'src/game/resolve/waive.ts',
    'src/game/screenQueries.ts',
    'src/game/shelf.ts',
    'src/game/tile.ts',
    'src/game/turnFacts.ts',
    'src/game/types.ts',
    'src/state/gameStore.ts',
    'src/state/setupWrites.ts',
    'src/storage/schema.ts',
    'src/ui/components/noteMark.ts',
    'src/ui/drawers/ComponentsPanel.tsx',
    'src/ui/feedback/StepHints.tsx',
    'src/ui/map/TileView.tsx',
    'src/ui/map/stage/ControlPanel.tsx',
    'src/ui/map/stage/useStage.ts',
    'src/ui/plan/StatusFields.tsx',
    'src/ui/plan/StrategySteps.tsx',
    'src/ui/plan/blocks/AgendaChoices.tsx',
    'src/ui/plan/blocks/ChoicesBlock.tsx',
    'src/ui/plan/blocks/LandingBlock.tsx',
    'src/ui/plan/editors/TacticalEditor.tsx',
    'src/ui/plan/editors/TransactionStep.tsx',
    'src/ui/plan/editors/TurnEditor.tsx',
    'src/ui/plan/kernelView.ts',
    'src/ui/players/PlayerList.tsx',
    'src/ui/players/names.ts',
    'src/ui/screens/PlanScreen.tsx',
    'src/ui/units/sprites.ts',
  ],
  me: [
    'src/domain/components.ts',
    'src/domain/effects/components/agenda/standardization.ts',
    'src/domain/effects/components/leader/nekroagent.ts',
    'src/domain/effects/components/promissory/acq.ts',
    'src/domain/effects/entryApply.ts',
    'src/domain/effects/helpers/choices.ts',
    'src/domain/effects/registry.ts',
    'src/domain/effects/types.ts',
    'src/domain/facts.ts',
    'src/domain/hexLayout.ts',
    'src/domain/holdings.ts',
    'src/domain/movement.ts',
    'src/domain/players.ts',
    'src/domain/readers.ts',
    'src/domain/replay/cards/imperial.ts',
    'src/domain/replay/holdings.ts',
    'src/domain/thundersEdge.ts',
    'src/game/abilities/choices.ts',
    'src/game/abilities/facade.ts',
    'src/game/abilities/registry.ts',
    'src/game/abilities/types.ts',
    'src/game/edit/table.ts',
    'src/game/entry.ts',
    'src/game/keys.ts',
    'src/game/planQueries.ts',
    'src/game/resolve/holdings.ts',
    'src/game/screenQueries.ts',
    'src/game/shelf.ts',
    'src/game/tile.ts',
    'src/game/turnFacts.ts',
    'src/game/types.ts',
    'src/state/gameStore.ts',
    'src/state/setupWrites.ts',
    'src/ui/components/noteMark.ts',
    'src/ui/drawers/ComponentsPanel.tsx',
    'src/ui/drawers/ExpeditionWidget.tsx',
    'src/ui/drawers/MapLegend.tsx',
    'src/ui/feedback/StepHints.tsx',
    'src/ui/map/PlanetBadge.tsx',
    'src/ui/map/TileView.tsx',
    'src/ui/map/stage/ControlPanel.tsx',
    'src/ui/map/stage/HexStage.tsx',
    'src/ui/map/stage/PlanetDetails.tsx',
    'src/ui/map/stage/useStage.ts',
    'src/ui/plan/blocks/ResearchBlock.tsx',
    'src/ui/plan/editors/StrategyEditor.tsx',
    'src/ui/plan/kernelView.ts',
    'src/ui/plan/tactical.ts',
    'src/ui/players/PlayerList.tsx',
    'src/ui/screens/PlanScreen.tsx',
    'src/ui/units/sprites.ts',
  ],
  opponents: [
    'src/domain/facts.ts',
    'src/domain/hexLayout.ts',
    'src/game/edit/start.ts',
    'src/game/space.ts',
    'src/ui/map/TileView.tsx',
  ],
};

const files = import.meta.glob<string>(
  ['../**/*.ts', '../**/*.tsx', '!../**/*.test.ts', '!../**/*.test.tsx', '!../**/*.bench.ts', '!../testing/**', '!../ui/testing/**', '!../**/kit.ts', '!../**/*.kit.ts', '!../**/kit-*.ts', '!../**/__oracle__/**'],
  { query: '?raw', import: 'default', eager: true },
);
const named = (path: string): string => (path.startsWith('./') ? path.replace('./', 'src/game/') : path.replace('../', 'src/'));
const offenders = (breaks: (text: string, name: string) => boolean): string[] =>
  Object.entries(files).filter(([path, text]) => breaks(text, named(path))).map(([path]) => named(path)).sort();

describe('the application does not know the old model', () => {
  test('no non-test source file names an old-model identifier', () => {
    expect(offenders(text => BANNED.some(word => new RegExp(`\\b${word}\\b`).test(text)))).toEqual(PENDING.banned);
  });

  test('no non-test source file defines or imports the old `Game` or `Entry`', () => {
    const defines = /\b(?:interface|type)\s+(?:Game|Entry)\b/;
    const imports = /import[^;]*\b(?:Game|Entry)\b[^;]*from\s+'[^']*domain\/types'/;
    expect(offenders(text => defines.test(text) || imports.test(text))).toEqual([]);
  });

  test('no application file imports src/testing: the old model there is the input language of tests only', () => {
    expect(offenders(text => text.includes('/testing/'))).toEqual([]);
  });

  test('no non-test source file names a player by an old id or translates one', () => {
    expect(offenders(text => OLD_KEYS.test(text))).toEqual(PENDING.oldKeys);
  });

  test('no non-test source file says `me`: a player is a `PlayerId` of the table', () => {
    expect(offenders((text, name) => ME.test(name === SHARE_LINK ? text.replace(ME_IN_LINK, '') : text))).toEqual(PENDING.me);
  });

  test('no non-test source file keeps "the opponents" as a field beside the viewer', () => {
    expect(offenders(text => OPPONENTS.test(text))).toEqual(PENDING.opponents);
  });
});
