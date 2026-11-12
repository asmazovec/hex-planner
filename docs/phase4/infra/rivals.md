# One player's component on another player's entry: what the shared code now gives a component file

Built by the owner of the "rivals" group in pass 2, wave 3. Everything is additive and declared by merging in
[`src/domain/effects/points/rivals.ts`](../../../src/domain/effects/points/rivals.ts); the tests are beside it
(`points/rivals.test.ts`) and in the component files that use each piece. No new warning code: Neuroglaive, Aerie
Hololattice and Omniopiares use `routeBlocked`, `shortInfluence`, `noteRefused`.

## Activation of another player: `onActivate` (wave 1, used now)

`onActivate` is asked of every player's components in force (see `movement.md`). `technology:ng` is written with it:
`owner !== activator` and a ship (not ground forces, not a structure) of the owner in the system: `activeState.fleet -= 1`.
The earlier report said it lacked the hook: it was in the base, only the file did not use it.

## A system that bars passage: `stopsPassage`

`ComponentEffect.stopsPassage?: (turn: PassageTurn) => string[]`: the slots where the components in force of every
player **but the mover** bar the mover's ships. `turn = { id, game, pack, owner, mover, state (owner's), shared }`.
`blockersOf` (`src/domain/movement.ts`) is now `shipBlockersOf` (other players' ships, as before) plus `passageBarredOf`
(these slots), so the route check, the speed count and the reach highlight all treat them like a system with another
player's ships: no passage through, the active system still reachable. `routeBlockKind` says `'structures'` for them,
not `'ships'`, so a Light/Wave Deflector (which lifts the ships' bar) does not lift this one. It is asked over the
replayed state only (a `state` without `holdings`, as the map drawing has, asks nothing). Asked by `technology:ah`.

## Landing: `onLanding`

`ComponentEffect.onLanding?: (turn: LandingTurn) => void`, asked of every player's components in force **but the
lander's** from `reactToLanding` (`src/domain/replay/invasion.ts`) for each landing that sets ground forces on a planet,
before they are added to it. `turn = { id, game (as the owner sees it), pack, owner, lander, planetId, landed, state (owner's), landerState, shared, warnings }`.
It may push warnings (the cost is the lander's) and change either state. `landUnits` takes `shared` (my state) as a
trailing argument, passed down from `applyTactical`. Asked by `mech:keleres_mech`: `shortInfluence` with `needed` the
number of mechs of the owner on the planet.

## A note in the play area: `Holdings.inPlay`

`Holdings.inPlay?: string[]`, a subset of `promissory` (the ids as held, with address): the notes placed faceup in the
play area. `notesInPlay(holdings)` lists those still held. A `play` effect puts its note there
(`(holdings.inPlay ??= []).push(turn.id)`); the waivers (`askedFor`) ask every note in play of the entry's owner, at any
tier and with any `lasts`, until it leaves. In hand it is asked as before (in force only if passive). A note that
returns itself on a condition does it in an `onActivate` (see `promissory:convoys`: the activation of a system with the
Hacan's units moves the note out of the holder's `promissory` and `inPlay` into the Hacan's `promissory`).

## Hubris: the start without an Alliance

`startForFaction` (`src/domain/holdings.ts`) drops the player's own Alliance (`promissory:<color>_an@<player>`) when the
new faction has the ability `Hubris` in its sheet, and gives it back when the player leaves such a faction.
