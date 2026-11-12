# Movement, transport and activation: what the shared code now gives a component file

Built by the owner of the movement subsystem in pass 2, wave 1. Everything is additive: a file of a component that
used none of it works as before. Types are declared by merging in
[`src/domain/effects/points/movement.ts`](../../../src/domain/effects/points/movement.ts) (no shared interface edited
but the `speed` point); helpers are in
[`src/domain/effects/helpers/movement.ts`](../../../src/domain/effects/helpers/movement.ts) (call them inside `when`,
`modify` and `play`, never at the top level of a file). The tests that show each piece at work stand beside them:
`points/movement.test.ts`, `helpers/movement.test.ts`, `src/domain/replay/activation.test.ts`.

There is **no new warning code** in this wave: every check a movement component lifts (`speedShort`, `routeBlocked`,
`sourceActivated`, `capacityGroup`, `capacitySystem`, `fleetPool`, `structureAboard`, `pickupOffRoute`,
`notNeighbor`) already existed. The codes that red tests name and that are not movement checks stay with their batches
(see the end).

To test an infrastructure piece without a component file, put a throwaway effect in the registry of the bench's own
pack: `(effectsOf(table.pack) as Map<string, ComponentEffect>).set(id, effect)` (see the tests above).

## The speed point, now with a context

`modify: { speed: (value, ctx) => ... }`. `ctx` is `{ faction, unit }` as before and, where a route is counted (the
replay, and the highlight of the flight):

| field | meaning |
| --- | --- |
| `from` | the start slot of the move (a Fracture slot, the home system, a wormhole system) |
| `systemId` | the active system |
| `group` | the units moving together from that start (`move.units`) |
| `game`, `pack` | the game as the mover sees it, and the data |
| `state` | the mover's state before the move (holdings, docks, control, tokens) |
| `shared` | my state: laws, wormhole tokens |

None of them is set where a speed is only displayed (no route): test them for `undefined`, or use the helpers below,
which return a quiet "no" in that case.

**A change that applies to ships must leave a value of 0 alone** (infantry, structures, a Fighter I have no move): use
`plusSpeed(n)` or write `value > 0 ? ... : value`. A `+1` on 0 would make the unit fly.

Helpers for it (`helpers/movement.ts`): `plusSpeed(n)`; `fastestOfGroup(ctx)` (the highest move value of the group, for
"takes the move of the fastest ship moving with it": `value > 0 ? Math.max(value, fastestOfGroup(ctx)) : value`);
`startsAtHome(ctx)`, `startsInFracture(ctx)`, `startWormholes(ctx)` (the start system's wormholes, Creuss tokens
included), `activeNextToAnomaly(ctx)`.

Asked by: batch 01 `breakthrough:letnevbt` and the Gravleash Maneuvers item (group), batch 03 `ability:slipstream` (start,
wormholes), batch 10 `technology:as` (active system), batch 12 `breakthrough:cabalbt` (Fracture start), batch 15
`breakthrough:crimsonbt` (home start).

## What the entry names: `modifyWhenNamed`

A `play` or `hint` effect cannot have `modify` (the contract). Its changes for the entry that names it in `uses` or
`spends` go in a new optional field:

```ts
export const effect: ComponentEffect = { tier: 'hint', rule: id, modifyWhenNamed: { speed: plusSpeed(1) } };
```

Held for the whole entry, once per component however many copies are named (Flank Speed, ruling). Asked at `speed` only
today (`shipSpeed`, hence the route check and the speed hint of the replay). Asked by batch 19 `actionCard:fs1`. A UI
test is still the file's own business (the contract asks for one once a file has `modify` or `play`; this field is not
counted by it).

## Nebula start and gravity rifts: two points

`modify: { nebulaStart: (value, ctx) => ctx.speed }`: the move value of a ship that starts in a nebula, base 1 (59.2).
`ctx = { faction, unit?, speed, from, game, pack }`; `speed` is what the ship would have anywhere else. Returning
`ctx.speed` is "keeps its own move value" (Voidborn, Circlet of the Void). The route warning then names the new number.
For a group counted without a ship (the highlight) the highest of the group's ships is taken.

`modify: { gravityRift: (value, ctx) => ... }`: a system a path enters counts as a gravity rift for the mover while the
value is above 0 (base 1 for a rift tile, 0 otherwise; 41.1). `ctx = { faction, systemId, game, pack, state? }`.
Dimensional Tear II: `ownDockIn(ctx.game, ctx.state, ctx.systemId, ctx.pack) ? 1 : value`. Asked at every system of the
path in `routeMove` and at every step of `routeReach`.

Asked by: batch 10 `ability:voidborn`, batch 24 `relic:circletofthevoid`, batch 12 `technology:dt2`.

