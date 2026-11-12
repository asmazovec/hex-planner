# Infrastructure of the status subsystem (pass 2, wave 1)

Objectives and their scoring, victory points, command tokens gained, the hand limit, agendas and laws, the round's flow,
strategy cards. What a batch agent finds ready, and how to ask for it. The code stands in `src/domain/effects/points/status.ts`
(points, hooks and helpers, by declaration merging: `types.ts` was not edited), `src/domain/replay/status.ts`,
`afterEntry.ts`, `round.ts`, `cards.ts`, `holdings.ts`; the tests of the infrastructure use a throwaway effect
(`withEffect` in `src/domain/effects/points/status.kit.ts`), never a component's file.

## Warning codes (all in `src/domain/rules/codes/`, with texts ru and en)

| Code | Rule, step | Made by | Params | Asked by |
| --- | --- | --- | --- | --- |
| `scoreWithoutHome` | 61.16, status | the status entry, for every public objective in `scored`, when a home planet is not controlled | `objective` | `ability:nomadic` (waive) |
| `objectiveUnmet` | 61.5, 61.10, 81.1, status | the status entry, from `requirement`; or by a `play` with `objectiveNotMet(id, have, need)` | `objective`, `have`, `need` | every objective of batches 28-32 |
| `objectiveRepeated` | 61.8, status | the status entry: the objective is already in the player's `scored`, or twice in the entry | `objective` | new, generic |
| `objectivesPerPhase` | 61.6, status | the status entry: more than one public, or more than one secret, objective | `kind`, `count` | new, generic |
| `handOverLimit` | 2.4, 2.4.1, component | after any entry whose `gains` has an action card, against the `handLimit` point (base 7) | `cards`, `limit` | `ability:crafty` (waive), `agenda:sanctions` (modify) |
| `secretsOverLimit` | 61.21, 45.4, component | after any entry whose `gains` has a secret objective, hand plus scored secrets against the `secretLimit` point (base 3) | `secrets`, `limit` | `relic:obsidian` (modify) |
| `actionCardBarred` | 2.6, 2.7, component | by the `restrict` of a law (see below) with `actionCardsPlayed(entry, pack)` | `id`, `name` | `agenda:censure` |

The names are those the red tests already used; they agreed, so nothing is renamed. `WarningText` gives `{{objective}}` as the
objective's name.

## Points of the count

`ModifierContext` is merged (`points/status.ts`), so `Modifiers` has them at once.

- `tokensGained: { step }` (existed): now asked at the status entry, `statusTokensFree(game, state, shared, entry, pack)`, base 2
  (`STATUS_TOKENS`); `checkTokensGiven` runs against it and the status editor's tiles show it. Asked by `ability:versatile`,
  `technology:hm` (passive), `promissory:ce` (play: see below).
- `handLimit: { faction }` (existed, asked nowhere): now asked after an entry that draws (`afterEntry.ts`), base `HAND_LIMIT` 7.
- `secretLimit: { faction }` (new): base `SECRET_LIMIT` 3. Asked by `relic:obsidian`.
- `strategyCost: { card, secondary }` (new): the strategy tokens a card owes, base 1 (0 when the card owes none: Leadership's
  secondary, a free secondary). `strategyTokensOwed(entry, play, game, state, shared, pack)` in `src/domain/strategy.ts`; the replay
  (`cards.ts`) and the editor's token label (`StrategyEditor`, `EntrySteps`) both ask it. Asked by `ability:master_of_trade`
  (passive: `ctx.secondary && ctx.card === CARD.trade ? 0 : value`), `leader:mahactagent`, `promissory:acq`, `leader:winnuhero`,
  `actionCard:overrule`, `leader:jaemirkan...` (play: see below).
- `vp` (existed): still asked nowhere; victory points move by `gained`/`lost` (below). Scoring an objective does not add its points
  (they are entered by hand, `entry.vp`, as before: 61.2 stays as it was).

### A play effect with a `modify` (ce, mahact agent, acq, overrule, hm-like one-time effects)

`modify` is no longer only for `tier: 'passive'`. On a `play` effect it counts for the entry that names the component (its
action, its `spends`, its `uses`) while its owner holds it ready (held and not exhausted before the entry); a `hint` has none.
`appliedFor(pack, holder, entry, state, point, base, ctx)` asks the components in force and those the entry names, in registry order;
the status points above use it. The contract test now says "only a passive or a play effect has `modify`" and asks a test of the
interface for an effect with `requirement`, `gained`, `lost`, `restrict` or `suppresses`.

## Hooks on `ComponentEffect` (merged)

- `requirement(ctx) => { have, need }`: an objective. Asked at the status entry that scores it, against the owner's board before the
  entry (`ctx.state`, `ctx.shared`, `ctx.game`, `ctx.entry`, `ctx.objective`); `have < need` is `objectiveUnmet`. Tier `play`.
- `play` of a scored objective: the status entry plays what it scores (`playedBy` has `entry.scored`), with the entry's other plays,
  after `applyStatusTokens` and `applyScored`. For a cost use `spentOnObjectives(turn)` (below).
