# Infrastructure of playing a component (owner: play)

What the batch agents of pass 2 can rely on. Tests of all of it: `src/domain/effects/play.test.ts`,
`src/ui/plan/blocks/ChoicesBlock.test.tsx`, `src/domain/rules/lrr/002-action-cards.test.ts` (2.4, 2.4.1).

## Where the choices live

| Field (`Entry`, every type) | Meaning |
| --- | --- |
| `choices` | what the player chose for the entry's component action (`componentId`); on an entry with **no** component action (tactical, pass, strategic, adjustment) it goes to the components named in `uses` |
| `useChoices[componentId]` | the choices for one component named in `uses`; wins over `choices`; this is the one the editor writes for a card in «Used» |

`choicesFor(entry, id)` (`src/domain/effects/choices.ts`) is the single reader, used by the replay and the editors;
`withChoices(entry, id, chosen)` is the single writer. A value is a string (planet id, system slot, player id `me` or an
opponent id, unit id, component id, option) or a number. Saves keep both fields (`src/storage/schema.ts`).

**Rename for tests written with the flat form.** The tests of Emelpar, Industrex, Spy Net, Yin Spinner Omega,
Mageon Implants, Merchant Station and Mirage write `choices` flat on a tactical or pass entry that uses the
component: that still reaches `play` (the entry has no component action). But the interface writes `useChoices`:
a ui test of such a component expects `useChoices: { [id]: { ... } }`, not `choices`. Peace Accords already does.

## What `play` is given (`EffectTurn`)

`game` (as the owner sees it), `state` (the owner's), `shared` (mine), `entry`, **`id`** (the component being played),
**`player`** (`me` or an opponent id), **`states`** (every player's state by `me` / opponent id; `states[player] === state`:
move a card or a token from another player here), `choices` (`choicesFor`), **`held`** (false when the replay already
warned `componentNotHeld` / `componentExhausted` for this id: a play may then do nothing), `pack`, `warnings` (push
`violation(code.code, params)`). `play` runs for a component action, for each `spends` and each `uses`, **for any tier**
(a passive ability may have an action part: Dynamis Core, Nano-Forge). The contract: only a hint has neither `play` nor `choose`.

## Declaring what the player chooses (`ComponentEffect.choose`)

```ts
export const effect: ComponentEffect = {
  tier: 'play', rule: id,
  choose: [
    { key: 'planet', kind: 'planet', options: ctx => planetsIControl(ctx) },          // buttons, one per planet
    { key: 'player', kind: 'player' },                                                 // the other players, by faction name
    { key: 'count',  kind: 'number', range: [0, 3], label: { ru: 'Сколько', en: 'How many' } },   // a stepper
    { key: 'unit',   kind: 'unit', options: () => ['cruiser', 'destroyer'], when: c => c.planet === 't1' },
  ],
  play: ({ choices, state, warnings }) => { /* choices.planet ... */ },
};
```

Kinds: `planet`, `system` (slot; named by its planets or its number), `player`, `unit`, `number` (`range`), `option`
(`options` + `names: { value: { ru, en } }`), `component`. `options(ctx)` gets `ChoiceContext` (`game`, `pack`, `state` of the owner just
before the entry, `shared`, `player`, `entry`, `chosen`); without it the default of the kind is every planet / system
of the map, every other player, every unit. `when(chosen)` shows a dependent choice only while it holds; a choice that
stops being asked is dropped with its answer. Nothing is forbidden: the candidates are only what the interface offers;
the effect warns of a bad value (`componentUnresolved`, `componentCondition`, ...).

The interface (`ChoicesBlock`, `src/ui/plan/blocks/ChoicesBlock.tsx`) is a group named after the component, a labelled row of
toggle buttons per choice (`aria-pressed`; the chosen one pressed again is taken back). It stands in the component
action's editor (`TurnEditor`, under the component) and under each card of «Used» (`UsesBlock`). A component
with no `choose` shows nothing. Map picking of a system is **not** built: systems are buttons.

Test helpers (`src/ui/testing/effects.tsx`, which replace `actionCard/turnBench.tsx`):

```ts
const live = showTurn(table, componentAction(undefined));   // or showComponent(...): the editor of a component action, with «Used»
await play('Insubordination');                                // «Choose the component»
await choose('Home One');                                     // a choice button by name; choose(/Rules Rival/); choose('Cruiser', 'Unit') within the row
expect(live.entry().choices).toEqual({ planet: 'h1' });
```
For a card in «Used»: `showUses(table, entry)`, `await use('Peace Accords')`, then `choose(...)`; the answer is in `useChoices`.

## Hooks

- `ComponentEffect.gained(turn: GainTurn)`: runs for each component an entry's `gains` hands the player (`state`, `shared`, `id`,
  `entry`, `warnings`). Quantumcore: `turn.state.holdings.breakthrough = 'held'`.
