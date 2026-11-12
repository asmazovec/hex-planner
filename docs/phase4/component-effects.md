# Component effects: the guide for a batch

Every component of the game (697 with both expansions) gets its effect written and tested. The work is split into
batches of about twenty ([batches/README.md](batches/README.md), `npm run plan:effects`); one agent takes one batch.
Thirty-five agents work in parallel, so the first rule is about files:

**You edit only the files of your batch's components and new files of your own.** Adding a component, a warning code
or a test touches no shared file. If a shared file must change (a new point of the count, a new field of an entry),
the change is minimal and additive, and your report lists it with the reason.

Read CLAUDE.md first. Check every rule in the knowledge-rag corpus (`mcp__knowledge-rag__search_knowledge`: the LRR
point, the faction's notes and rulings) before modelling it. The component's printed text is in `src/data/texts/*.json`
and is never edited.

## The idea

The replay of a plan checks the rules as the Rules Reference alone has them and never names a component. Every breach
is a `Warning`; a warning forbids nothing. A component then does one of four things:

| The text of the component | What you write | Example |
| --- | --- | --- |
| lets the player do what a rule forbids ("can", "may", "is not limited by", "does not count against") | a **waiver**: the warning is still made and still listed, marked as allowed by the component | [`leader/letnevhero.ts`](../../src/domain/effects/components/leader/letnevhero.ts), [`ability/miniaturization.ts`](../../src/domain/effects/components/ability/miniaturization.ts), [`mech/argent_mech.ts`](../../src/domain/effects/components/mech/argent_mech.ts) |
| changes a number the count uses (a limit, a cost, a move value) | a **modify** of a named point: the check then runs against the new number, nothing is listed as waived | [`ability/armada.ts`](../../src/domain/effects/components/ability/armada.ts) |
| changes the board when it is played (gains, places, removes) | a **play** function | none yet: `EffectTurn` in `types.ts` |
| speaks of something the plan does not count (combat rolls, votes, reactions) | a **hint**: the text is shown in the block of its step | every component without a file |

Waiver or modify? If the warning would name a different number with the component in force, it is a modify (Armada:
"2 more than the tokens in your fleet pool", so the sixth ship is warned of against 5). If the rule simply stops
applying, or applies to fewer units than the check counted, it is a waiver, narrowed with `when` (Aerie Sentinel: the
load without the mechs must fit). One component may have both.

## The contract

`src/domain/effects/types.ts`:

```ts
export type EffectTier = 'passive' | 'play' | 'hint';

export interface ComponentEffect {
  tier: EffectTier;
  /** The LRR point the effect stands on; the component's own id when its printed text is the rule. */
  rule: string;
  /** passive only: the changes to the points of the count, while the component is in force. */
  modify?: Partial<Modifiers>;
  /** play only: what happens when an entry plays the component with its choices. */
  play?: (turn: EffectTurn) => void;
  /** hint only: the steps in whose block the reminder stands. */
  hintAt?: RuleStep[];
  /** Any tier: the checks the component lifts. */
  waive?: Waiver[];
}

export interface Waiver {
  code: AnyWarningCode;          // the warning lifted
  rule: string;                  // the sentence of the component's text, or the LRR point, that lifts it
  when?: (warning: Warning, ctx: WaiverContext) => boolean;   // narrows it to what the text covers
  lasts?: 'round';               // play and hint only: from the entry that names it to the end of the round
}

export interface WaiverContext {
  pack: DataPack;
  game: Game;        // as the owner of the entry sees it: game.faction is theirs
  entry?: Entry;     // none for a check of the board itself (units placed by hand)
  before: GameState; // the owner's state just before the entry
  after: GameState;  // and after it
  shared: GameState; // my state: laws, revealed objectives, attachments
}
```

When a component's waivers hold (`src/domain/effects/waivers.ts`, the one place that applies them):

- **`passive`**: for every entry of the player while the component is **in force** (`inForce` in `registry.ts`): the
  technologies, relics, promissory notes and leaders they hold (exhausted or not; a purged or locked leader is not),
  the abilities and the mech of their faction sheet, their breakthrough once held, the legendary planets they control,
  the laws in play.
- **`play`** and **`hint`**: for the entry that **names** the component: its component action (`componentId`), its
  `spends` (an action card discarded is a card played), its `uses`. With `lasts: 'round'` also for the same player's
  later entries of that round.

An ability worded "may" that lifts a check is `passive` and needs no mark in the entry: the player already entered the
breach, so the ability is taken as used. `uses` is for what is spent by being used and is not a component action: an
agent or a technology exhausted, an action card played in a window of another action. A component in `uses` is played
as a component action plays its own: exhausted if its text says "exhaust this card" or it is an agent, purged if a
hero, discarded if an action card, and warned of when not held or already exhausted.

A waived warning keeps its place in the list with `waivedBy: string[]`. Everything that asks "does this entry break a
rule" asks `standing(warnings)` (`src/domain/rules/registry.ts`); the interface lists a waived warning after the
standing ones, dimmed and struck through, with «Разрешено: <component>».

The contract tests (`src/domain/effects/contract.test.ts`, `src/domain/rules/contract.test.ts`) check all of this.

## The files of one component

```
src/domain/effects/components/<kind>/<slug>.ts            the effect
src/domain/effects/components/<kind>/<slug>.test.ts       its domain tests
src/domain/effects/components/<kind>/<slug>.ui.test.tsx   its interface tests (needed once it waives, modifies or plays)
```

`<kind>/<slug>` is the `file` of the component in your batch file (`fileOf(id)`: the id `mech:argent_mech` is
`mech/argent_mech`). The registry collects the files itself (`import.meta.glob`); nothing is registered by hand.

```ts
// src/domain/effects/components/ability/armada.ts
import type { ComponentEffect } from '../../types';

export const id = 'ability:armada';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: { fleetLimit: value => value + 2 },
};
```

- The file exports exactly `id` and `effect`. It starts with a comment that quotes the printed text and says what was
  decided and why.
- Do not call imported functions at the top level of the file (the registry loads every file while the domain is still
  loading); inside `when`, `modify` and `play` anything of the domain may be called. Importing a warning code's file is fine.
- A unit upgrade technology already has generated numbers (`unitUpgrades.ts`); its file adds to them: the file's
  `modify` runs after the generated one, the rest of the file is taken as written.
- A hint written without `hintAt` keeps the steps the data gives it (an action card's window). Give `hintAt` yourself
  where you know the step and the data does not: `hintAt: ['combat']`.

### The test file

One file per component; inside, one `describe('<id> <name>')`; every test title starts with the id. Before every test,
a comment with three things:

1. the **quote**: the component's printed text or the LRR point, word for word;
2. **Checks:** what the test fixes;
3. **Why the check is redundant here:** why the default validation does not apply with this component, or
   **Why the check is NOT redundant here:** for the cases the component does not cover (every component has some:
   another faction, a card held but not played, the next round, one unit more than the text allows).

The quote must be tied to the pack so it cannot rot: `quote(pack, id, 'fragment')` fails when the English text no
longer holds the fragment. At least one per file; the contract test asks for it.

The kit is `src/domain/effects/components/kit.ts`: the five-system board of the rules tests with the real data and a
real faction on it.

```ts
const table = bench({ faction: 'argent', expansions: ['pok'], units: { [HOME]: { destroyer: 1, mech: 1 } }, entries: [move] });
const warnings = warningsOf(table, move);
expectWaived(warnings, 'capacityGroup', id);   // listed, lifted by the component, none standing
expectStanding(warnings, 'capacityGroup');     // listed, nothing lifts it
expectNone(warnings, 'fleetPool');             // not made at all (a modify changed the number)
endOf(table)                                   // the board at the end of the plan
componentAction(id), using(entry, id)          // an entry that plays or uses a component
effect(table.pack, id)                         // the effect as the registry holds it
```

Reference files: `leader/letnevhero.test.ts` (play, for the round), `mech/argent_mech.test.ts` (passive with `when`),
`ability/miniaturization.test.ts` (a new rule with its code), `ability/armada.test.ts` (modify).

A component with nothing to automate or waive still has its file and its test: the effect is
`{ tier: 'hint', rule: id, hintAt: [...] }`, the test asserts the tier and the steps, and a comment says why nothing
is validated (what the plan does not count: dice, votes, another player's choice). It needs no interface test.

### The interface test

The user asks for tests that the interface lets the player do the thing. `<slug>.ui.test.tsx` renders the real editors
over the same `bench` (`src/ui/testing/effects.tsx`), every press going through the replay:

```ts
uiBench();                                             // once per file: English, the screen cleared after each test
const live = showFlight(table, move, HOME);            // the flight step of a source (UnitPicker)
await take('Destroyer'); await take('Mech');           // press «Take one …»; take('PDS', 'Home One') within a row
expect(live.entry().moves[0].units).toEqual({ destroyer: 1, mech: 1 });
expectShownWaived('capacityGroup', 'Aerie Sentinel');  // on the screen, in the allowed look, naming the component
expectShownStanding('capacityGroup');  expectNotShown('fleetPool');
showTactical(table, move)   // the whole tactical editor with «Used»: await land('PDS', 'Target One')
showUses(table, entry)      // «Used» with the entry's warnings: await use('Darktalon Treilla')
showWarnings(table, entry)  // the list of the entry's warnings
```

The same comment (quote, Checks, Why) stands before each test, and every title starts with the id. A journey through
the whole app (Playwright, `tests/e2e/waivers.spec.ts`) is written only for a new kind of thing allowed, not per
component.

## A new warning code

When a component allows something the replay does not check yet, the check comes first: the replay must warn for
everyone, then the component waives. A code is one file, `src/domain/rules/codes/<code>.ts`:

```ts
import { defineCode } from '../codeDef';

export default defineCode('structureAboard', {
  rules: ['85.3', '95.1'],     // LRR points, the main one first
  step: 'transport',           // decides the block of the editor it stands in (STEP_PLACES)
  text: { ru: '…{{unit}}…', en: '…{{unit}}…' },   // game terms per CLAUDE.md; npm run lint:terms
});
```

The step of the replay makes it with `violation(structureAboard.code, params)` and the waiver names
`structureAboard.code`. The texts reach the interface by themselves. `WarningText` fills `{{planet}}`, `{{from}}`,
`{{system}}`, `{{where}}` (names of places from `planetId`, `from`, `systemId`, `where`) and `{{unit}}`; other params
go in as they are. The check itself lives in a step of `src/domain/replay/` — a shared file: keep the change small,
additive, and list it in your report. Code names are global: prefix nothing, but choose a name that says the rule
(`structureAboard`), and look at `src/domain/rules/codes/` and `WARNING_CODES` first.

## A new point of the count

`Modifiers` (`types.ts`) has the points the count already asks: `speed`, `capacity`, `fleetLimit`, `productionValue`,
`unitCost`, `planetResources`, `planetInfluence`, `researchCost`, `prerequisites`, `tokensGained`, `handLimit`, `vp`.
Not every point is asked yet (grep `applied(` in `src/domain`). Asking a point that exists, or adding one, is a change
of shared files (`ModifierContext` in `types.ts`, the step that calls `applied`): one line in each, additive, and
listed in your report. Call `applied(pack, holderOf(game, state), point, base, ctx)` so that the faction sheet, the
legendary planets and the laws are asked too; holdings alone ask only the cards held.

## Known limits of the foundation

Say so in your report when a component of your batch runs into one; do not work around it in a shared file.

- A flagship's printed ability (`unit:<id>` in the texts) is not a component of the catalogue: it has no effect file.
- The reminders of a step (`hintsAt`) are asked of the cards a player holds ready. A `hintAt` on an ability, a mech, a
  breakthrough or a legendary planet is kept in the registry but not yet shown.
- `applied` is given the faction at every point, but the planets controlled and the laws only at `fleetLimit` and
  `productionValue`. A law or a legendary planet that changes another point needs `holderOf` at that call.
- A waiver lasts for its entry, or to the end of the round. "Until the end of your turn" is the entry; anything longer
  or tied to another player's turn is not modelled.
- What happens when a waiver ends (the Letnev hero's excess ships at the end of the round) is not replayed.
- Structures in a space area (`GameState.afloat`) are counted by the replay and offered by the editors; the map does
  not draw them yet.
- A waiver is asked of the owner of the entry only. A component of another player that lifts a check for this one
  ("other players may…") is named in the entry's `uses`.

## Two passes

**Pass 1, red.** For each component of the batch: decide what it is (waiver, modify, play, hint), write its effect file
as the hint it is today (`{ tier: 'hint', rule: id }`), and write the tests that say what it must do, domain and
interface. A test that needs logic that does not exist yet is written with `test.fails(...)`: it runs, it fails, and
the suite stays green *because* it fails. The red is real: a `test.fails` that passes breaks the suite. Tests of what
already holds (the "NOT redundant" cases, a pure hint) are plain `test`. What cannot be modelled at all is a
`test.todo('<id> …: <reason>')`. Commit; `npm run plan:effects -- --status` shows the batch as red.

**Pass 2, green.** Write the effect, and the missing check or point if there is one; turn every `test.fails` of the
batch into `test` (the suite tells you which: a `test.fails` that now passes fails). Nothing of the batch is left as
`test.fails` at the end.

Before you report: `npx tsc -b`, `npm run lint`, `npx vitest run`, `npm run lint:terms`. Your report lists the
components by what they became, every shared file you touched and why, and what you could not model.