Waiver helpers for the same cases (use them in a waiver's `when` when a modify is not the right shape):
`speedWithoutAnomalies(warning, ctx)` (the printed move, no nebula start and no rift: "short only because of the
nebula" is `steps <= speedWithoutAnomalies`), `crossesRift(warning, ctx)`, `routeOf(warning, ctx)` (the systems the
move enters, start and active system included).

## Adjacency beyond the board: `links`, wormhole tokens

Two systems made adjacent by something other than the map: a Creuss wormhole token, a law, an ability.

* `GameState.wormholeTokens?: Record<string, string>` on my (shared) state: the type of the wormhole (`alpha`,
  `beta`, `gamma`, ...) to the slot it is put in. A play effect writes it (`turn.shared.wormholeTokens = { ...turn.shared.wormholeTokens, alpha: slot }`);
  nothing replays it by itself. A token joins its system to every system with a matching wormhole (6.1), tile or token.
* `ComponentEffect.links?: (ctx: LinkContext) => Array<readonly [slot, slot]>`: pairs of slots the component joins.
  `ctx = { game, pack, state?, shared?, during }` with `during` `'tactical'` (the route and its reach of the owner's
  tactical action) or `'neighbors'` (the neighbours of a transaction). Asked of the components **in force** of the
  mover (any tier, the laws included: `holderOf` is used) and of those the entry **names**. Return `[]` when it does not
  apply (Lazax Gate Folding: only `during === 'tactical'` and while `ctx.state.control` says Mecatol is not controlled).
* In `src/domain/movement.ts`: `wormholesOf(game, pack, slot, tokens?)`, `wormholeSlots(game, pack, type, tokens?)`
  (to build a `links`: Quantum Entanglement is `wormholeSlots('alpha') x wormholeSlots('beta')`), `adjacentTo(game, slot, pack, links?)`,
  `joined(game, a, b, pack, links?)`, `routeDistances(game, from, pack, links?)`,
  `linksOf(game, pack, { state, shared, named, during })`, `areNeighbors(..., links?)` and `presentNear(...)` (neighbors.ts).
* Where it is used: the highlight of the flight (`routeHint`), the transaction's `notNeighbor` check (`acts.ts`), the
  route check of a tactical entry (`checkEntryRoutes`). **A jump between two marked systems that are not joined is never
  warned of**, so `links` changes the highlight, the neighbours and the helpers, not a `speedShort` (a route marked
  system by system is counted one step per system whatever joins them).

Asked by: batch 03 (`ability:quantum_entanglement`, `promissory:iff`, `technology:wg`, tokens), batch 07 (`technology:lgf`),
batch 15 (`promissory:nanolink`: `joined`), batch 27 (`agenda:wormhole_recon`), batch 32 (`exploration:gw`, `secretObjective:fc`),
batch 21 (`actionCard:jamming`: `adjacentTo`), batch 28 (`publicObjective:intimidate`: `adjacentTo` of `mecatolSlot`),
batch 29 (`publicObjective:push_boundaries`).

## Activation: `onActivate`, `playAt`

* `ComponentEffect.onActivate?: (turn: ActivationTurn) => void`: asked when **anyone** activates a system with a
  tactical action, once the command token is placed and before the move, of **every player's** components in force:
  `turn = { id, game (as the owner sees it), pack, owner, activator, entry, systemId, state (the owner's), activeState (the activator's, the same object when they are one), shared, warnings }`.
  `owner` and `activator` are `'me'` or an opponent's id. It may change either state and push warnings (they become the
  entry's). Returning a note to its owner (Support for the Throne, Alliance, Trade Convoys), Magen Defense Grid (a
  structure of the owner in the system: place infantry), Neuroglaive (`owner !== activator`, a ship of the owner there: the activator
  loses a fleet token) are written with it. Helpers: `playerHolds(game, shared, player, slot, pack)` (a player's ships,
  ground forces, structures in a system, by replayed state or by hand), `shipSlots(state, pack)`.
* `ComponentEffect.playAt?: 'activation' | 'combat'`, on a `play` effect: for a tactical action that names the
  component in `uses`/`spends`, `play` runs in the middle of the action and **not** after it: `'activation'` right after the
  token is placed, before the movement is checked (Upgrade, Rally, Il Na Viroset); `'combat'` once the losses of the battle
  are taken, before the landing (Salvage). The timeline skips it afterwards, so it runs once. A component action or another entry
  that names it still runs it after the entry, as before.
* `choices` is `{}` in a tactical action (`uses` has no choices).

## Transport: two more points