- `GameState.faction`: the faction of the player a state is (set by the replay), so hints and `inForceOf` can ask a faction
  sheet without a `Game`.

## Checks and codes (all `src/domain/rules/codes/<code>.ts`, both texts)

| Code | Rules / step | Made by | Asked for by |
| --- | --- | --- | --- |
| `handOverLimit` | 2.4, 2.4.1 / round | **the replay**: an entry that added cards to the hand and left more than `applied('handLimit', 7)`; params `cards`, `limit` | Crafty (waiver), Sanctions (modifies `handLimit`) |
| `componentUnresolved` | 2.6.1 / component | the play; params `id`, `name`, `reason` | Insubordination, Lucky, Mining Initiative, Meltdown, Repeal and other action cards |
| `playCondition` | 2.6 / component | the play; params `id`, `name` | Jamming, Summit, Unexpected, War Effort, ... (11 cards) |
| `componentCondition` | 53.3, 22.1 / component | the play; params `id`, `name`, `condition` | MRTE, Industrex, Avernus |
| `choiceOverLimit` | 2.6 / component | the play; params `limit`, `chosen` | Refit Troops, Scuttle |
| `placementOverLimit` | 22.1 / component | the play; params `count`, `limit` | Xxekir Grom |
| `warSunAbsent` | ability:star_forge / component | the play | Star Forge |
| `replacementCost` | leader:arborecagent / component | the play | Letani Ospha |
| `factionTechCopied` | actionCard:plagiarize / component | the play | Plagiarize |
| `relicFragmentsShort` | 73.1, 35.9.1 / component | the play of a fragment | crf1, hrf1, irf1, and the three others |
| `systemOccupied` | leader:l1z1xhero / component | the play | the Helmsman |

The codes other than `handOverLimit` are only **declared**: the play of the component makes the warning
(`violation(code.code, params)`, import the code's file). Several of them may also be wanted by the owners of
movement/invasion/production/status (`systemOccupied`, `factionTechCopied`, `warSunAbsent`, `replacementCost`): if two
owners made the same file the merge shows it; keep one.

## Other changes the batches use

- An ability or mech of a faction sheet is **not** checked by `holds` (the existing tests of LRR 22.1 and Aetherpassage say so): `play` gets `game.faction` and must check the faction itself (Star Forge, Orbital Drop, Letani Ospha). Say a play of another faction's ability does nothing.
- A relic whose text says «Exhaust this agent» (Titan Prototype) is exhausted; one with both «exhaust this card» and
  «purge this card» (Emphidia) is exhausted when used, not purged.
- `hintsAt(pack, board, step, players)` now also gives: hints of a **secret objective in hand**, and of the **abilities, mech,
  breakthrough (once held) and legendary planets** of each player's faction sheet (`GameState.faction`, `control`), not only held cards.
- Another player's component in force: holding an **Alliance note** (`promissory:<color>_an@owner`) puts the owner's
  unlocked **commander** in force (`inForceOf`, `Holder.others`, built by `holderOf` from `shared.rivals`). The note's return on activation is not replayed.
- Count points now reach the faction sheet, planets controlled and laws at **speed, capacity and unitCost** as at
  fleetLimit and productionValue: `shipSpeed`, `fleetSpeed`, `capacity`, `fleetCount`, `productionCost` accept a `Who`
  (`Holdings | Holder`, `holderFor` in `effects/registry.ts`), and the replay passes `holderOf(game, state)`. **Limit:** a rival's state keeps no laws,
  so a law that changes these points is seen for me only. The points `planetResources`, `planetInfluence`, `researchCost`,
  `prerequisites`, `tokensGained`, `vp` are still asked by no step: whoever owns that step calls `applied(pack, holderOf(game, state, shared), ...)`.
- `UsesBlock` also offers exploration cards (Merchant Station, Mirage).
- The contract test lets a passive effect have `play` and `choose`.

## Not built (and why)

- A play-tier effect with `modify` that holds only for the entry that names it (Frontline Deployment `actionCard:fs1`): needs an
  entry in `Holder` at every point of the count.
- A component of another player named in a rival's `uses` (Deepgloom Executable): needs an owner address on a use.
- Map picking for a system choice (`MapPickButton`): systems are buttons named by planets; light by design.
- Mahact's own Hubris note at the start (`startForFaction`, `src/domain/holdings.ts`): outside this subsystem.
- The automatic return of an Alliance note when the owner's units are activated.
- A new point of the count in `points/play.ts`: no pass-1 report asked a number that no existing point gives.