- `gained(turn)` / `lost(turn)`: any tier; run once for each id in the entry's `gains` / `spends`, after the gains are applied, with the
  entry's `choices`. Relic Shard of the Throne is `gained: vp += 1`, `lost: vp -= 1`. A law's one-time resolution (Core Mining's
  attachment is already made; Crown of Emphidia's point for the elected player) is `gained` with `turn.choices.elect`.
- `restrict(turn)`: passive; a check the component adds, run for every entry of the player it is in force for, after the entry's own
  steps, on the state after it. Push warnings with `violation(code, params)`. Censure: if `actionCardsPlayed(turn.entry, turn.pack)` is
  not empty, one `actionCardBarred` per card, `{ id, name }`.
- `suppresses(id)`: a law in force; the components it names are out of force (`inForceOf`): Articles of War takes `mech:*`.

`EffectTurn.cards` (merged, optional) is the round's `CardRound`: `cards.states` holds every player's state by id (`me`, opponents), and
`cards.freeSecondary[card]` the players whose secondary of that card owes no token (Crisis: push the player ids there).

## Entries

- `adjustment.choices` (`Record<string, string | number>`): for the agenda an entry of the agenda phase resolves. `outcome`
  (`for` | `against`), `elect` (a player id `me`/opponent, a planet id, a law id), `card` (the strategy card elected, its initiative).
  `EffectTurn.choices` carries them for every entry that has `choices` (`choicesOf`).
- `statusTokens.spend: StatusSpend` = `{ tactic?, fleet?, strategy?, tradeGoods?, resources?: Payment, influence?: Payment }`: what the
  objectives scored cost (61.10). `spentOnObjectives(turn)` takes it once per entry, however many objectives are scored, with the
  warnings of the status phase (`poolNegative`, `shortTradeGoods`, `planetNotControlled`, `planetExhausted`), and returns
  `{ tokens, tradeGoods, resources, influence }` for the objective to compare with its cost.
- `GameState.lawOwners` (merged by edit, one line): law id to the faction an `Elect Player` law binds; `gain` fills it from `choices.elect`
  or the owner of the entry. `holderOf` gives a player only the laws that bind them, so `inForceOf`, waivers and `restrict` already see
  "the elected player only".

## Laws (`gain`/`lose` in `holdings.ts`)

A law resolved `against` is not put in play (7.6); an `Elect Planet` law is attached to `choices.elect` (`shared.attachments`) and leaves
with `lose`; an `Elect Player` law is bound as above. An agenda gained by an entry of the agenda phase is `playedBy` that entry
(its `play` runs with the entry's choices and `cards`; `lasts: 'round'` waivers hold for the player's later entries of the round).

## Helpers for a `play`

`gainTokens(turn, { tactic, fleet, strategy }, step?)` (signed; `noReinforcements`, `fleetPool`, `poolNegative`),
`spendStrategyTokens(turn, count)` (`shortStrategy`, step card, so a waiver sees it), `objectiveNotMet(id, have, need)`,
`spentOnObjectives(turn)`, `actionCardsPlayed(entry, pack)`, `appliedFor(...)`; the first two in `replay/status.ts`, the rest in
`effects/points/status.ts`.

## The round (`round.ts`)

`isTurn(entry, pack)`: a component entry for an action card whose window is not "Action" (Summit, Counterstroke, riders, Forward Supply
Base, Skilled Retreat...), or for an agenda, is no turn: no `actionOutsidePhase`, no `actionAfterPass`, it passes nothing. A
secondary that names an "Action" card in `uses`/`spends` (Strategize) is a turn (`actionAfterPass`, `actionOutsidePhase`).

## Reminders (`hintsAt`)

The reminders of a step now also reach the secret objectives in hand (`holdings.secrets`) and the public objectives revealed and not yet
scored by the player (`shared.revealed`); scored ones are out. The status editor shows them (`StepHints`, step `status`).

## Interface

- Status entry editor (`EntryList`): the tiles show `statusTokensFree`; `ScoredBlock` (`src/ui/plan/blocks/ScoredBlock.tsx`): «Score an
  objective» opens the picker (secrets in hand and revealed publics first), each scored objective a card with its cross, and when an
  objective's printed text begins "Spend" a «What scoring cost» block (tokens, trade goods, planets for resources and for influence).
- Agenda entry (`AdjustmentEditor`): `AgendaChoices` by the agenda's target: «For»/«Against», «Elect <faction>», «Elect <planet>»,
  «Elect <card>», «Elect <law>». A second press takes the choice back.
- `src/ui/testing/effects.tsx`: `showAgenda(table, entry)` and `showScored(table, entry)`, live, with every warning of the entry under them.
- Steady controls: two tests added to `tests/e2e/steady-controls.spec.ts` (the cost steppers; the outcome buttons).

## Not built, with the reason

- A choice UI for a component action's `choices` (Fabrication, Orbital Drop, Repeal, Bribery, Emelpar...): the play owner's block.
- `pass.choices` (Ral Nel hero, Ordinian), `tactical.choices` (Acamar agent's pool): the entry bodies belong to the play owner.
- The Mitosis infantry of the status phase (Arborec): one faction's exotic step; `arborec_mech` waits for it.
- A hook on the change of control of a planet (Styx, Thunder's Edge legendary): `invasion.ts` is the invasion owner's.
- VP for the planet elected (Holy Planet of Ixth): it follows control, so it needs that hook; `vp` stays unasked.
- Adding the points of a scored objective to `state.vp`: the points are typed by the player, and a plan made so far would count twice.
- `USED_KINDS` with `exploration` in `UsesBlock`: the uses block belongs to the play owner.
- The planet of an `Elect Scored Secret Objective` law (Classified Document Leaks): one law; the card keeps `elect` free.
- Transfer of a law between players (Shard of the Throne, Crown of Emphidia after a combat): combat winners are not modelled.

## Code names the batches must not rename

`scoreWithoutHome`, `objectiveUnmet`, `objectiveRepeated`, `objectivesPerPhase`, `handOverLimit`, `secretsOverLimit`, `actionCardBarred`.
Codes other owners are to make (`warSunAbsent`, `placeNotControlled`, `componentCondition`, `playCondition`, `attachmentTarget`,
`explorationCondition`) are not here.
