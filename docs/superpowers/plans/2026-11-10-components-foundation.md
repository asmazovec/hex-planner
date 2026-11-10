# Components Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every game component is in the data with its printed text, is tracked per player, can be found by fuzzy search in one drawer, and plugs into the replay through an effects registry; the replay is computed once and incrementally.

**Architecture:** The replay becomes a `Timeline` of frozen per-entry snapshots that restarts from the first changed entry; a projection controller in `src/state` hands screens ready states. Components are a flat catalog built over the packs, their texts in separate files; holdings are part of `GameState`, derived from entries. Effects live one file per component behind named modifier points the replay steps already pass through.

**Tech Stack:** TypeScript, React, zustand, vitest (+ `vitest bench`), Playwright. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-10-components-design.md`

## Global Constraints

- Warnings forbid nothing; every `Warning` is created by the domain through `violation` and listed in `RULES`.
- `src/domain` has no React and no browser APIs. `src/ui` builds from the shared containers (`Section`, `SectionTitle`, `PlayerChoice`, `Modal`, `DrawerSheet`, `Popover`, `HexRemove`, `.in-card`, `.icon-button`).
- Selected is blue, done is green, gold only for values.
- Game names stay English; interface strings go through i18n in ru and en; `npm run lint:terms` stays clean.
- Component texts are verbatim from the source, kept in `src/data/texts/`, never retold.
- Old saves are not migrated.
- Every fix and feature starts with a failing test.
- After each task: `npx vitest run`, `npm run lint`, `npm run build` are clean.

## Review Focus

1. A plan edited in the middle (entry reordered, removed, status flipped): the incremental timeline must equal a full replay. Test in Task 1.
2. A save from the old format in IndexedDB: it must stay listed, exportable and deletable, never crash or be overwritten. Test in Task 3.
3. A component id that no longer exists in the data (pack switched off, data rebuilt): holdings ignore it without a crash and the drawer shows nothing for it. Test in Task 6.
4. Search input with one letter, with only spaces, in the wrong keyboard layout, with a typo: no crash, sensible order. Test in Task 5.
5. A rival's holdings: shown and edited in the drawer the same way as mine; an entry of a rival changes the rival's holdings only. Test in Task 6.

---

### Task 1: Timeline — one pass, frozen snapshots, restart from the edit

**Files:**
- Create: `src/domain/replay/timeline.ts`, `src/domain/replay/timeline.test.ts`, `src/domain/replay/timeline.bench.ts`
- Modify: `src/domain/replay/index.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Frame { entryId: string; before: GameState; after: GameState; warnings: Warning[] }
  export interface Timeline { game: Game; plan: Plan; filter: 'now' | 'forecast'; frames: Frame[]; byEntry: Map<string, Frame>; end: GameState }
  export function timeline(game: Game, plan: Plan, filter: 'now' | 'forecast', pack: DataPack, previous?: Timeline): Timeline
  ```
  `before`/`after` are the whole board (mine with `rivals`), deep-frozen in tests, never mutated afterwards. `project`, `stateBeforeEntry`, `stateAfterEntry`, `boardBeforeEntry`, `blockersBefore` keep their signatures and read a `Timeline`.

- [ ] **Step 1:** Write `timeline.bench.ts`: a 6-player game, 6 rounds × 12 entries (tactical with moves and landings, strategic, status). Bench `project` full, and `stateBeforeEntry` of the last entry. Run `npx vitest bench src/domain/replay/timeline.bench.ts`; record the numbers at the bottom of this plan.
- [ ] **Step 2:** Write failing tests in `timeline.test.ts`:
  - `frames follow the replay order and end equals project().state` (fixture from `src/storage/fixture.ts`).
  - `a frame's before is the previous frame's after`.
  - `an edit of the last entry reuses every earlier frame by reference` (`toBe`).
  - `incremental equals full` — for each of: reorder two entries, remove one, flip a status to cancelled, change a round's strategy card: `timeline(g2, p2, f, pack, prev)` deep-equals `timeline(g2, p2, f, pack)`.
  - `a change of the game outside the plan (map, opponents, start) reuses nothing`.
- [ ] **Step 3:** Run them: FAIL (module missing).
- [ ] **Step 4:** Implement. The existing `replay` loop moves into `timeline.ts`; the state it mutates is a working copy, and after each entry a snapshot is taken with `snapshot(state)`: a shallow copy of `GameState` and of each record the entry may touch (`systems`, `ground`, `control`, `pds`, `holdings`, `rivals` one level down), values shared. Reuse rule: walk the ordered entries of old and new plan together; frames are reusable while `entry` references are identical, the round objects' `strategyCard`/`backupCard` equal, and `game` minus `plans` is the same by shallow field comparison. The replay context that is not in `GameState` (`CardRound`, `ActContext.taken`, `RoundFlow`, `statusDone`) is stored on the frame as `carry` and restored when restarting.
- [ ] **Step 5:** Rewrite `index.ts` exports over `timeline`; delete the `stopBefore`/`stopAfter` parameters.
- [ ] **Step 6:** `npx vitest run src/domain` — PASS. Re-run the bench, record numbers. Commit `perf(replay): one pass with per-entry snapshots, restart from the edit`.

### Task 2: Projection controller; the store split

**Files:**
- Create: `src/state/projection.ts`, `src/state/projection.test.ts`, `src/state/history.ts`, `src/state/autosave.ts`
- Modify: `src/state/gameStore.ts`, `src/ui/screens/PlanScreen.tsx`, `src/ui/plan/EntryList.tsx`, `src/ui/screens/plan/useFlightLoop.tsx`, `src/ui/map/stage/useStage.ts`, `src/domain/rules/contract.test.ts`

**Interfaces:**
- Consumes: `timeline` (Task 1).
- Produces: `useForecast(): Projection`, `useNow(): Projection`, `useStateBefore(entryId): GameState | null`, `useStateAfter(entryId): GameState | null`, `useBoardBefore(entryId)`, `useBlockersBefore(entryId): Set<string>`; `timelineOf(game, filter): Timeline` for non-React callers. `history.ts`: `push(game)`, `pop(): Game | undefined`, `clear()`, `size()`. `autosave.ts`: `queueSave(game, onResult)`, `flushSaves()`.

- [ ] **Step 1:** Failing tests: `projection keeps one timeline per plan and filter and reuses frames across edits` (spy on `timeline`'s `previous` argument via frame identity); contract test `src/ui does not import replay functions` — grep of `src/ui/**` for `project(`, `stateBeforeEntry`, `stateAfterEntry`, `boardBeforeEntry`, `blockersBefore` imports must be empty.
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement `projection.ts` as a module-level cache keyed by `plan.id + filter`, dropped when the game id changes; hooks select from `useGame`. Move history and autosave out of `gameStore.ts` unchanged in behaviour.
- [ ] **Step 4:** Replace every direct replay call in `src/ui` with the hooks.
- [ ] **Step 5:** `npx vitest run`, `npm run e2e` — PASS. Commit `refactor(state): projection controller, history and autosave as modules`.

### Task 3: New save format

**Files:**
- Modify: `src/storage/schema.ts`, `src/storage/db.ts`, `src/storage/transfer.ts`, their tests, `src/domain/newGame.ts`, `src/domain/types.ts`, `src/i18n/*`

**Interfaces:**
- Produces: `Game.format: 'ti4-planner/2'`, `schemaVersion: 1`; `parseGame(raw): Game` throws `OldFormatError` for anything without the format field.

- [ ] **Step 1:** Failing tests: `a save without format is listed as broken with the old-version message and is never rewritten`; `export and import round-trip a new game`; `import of an old file is refused with the same message`.
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Delete the migrations and their tests; `parseGame` validates the new shape only. Message keys `storage.oldFormat` (ru: «Сохранено прежней версией приложения», en: “Saved by an earlier version of the app”). Remove the `expedition` entry type and every "read from saves only" branch.
- [ ] **Step 4:** PASS. Commit `feat(storage)!: new save format, earlier saves are not read`.

### Task 4: Component catalog and printed texts

**Files:**
- Modify: `scripts/build-data.ts`, `scripts/build-data.test.ts`, `src/domain/types.ts`, `src/data/loadPack.ts`, `src/data/provenance.json`, `docs/data-verification.md`, `README.md`
- Create: `src/data/texts/{base,pok,te}.json`, `src/data/texts/NOTICE.md`, `src/data/packs/*` gain `components`, `src/domain/components.ts`, `src/domain/components.test.ts`
- Delete: `src/data/techSummaries.ts`, `src/data/sheetSummaries.json`, `src/data/sheetSummaries.ts`, `src/data/legendarySummaries.ts`, `src/data/shipSummaries.ts`, `src/data/cardSummaries.ts` and their tests

**Interfaces:**
- Produces: `ComponentKind`, `ComponentDef` exactly as in the spec §3.1; `DataPack.components: ComponentDef[]` (cards that have no home elsewhere), `DataPack.texts: Record<string, string>`; `componentsOf(pack): ComponentDef[]` (all kinds, technologies and sheet items included, ids `'<kind>:<sourceId>'`); `componentById(pack, id): ComponentDef | undefined`; `textOf(pack, id): string`.

- [ ] **Step 1:** Extend `WANTED` with `action_cards|agendas|relics|explores|attachments|promissory_notes|public_objectives|secret_objectives`; run `npx tsx scripts/build-data.ts` to fill the cache; read one file of each directory to fix the field names used below in the script's `Source*` interfaces.
- [ ] **Step 2:** Failing tests in `scripts/build-data.test.ts`: every component has a non-empty `text`; ids are unique; every `faction` exists; only sources base / pok / codex* / thunders_edge are present; per-kind per-pack counts equal a table written into `docs/data-verification.md` from the source at this commit. In `components.test.ts`: `componentsOf` includes every technology, leader, ability, mech, breakthrough and legendary planet of the pack.
- [ ] **Step 3:** Run: FAIL.
- [ ] **Step 4:** Implement the build: one `Source*` interface per directory, `packOfSource` filter, texts written to `src/data/texts/<pack>.json`, excluded sources recorded in provenance. Replace every summary lookup in `src/ui` (`FactionCard`, `FactionComponents`, `UpgradesPanel`/`ShipNotes`, `PlanetDetails`, `MapLegend`, strategy card grid) with `textOf`.
- [ ] **Step 5:** Write `src/data/texts/NOTICE.md` (texts are the publisher's, not under MIT, source and commit) and link it from README.
- [ ] **Step 6:** PASS, `npm run lint:terms` clean (add the texts directory to Vale's ignore: they are quotations). Commit `feat(data): every component with its printed text`.

### Task 5: Fuzzy search

**Files:**
- Create: `src/domain/fuzzy.ts`, `src/domain/fuzzy.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface SearchItem { id: string; name: string; text: string }
  export interface SearchIndex { /* opaque */ }
  export function buildIndex(items: SearchItem[]): SearchIndex
  export function search(index: SearchIndex, query: string, limit?: number): { id: string; score: number }[]
  ```

- [ ] **Step 1:** Failing tests:
  - `prefix of a word of the name ranks first`: "grav" → Gravity Drive before a card that mentions gravity in its text.
  - `one typo per four letters is forgiven`: "sabotge" → Sabotage; "sbtg" → nothing.
  - `words in any order`: "drive gravity" → Gravity Drive.
  - `wrong layout`: "пкфмшен" (gravity typed on the Russian layout) → Gravity Drive.
  - `name outranks text; text still matches`.
  - `empty, spaces, one letter`: `[]` for empty; one letter matches word starts only.
  - `limit caps the result; order is stable for equal scores (by name)`.
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement: normalise (lowercase, strip punctuation, map ЙЦУКЕН keys to QWERTY when the query has Cyrillic letters and no direct hit); per query word the best of: name word prefix 100, name substring 70, name word within edit distance ⌊len/4⌋ 50, text word prefix 20, text substring 10; an item matches when every query word scores; score is the sum. Bounded Levenshtein with early exit.
- [ ] **Step 4:** PASS. Commit `feat(domain): fuzzy search over components`.

### Task 6: Holdings

**Files:**
- Create: `src/domain/holdings.ts`, `src/domain/holdings.test.ts`, `src/domain/replay/holdings.ts`
- Modify: `src/domain/types.ts`, `src/domain/replay/state.ts`, `src/domain/replay/timeline.ts`, `src/domain/replay/cards/technology.ts`, `src/domain/replay/cards.ts`, `src/domain/replay/transport.ts`, `src/domain/replay/production.ts`, `src/domain/movement.ts`, `src/domain/unitStats.ts`, `src/domain/newGame.ts`, `src/domain/players.ts`, `src/state/gameStore.ts`, `src/domain/rules/registry.ts`, `src/i18n/*`, `src/domain/rules/lrr/090-technology.test.ts`

**Interfaces:**
- Consumes: `componentById` (Task 4).
- Produces: `Holdings` as in the spec §4.1; `GameState.holdings: Holdings`; `GameState.laws`, `revealed`, `attachments` on my state only; `Game.start: { me: StartHoldings; opponents: Record<string, StartHoldings> }` where `StartHoldings = Partial<Pick<Holdings, 'technologies' | 'hand' | 'relics' | 'promissory' | 'leaders' | 'breakthrough' | 'scored' | 'secrets'>>`; entry fields `gains?: string[]`, `spends?: string[]` on every `EntryBody`; `{ type: 'component'; componentId?: string; note: string; choices?: Record<string, string | number> }`; `CardEffects.researched?: string[]`; `upgradesOf(holdings, pack): UpgradeId[]` (the one bridge the stat functions use); store commands `setStartHolding(player, kind, id, present)`, `setLeader(player, id, state | null)`. Warning codes `componentNotHeld`, `componentExhausted`.
- Removed: `Game.upgrades`, `GameState.upgrades`, `CardPlay.upgrades`, `toggleUpgrade`.

- [ ] **Step 1:** Failing tests in `holdings.test.ts`: a new game holds its faction's starting technologies; `gains` of an entry add to the owner's holdings and `spends` remove one copy; a rival's entry changes the rival only; an unknown id is ignored (Review Focus 3); playing a component not held warns `componentNotHeld` and still applies; researching `technology:<unit upgrade>` raises that unit's stats exactly as the old `upgrades` did (reuse the assertions of the existing upgrade tests); the status phase readies `holdings.exhausted`.
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement; switch every reader of `upgrades` to `upgradesOf`. Register the two codes in `WARNING_CODES`, `RULES`, ru/en texts.
- [ ] **Step 4:** PASS (`contract.test.ts` included). Commit `feat(domain): holdings derived from entries; unit upgrades are technologies`.

### Task 7: Effects registry

**Files:**
- Create: `src/domain/effects/types.ts`, `src/domain/effects/registry.ts`, `src/domain/effects/apply.ts`, `src/domain/effects/unitUpgrades.ts`, `src/domain/effects/contract.test.ts`, `src/domain/effects/apply.test.ts`
- Modify: `src/domain/movement.ts`, `src/domain/replay/transport.ts`, `src/domain/replay/production.ts`, `src/domain/unitStats.ts`

**Interfaces:**
- Produces: `EffectTier`, `ComponentEffect`, `Modifiers` as in the spec §5.1; `effectOf(id): ComponentEffect` (default `{ tier: 'hint', rule: '' }` is NOT implicit: the registry lists every id, generated defaults live in `registry.ts` as `hintsFor(pack)`); `applied<K extends keyof Modifiers>(pack, holdings, point: K, base: number, ctx: ModifierContext[K]): { value: number; by: string[] }` — `by` names the components that changed the value.

- [ ] **Step 1:** Failing tests: contract — every `componentsOf(fullPack)` id has an effect; every `passive`/`play` effect id appears in a test title under `src/domain/effects/` or `src/domain/rules/`. `apply.test.ts` — an exhausted component does not modify; two modifiers stack in registry order; `by` lists both.
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement; move the unit-upgrade stat changes (speed, capacity, cost, production of Space Dock II, Fighter II) onto `Modifiers` in `unitUpgrades.ts`, generated from `UnitDef.levels` so no number is typed by hand. The four step files ask `applied(...)` instead of reading levels.
- [ ] **Step 4:** PASS, all existing rule tests unchanged. Commit `feat(domain): effects registry; unit upgrades run through it`.

### Task 8: The “Components” drawer and the picker

**Files:**
- Create: `src/ui/drawers/ComponentsPanel.tsx`, `src/ui/drawers/ComponentsPanel.test.tsx`, `src/ui/components/ComponentCard.tsx`, `src/ui/components/ComponentPicker.tsx`, `src/ui/components/ComponentPicker.test.tsx`, `src/ui/components/useComponentSearch.ts`, `e2e/components.spec.ts`
- Modify: `src/ui/screens/plan/useDrawers.ts`, `src/ui/screens/PlanScreen.tsx`, `src/ui/theme.css`, `src/i18n/*`, `src/ui/plan/editors/cards/technology.tsx`, `src/ui/plan/editors/TurnEditor.tsx`
- Delete: `src/ui/drawers/UpgradesPanel.tsx` (its unit cards move into the technologies section)

**Interfaces:**
- Consumes: `componentsOf`, `textOf`, `buildIndex`, `search`, `Holdings`, store commands of Task 6.
- Produces: `<ComponentCard def held state onRemove? onAdd? source? />`, `<ComponentPicker kinds? player onPick />` (a `Modal` with the search field and results), `useComponentSearch(pack, kinds?) → (query) => ComponentDef[]`.

- [ ] **Step 1:** Failing component tests: the drawer lists my starting technologies under “Technologies”; typing “sabotge” shows Sabotage with an add button, pressing it puts it under “Action cards”; switching `PlayerChoice` to a rival shows and edits the rival's; a holding that came from a plan entry shows “с раунда N” and has no remove; an empty section is one collapsed line. Picker: `onPick` gets the id; `kinds` filters.
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement from the shared containers only; card text opens in `Popover`; search input debounced by `useDeferredValue`; results capped at 30. i18n keys under `components.*` in ru and en.
- [ ] **Step 4:** Technology editor: the research row opens the picker with `kinds=['technology']` and writes `effects.researched`; the turn editor's component action opens the picker and writes `componentId`.
- [ ] **Step 5:** e2e: start a game, open the drawer, add a relic through search, reload, it is still there.
- [ ] **Step 6:** Verify in the browser at 1180×820 (drawer open, search, popover, rival view); screenshot. Commit `feat(ui): one drawer for everything a player holds, with fuzzy search`.

### Task 9: Hints in step blocks

**Files:**
- Create: `src/ui/feedback/StepHints.tsx`, `src/ui/feedback/StepHints.test.tsx`, `src/domain/effects/hints.ts`, `src/domain/effects/hints.test.ts`
- Modify: `src/domain/effects/registry.ts`, the step blocks of `TacticalEditor` (combat, landing, production), `PaymentBlock`

**Interfaces:**
- Produces: `hintsAt(pack, state, step: RuleStep, players: string[]): ComponentDef[]`.

- [ ] **Step 1:** Failing tests: an action card whose source phase/window is combat is returned for `combat` when on the hand of a participant and not otherwise; `StepHints` renders names, text on press, nothing when empty.
- [ ] **Step 2:** Run: FAIL.
- [ ] **Step 3:** Implement; `hintAt` derived from the source's window fields where present.
- [ ] **Step 4:** PASS. Commit `feat(ui): held components shown as hints in the step they belong to`.

### Task 10: Documents

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-11-05-ti4-planner-design.md` (§2 “Не входит”, §3 “Улучшения”, §4 “Правки”), `docs/phase1/rules-tests.md`, knowledge-rag `ti4/cards/*.md` headers (drop “do not copy these texts into the app”)

- [ ] **Step 1:** Rewrite the affected paragraphs to the new behaviour; `npm run lint:terms` clean. Commit `docs: components are tracked and applied by the app`.

---

## Bench numbers

(filled in by Task 1)
