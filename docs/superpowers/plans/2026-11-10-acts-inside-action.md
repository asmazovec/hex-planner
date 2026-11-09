# Acts Inside an Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** expedition contributions, transactions and Warfare's free movement become acts of a turn, shown and replayed inside their action instead of as actions of their own.

**Architecture:** turn entries (`tactical`, `strategic`, `component`, `pass`) get `acts?: Act[]`; the replay applies an entry, then its acts. Warfare's free tactical stays a linked entry (`fromCard`) internally but is presented and replayed as part of its card (amendment to the spec, see Task 0). Schema 6 attaches old expedition entries to an action.

**Tech Stack:** TypeScript, React 19, Zustand, Zod, Vitest + Testing Library, Vite.

**Spec:** `docs/superpowers/specs/2026-11-10-acts-inside-action-design.md`

## Global Constraints

- Warnings forbid nothing; only the domain creates them, through `violation` (`src/domain/rules/registry.ts`). Each new code: `WARNING_CODES`, `RULES`, ru and en texts, a rules test (`src/domain/rules/contract.test.ts` checks).
- Terms by Hobby World: «Продукция» (commodities), «товары» (trade goods), «вексель» (promissory note); `npm run lint:terms` passes.
- A red test before each change (`red-test-first`); `npm test`, `npm run lint`, `npm run build` green at the end of each task.
- New UI is built from `Section`, `PlayerChoice`, `Stepper`, `EditorFrame`, `HexRemove`, `.in-card`, `WarningList`.
- No commits without the user's word: the plan's commit points are checkpoints only.

## Review Focus

1. A save with an expedition entry whose owner has no turn entry in that round: it must open, keep the expedition and warn `expeditionDetached` (Task 1 test).
2. Removing or switching a Warfare card must remove its free tactical, and that tactical must never show as its own numbered row (Task 4 test).
3. A transaction giving more trade goods or commodities than held warns but still applies what can be applied, with no negative values (Task 2 test).
4. A transaction with an opponent changes the opponent's trade goods in their replayed state, and a rival's transaction with `me` changes mine (Task 2 test).
5. Old saves keep the same forecast after migration (Task 1 test comparing `project(...)` before and after).

---

### Task 0: Spec amendment for Warfare

**Files:** Modify `docs/superpowers/specs/2026-11-10-acts-inside-action-design.md`

- [ ] Replace the `effects.tactical` model, its migration line and the `card-tactical` pick with: the free tactical stays an entry with `fromCard`; it has no row and no number in the plan, shows as an act line «+ Перелёт без жетона: …» under its card and opens as a step of the strategy editor; the replay applies it right after its card and skips it in round order. Reason: the big hex, map picks, arrows and flight replay already work with tactical entries; nothing visible depends on where the body is stored.

### Task 1: Act model, schema 6 and migration

**Files:**
- Modify: `src/domain/types.ts` (Act, Goods, `acts` on turn entries), `src/storage/schema.ts` (act schemas, `CURRENT_SCHEMA = 6`, `withActs` step), `src/state/gameStore.ts` (copyPlan keeps acts)
- Test: `src/storage/schema.test.ts`

**Interfaces — Produces:**
- `type Goods = { tradeGoods?: number; commodities?: number; note?: boolean }`
- `type Act = { kind: 'expedition'; sliceId: string | null; payment: Payment } | { kind: 'transaction'; with: string; give: Goods; get: Goods }`
- `acts?: Act[]` on `tactical`, `strategic`, `component`, `pass` bodies
- `TURN_TYPES = ['tactical', 'strategic', 'component', 'pass'] as const` in `src/domain/types.ts`

- [ ] Write failing tests in `schema.test.ts`:
  - `test('schema 6: an expedition entry joins the previous turn entry of its owner in the round as an act')` — a v5 doc with `[tactical t1, expedition e1]` loads as `[tactical t1 { acts: [{ kind: 'expedition', sliceId, payment }] }]`.
  - `test('schema 6: with no earlier turn entry it joins the next one')`.
  - `test('schema 6: an expedition with no turn entry of its owner in the round stays an entry')`.
  - `test('schema 6: the forecast is the same before and after')` — `project` of the v5 game (with the old replay path kept for the old type) equals `project` after migration for `tradeGoods`, `exhausted`, `vp`.
- [ ] Run `npx vitest run src/storage/schema.test.ts` — FAIL.
- [ ] Implement the types, the zod `act` union, `acts: z.array(act).optional()` on the four turn entry schemas, and `withActs(doc)` as the `schemaVersion === 5` step (owner match by `owner ?? 'me'`, same round, `phase === 'action'`).
- [ ] Run the tests — PASS; run `npm test`.

### Task 2: Replay of acts and their rules

**Files:**
- Create: `src/domain/replay/acts.ts`, `src/domain/rules/lrr/094-transactions.test.ts`, `src/domain/rules/lrr/te-expedition.test.ts`
- Modify: `src/domain/replay/expedition.ts` (drop `noteTurn` and `turn`; `applyExpeditionPart(game, state, part, owner, pack, taken, warnings)` takes the act), `src/domain/replay/index.ts` (apply acts after the entry; keep the legacy `expedition` entry with `expeditionDetached`), `src/domain/types.ts` (`WARNING_CODES` += `transactionRepeated`, `notNeighbor`, `shortCommodities`, `expeditionDetached`; `RuleStep` += `'transaction'`), `src/domain/rules/registry.ts`, `src/ui/feedback/warningPlaces.ts` (`transaction` step → place `acts`), `src/i18n/ru.json`, `src/i18n/en.json`, `src/domain/thundersEdge.ts` (slice owners read acts)

