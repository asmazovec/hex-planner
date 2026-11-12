# Research: what pass 2 built for the batches

Everything about researching technologies: prerequisites, specialties, costs, researching outside the Technology card.
Read `docs/phase4/component-effects.md` first. Code and point names below are final.

## The one place a technology is researched

`src/domain/replay/research.ts`, `researchTechnologies(game, state, shared, ids, pack, warnings, specialties?)`.
The Technology card calls it (`replay/cards/technology.ts`, `apply`); **a `play` effect that says "research" calls it
too** instead of `gain`/`research()`: it gives the same checks and the same points to every path.
`shared` is my state (it holds the laws); for an entry of mine it is `state`, in a card it is `round.states.me`.

Per technology, in order: not a technology of the catalogue is skipped; already owned gives `researchOwned` (90.10) and
nothing more; a text "cannot be researched" gives `researchUnavailable`; the point `researchTokens` above 0 replaces the
research by tokens (not gained, no further check); the prerequisites are counted, passed through the point
`prerequisites`, and warned with `prerequisitesMissing` if any remain; then the technology joins the holdings, so the
next one of the same entry sees it. It returns `{ researched, tokens }`; `tokens` is what the caller must hand out
(the card adds it to the free tokens by itself).
Gaining (`gains`, `gain()`) does not go through it and checks nothing (90.5).

Helpers exported from the same file: `techOf(pack, id)`, `colourOf(pack, id)` (null for a unit upgrade, 90.12.2),
`coloursOwned`, `symbolsLacking(pack, id, owned)`, `countSymbols`, `unresearchable(pack, id)`,
`researchTokensOf`, `researchTokensGiven`.

## Codes (`src/domain/rules/codes/`)

| code | rules | step | params | asked by |
| --- | --- | --- | --- | --- |
| `prerequisitesMissing` | 90.12, 90.8.1, 90.12.2 | card | `id`, `name`, `missing` (symbols still unmet after every ignored one), `symbols` ("biotic ×2") | analytical, aida, prophetstears, yincommander, rt_biotic/cybernetic/propulsion/warfare, schematics, is, quantumcore, tech_rider, divert_funding |
| `researchUnavailable` | 90.9, 90.5 | card | `id`, `name` | planesplitter-obs, parasite-obs |

**One name for the prerequisite check.** The red tests used three: `researchPrerequisites` (is, schematics, yincommander),
`prerequisitesMissing` (analytical, aida, prophetstears), `prerequisiteMissing` (rt_biotic, rt_cybernetic, rt_propulsion,
rt_warfare). The code is **`prerequisitesMissing`**. Renames for the batch agents: in the tests and effects of `is`,
`schematics`, `yincommander` and the four `rt_*` files replace the cast string by `prerequisitesMissing.code`
(`import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing'`). Until renamed, those tests keep failing
for a name that never occurs, which is what `test.fails` wants; do not flip them before.
`prerequisitesMissing` is placed in the block of the technologies (`PLACES` in `warningPlaces.ts`), like `researchOwned`.

A waiver on `prerequisitesMissing` reads `warning.params.missing` (a number: the symbols left after points and
specialties) and `warning.params.id` (the technology). Prophet's Tears, AIDA: `when: w => Number(w.params.missing) <= 1`
(plus `unit upgrade` for AIDA: `techOf(pack, String(w.params.id))?.upgrade !== undefined`).

## Points (`ModifierContext`, call `applied(pack, holderOf(game, state, shared), point, base, ctx)`)

- **`prerequisites`** (existing; its ctx gained two optional fields, one line in `effects/types.ts`):
  `{ technology: string; upgrade?: boolean; missing?: Partial<Record<TechType, number>> }`. The base is the number of
  symbols no owned technology covers, after the specialty planets of the entry. `upgrade` says it is a unit upgrade,
  `missing` the symbols left by colour. Analytical: `(value, ctx) => ctx.upgrade ? value : Math.max(0, value - 1)`.
  Yin commander: `(value, ctx) => (ctx.missing?.biotic ? value - 1 : value)` (satisfies one green symbol).
  **The red test of Analytical calls `modify.prerequisites(1, { technology: 'technology:dd2' })` without `upgrade`**:
  the batch must pass `upgrade: true` there, the modify cannot know it from the id.