* `dockFighters`: `modify: { dockFighters: (value, ctx) => ... }`, `ctx = { faction, planetId, systemId }`, base 3, asked for each
  dock on a planet of the system (79.2): Dimensional Tear II keeps 12 (`planetId` is the dock's planet).
* `excessFighters`: `ctx = { faction }`, the value is the number of flying fighters beyond the capacity left, which counts
  against the fleet pool; Hybrid Crystal Fighter II `value => value / 2`. A half ship rounds up.

Asked by: batch 12 `technology:dt2`, batch 05 `technology:hcf2` (the unit upgrade file's `modify` runs after the
generated one; keep the file passive with rule `97.4`).

## Questions for a waiver's `when` (all in `helpers/movement.ts`)

| helper | answers |
| --- | --- |
| `moveFrom(warning, ctx)` | the move of the entry from the warning's source (`params.from`) |
| `movingCount(warning, ctx)` | how many of the warning's unit moved from it |
| `shortfall(warning)` | steps - move of a `speedShort` |
| `oneShipShort(warning, ctx, by = 1)` | `speedShort` short by at most `by`, the unit alone from its source (one of its type), and the **first** such warning of the entry, so a second ship short by the same is not covered (Gravity Drive, Tempesta, Saar's agent's second half) |
| `speedWarningsOf(ctx)` | the `speedShort` warnings of the entry as the replay makes them, recomputed |
| `routeBlockKind(warning, ctx)` | `'asteroid' \| 'supernova' \| 'nebula' \| 'ships' \| 'hyperlane'`, an anomaly before ships |
| `blockedByShips(ctx, systemId)`, `closedSystem(warning, ctx)` | other players' ships stand there; asteroids or a supernova |
| `fastestOnBoard(ctx)` | the highest move value of any ship of any player (Saar's agent) |
| `onlyUnits(warning, ctx, kinds)`, `shipsOnly(warning, ctx)` | what the move carried (cruisers only: Corsair; ships without fighters or ground forces: Firmament agent) |
| `othersShipsIn(ctx, slot)` | other players' ships (not fighters, not ground forces) in a system |
| `mecatolSlot(game)`, `playerNear(ctx, player, slot)` | Mecatol's slot; another player present in or next to a system (Keleres breakthrough: `warning.params.player`) |
| `linksFor(ctx)` | the `links` of the owner during their tactical action |

`routeBlocked` for the route of a *rival* entry works with the same helpers: the board is read from `ctx.shared`.

## Needs of pass 1 that belong to another subsystem (skipped here)

`landingFromPlanet`, the LandingBlock offering structures from reinforcements (invasion); production items
(`productionShipsAway`, `hacanbt`, `ghostbt`, `ffac2`, `ah` as a producer, `mr`) and the `planetResources` ask in
`payment.ts` (production/payment); `fleetPoolMax`, `fleetPoolTokens`, `fleetAtStatusEnd`, Minister of Commerce/Exploration points,
`researchUnavailable` (status/research); `useChoices`, the component editor for choices, `wormholeTokenPlace`, `planetNotGainable`,
`componentTarget`, `converterTarget`, `techNotFromNeighbor`, `systemOccupied` (play/component: each is the check of one play, written with it, and
`systemOccupied` is named by the l1z1xhero test), the Holdings difference between a note in hand and in play (Trade Convoys),
`ComponentEffect` hooks for a component of another player at a step other than activation.

## Needs of this subsystem not built, with the reason

* A warning for a jump between systems that are not joined (batch 15 "general", Sever, Sundered, Incursion): CLAUDE.md
  makes the jump a deliberate, never-warned move (the Fracture, a portal, an ability the rules here do not count).
  Warning of it would warn every Fracture and Creuss move. The tests that ask for it are `test.todo`.
* "A component of another player imposes a check on my route" (batch 09 `technology:ah`: a system with the structures of a player who holds it
  blocks routes, `routeBlocked` with context `structures`): one component asks, and the shape (whose structures, which
  context) would be a hook for a single card. `blockersOf` is the place when it is wanted; it takes no state of holdings today.
* The route reach follows the waivers of a component (Antimass Deflectors, Light/Wave Deflector, Gravity Drive: batch 17
  "nice to have"): a waiver is applied to a warning, the highlight has none. `links` and the speed context do reach it.
* Travel Ban dropping alpha/beta adjacency (batch 25): `links` only adds.
* Floating Factory in space (batch 01 `technology:ffac2`), Muaat's Star Forge infantry, the editors for component choices (moves,
  systems, planets) and any control of the flight: no new entry field and no new interface piece was built; every one of
  them is a one-card need or belongs to the play subsystem. Nothing repeatable was added, so `tests/e2e/steady-controls.spec.ts` is untouched.