**Interfaces:**
- Consumes: `Act`, `Goods` (Task 1); `gameAs` (`src/domain/players.ts`)
- Produces: `applyActs(game: Game, state: GameState, entry: Entry, pack: DataPack, ctx: ActContext, warnings: Warning[]): void` with `interface ActContext { taken: Set<string>; states: Record<string, GameState> }` (`states` holds `me` and each rival id)

- [ ] Write failing rule tests:
  - 094: `'94.1: a second transaction with the same player in one turn warns'` (`transactionRepeated`); `'94.2: given trade goods leave me and reach them; given commodities reach them as trade goods (21.5)'`; `'94.2: giving more than held warns (shortTradeGoods / shortCommodities) and never goes below zero'`; `'94.2: a rival\'s transaction with me changes my trade goods'`; `test.todo('94.6: agenda transactions — not modelled: out of scope')`.
  - Expedition: `'expedition 5: two expedition acts in one turn warn'`; `'expedition 5: one act in each of two turns does not warn'`; `'expedition 2: a slice taken in an earlier turn warns'`; `'a detached old expedition entry warns expeditionDetached'`.
- [ ] Run them — FAIL.
- [ ] Implement `applyActs`: transactions in order (moving goods between `ctx.states[owner]` and `ctx.states[with]`, clamped at zero, commodities received become trade goods), then expeditions through `applyExpeditionPart`; `transactionRepeated` per counterpart within the entry. In `replay` build `ctx.states = { me: state, ...rivals }` and call `applyActs` after `applyEntry` for turn entries.
- [ ] Run — PASS; `npm test`.

### Task 3: Neighbours

**Files:** Create `src/domain/neighbors.ts`, `src/domain/rules/lrr/060-neighbors.test.ts`; Modify `src/domain/replay/acts.ts`

**Interfaces — Produces:** `areNeighbors(game: Game, a: GameState, b: GameState, pack: DataPack): boolean` — some system holds a unit or a controlled planet of `a` and the same or an adjacent system (`systemsAdjacent` from `./replay/board`) holds one of `b`.

- [ ] Failing tests: `'60: units in one system make neighbours'`, `'60: adjacent systems make neighbours'`, `'60.2: a wormhole makes neighbours'`, `'60: far apart players are not neighbours, a transaction warns notNeighbor'`.
- [ ] Run — FAIL. Implement; call it in `applyActs` before each transaction. Run — PASS.

### Task 4: Plan list — act lines, Warfare's tactical inside its card

**Files:** Modify `src/ui/plan/EntryList.tsx`, `src/domain/route.ts` (`tacticalNumbers` skips `fromCard`), `src/domain/replay/index.ts` (apply the linked tactical right after its card, skip it in order), `src/ui/plan/ActionMenu.tsx` (drop `expedition`), i18n; Test `src/ui/plan/EntryList.test.tsx` (or `panels.test.tsx`), `src/domain/rules/lrr/099-warfare.test.ts`

**Interfaces — Produces:** `actLines(entry: Entry, round: Round, game: Game, pack: DataPack, t: TFunction): string[]` in `src/ui/plan/actLines.ts`.

- [ ] Failing tests: a turn entry with acts shows `+ Сделка с …` / `+ Экспедиция: …` lines; a Warfare card shows `+ Перелёт без жетона: <system>` and its tactical has no row and no number; the next tactical gets number 1; the add menu has no expedition item; Warfare TE replay: the free tactical applies right after the card even when stored later in the round.
- [ ] Run — FAIL; implement; run — PASS.

### Task 5: «В этом ходу» block, act steps, pass editor

**Files:** Create `src/ui/plan/blocks/TurnActs.tsx`, `src/ui/plan/editors/TransactionStep.tsx`, `src/ui/plan/editors/PassEditor.tsx`; Modify `TacticalEditor.tsx`, `StrategyEditor.tsx`, the component editor, `ExpeditionEditor.tsx` (reused as a step: `onBack`), `src/ui/screens/PlanScreen.tsx` (the pass row opens its editor; act steps), i18n, CSS

**Interfaces:**
- `TurnActs({ game, pack, entry, before, warnings, onChange(acts: Act[]), onOpen(index: number) })`
- `TransactionStep({ game, pack, act, before, warnings, onChange(act), onBack, onRemove })`

- [ ] Failing tests (`src/ui/plan/editors/TurnActs.test.tsx`): the block lists acts as `.in-card` rows with a cross; «+ Сделка» adds `{ kind: 'transaction', with: <first neighbour or first opponent>, give: {}, get: {} }`; «+ Экспедиция» shows only with Thunder's Edge and free slices; the transaction step changes `give.tradeGoods` by its stepper and `with` by `PlayerChoice`; the pass row opens an editor with the block.
- [ ] Run — FAIL; implement; run — PASS; `npm test`, `npm run lint`, `npm run lint:terms`, `npm run build`.

### Task 6: Full check

- [ ] `npm test`, `npm run lint`, `npm run lint:terms`, `npm run build`, `npm run e2e`.
- [ ] In the app: a tactical action with a transaction and an expedition; a Warfare TE card with its movement; an old save with an expedition entry.