- **`researchTokens`** (new, `src/domain/effects/points/research.ts`): `{ technology: string }`, base 0. Above 0 the
  research is not made and gives that many command tokens to distribute (Propagation: `modify: { researchTokens: () => 3 }`).
  The card adds them to the tokens it may give (`tokensOver` is checked against them) and the Technology editor shows
  the token tiles. A secondary gives them too. Gains are untouched.
- **`researchAsPrimary`** (new, same file): `{ faction: string }`, base 0. Above 0 the entry researches as the
  primary: limit 2, the first free, the second 6. Brilliant: `modify: { researchAsPrimary: () => 1 }`. It is asked at
  the card's cost and limit; the editor's note follows it. (`holderOf` there has holdings and faction only: a law or a
  legendary planet that sets it is not asked.)
- **`researchCost`** (existing, now asked through `appliedFor` with the entry, so a `play` effect of a component the entry names counts: Inheritance Systems adds 2 when `ctx.index === 0`): `{ technology: string; index?: number }` (`index`: the place among the technologies the entry researches anew); the base is what that technology costs on this
  side (0, 4 or 6). The cost of the entry is the sum over the technologies researched anew.

Declaration merging works: the two new points are in `Modifiers` at once. `researchTokens` and `researchAsPrimary` are
in `src/domain/effects/points/research.ts`; import it for its types only if a file needs them (not needed to call).

## Entry field

`CardEffects.specialties?: string[]` (`src/domain/types.ts`, one additive line): planets exhausted for their technology
specialty (90.14). Each ignores one symbol of its colour once; a planet not mine gives `planetNotControlled`, one already
exhausted `planetExhausted` (90.15) and ignores nothing. The planet is exhausted from the start of the research, so a
planet that already paid the cost counts as exhausted. The Technology editor shows them as a group "Technology
specialties" (planets I control, ready, with a specialty), pressed in place (`tests/e2e/steady-controls.spec.ts`).
Components that ask "exhaust a planet" for research (Rapid Mobilization, Ixthian Artifact notes) use the same field.

## Seen from the interface

- `CardHandler.cost(entry, held, who?)` gets `{ pack, faction }` (the third parameter is new in `handler.ts`);
  `researchLimit(entry, held?, who?)` and `researchesAsPrimary` are in `replay/cards/technology.ts`.
- The warnings of the research stand in the block of the technologies.
- `StrategyEditor` adds `researchTokensGiven` to the free tokens of a Technology entry.

## Not built, with the reason

- `handOverLimit` (batch 08): hand limit is about the hand, not research; a neighbour owns it.
- `returnedTechInvalid` (Divert Funding), `playTargetInvalid` (Brilliance, Mercenary Contract, Scuttle): one-off checks of a play.
  Helpers to build them: `techOf`, `colourOf`, `techOf(pack, id)?.upgrade`, `componentById(pack, id).faction`.
- A choices editor for components that research or return a technology (tech_rider, divert_funding, fires,
  shareknowledge, deepwroughthero): the `choices` fields and `showComponent` belong to the play owner. `ResearchBlock`
  takes any `researched` list and can serve as the technology picker there.
- The shape of "lent until the end of the status phase" (Share Knowledge): a state field of the round, not of research.
- On-gain hooks (Quantum Core): a hook on `gain` is a neighbour's (holdings).
- Faction technology of another faction (90.11): no red test asks; a check by `componentById(pack, id).faction`
  against `game.faction` would do and is left for a request.
- Data: the pack has no `requires` for some technologies that print one (Gravity Drive, in the pack `gd` has none; the
  AIDA test patches it). The check is as good as the data.
- The automatic payment of a card does not know the specialty planets: a planet it exhausts for the cost and the player
  also presses for the specialty warns `planetExhausted`. The payment can be set by hand.
