# Infrastructure of the invasion subsystem (pass 2, wave 1)

What the batch agents may use for landing, control of planets, ground forces and exploration on gaining control.
Code: `src/domain/replay/invasion.ts`, `src/domain/effects/points/invasion.ts`, `src/domain/stacks.ts`. Tests:
`src/domain/replay/invasion.infra.test.ts` and the rule tests in `src/domain/rules/lrr/` (012, 035, 049, 067).

## The hook: `onGainControl`

`ComponentEffect.onGainControl?: (turn: ControlTurn) => void` (declared by merging in `effects/points/invasion.ts`; import the
type `ControlTurn` from there). It runs once for each planet newly gained, in registry order, after:
control is mine, the planet is exhausted (49.5.2), every rival counted in this state has lost it with its structures (49.5.1).
It runs for

- every `passive` effect in force for the owner (faction ability, breakthrough, mech, technology, legendary planet controlled), and
- every `play` effect whose component the entry names (`componentId`, `uses`, `spends`, `gains`): an action card or an exploration
  card played in the tactical action that gains the planet.

A `hint` has none (the contract test says so). `ControlTurn`: `game` (as the owner sees it), `state` (the owner's, to change),
`pack`, `warnings` (push with `violation`), `planetId`, `entry`, `choices` (flat `entry.choices`, `{}` if none), `fromPlayer`
(another player controlled it: Naaz-Rokha commander), `explores` (no one did: 35.1, exploration cards), `lost` (the structures
that stood there: `{ kind, owner, count }[]`, for Assimilate and Infiltrate: put your own with `state.pds` / `state.docks`).
`holderOf` laws are not given to it (rival states have none): use `state` and `game`.

Who asked: Assimilate, Fealty Uplink (l1z1xbt), Liberate, Infiltrate, Mercenary Outfit (mo1), exp1/vfs1/cm1 when named in
`uses` or `gains` of the landing, Styx / Thunder's Edge / Keleres breakthrough (a hook of the legendary effect that checks
`turn.planetId`), Naaz-Rokha commander, Winnu mech, Saar mech.

Takes place from the landing (`gainControl`) and from `takeControl(game, state, planetId, pack, warnings, entry?)`, the one
function that gives a planet; a play that gives one (Faunus, Peace Accords) calls it, and the hooks and the point run. It returns
whether the planet was newly gained.

## The point: `tradeGoodsOnControl`

`modify: { tradeGoodsOnControl: (value, { planetId }) => value + 1 }`; base 0; added to `state.tradeGoods` by `takeControl`
after the hooks. Scavenge. (A hook can do the same; the point is the cheap way.)

## The code files

| code | rule | step | made by | asked by |
| --- | --- | --- | --- | --- |
| `landingFromPlanet` | 49.2 | invasion | `checkLandings`, for each landing with `from`: params `planetId`, `from`, `unit` (first kind), `count` (all ground forces of the landing) | sardakkcommander |
| `placeNotControlled` | 67.4.1 | component | `placeOnPlanet` | orbital_drop, ms, primor, hopesend, f_deployment (it chose `componentTarget`, which belongs to the movement owner) |
| `explorationCondition` | 35.2 | invasion | `exploreCondition` | vfs1, exp1, cm1 |
| `attachTarget` | 12.1 | component | `attachCard` | nanoforge |

## The helpers (`replay/invasion.ts`)

- `placeOnPlanet(state, planetId, units, warnings, step?)`: adds ground forces; warns `placeNotControlled` for a planet not mine and places anyway.
- `exploreCondition(state, planetId, warnings): boolean`: "a mech on the planet or remove 1 infantry": mech keeps all, else removes one infantry, else warns and returns false.
- `attachCard(game, state, planetId, cardId, pack, warnings, { notHome?, notLegendary? })`: writes `state.attachments` (pass my state) and warns `attachTarget` with `reason` `notControlled` | `home` | `legendary`.
- `controlGained(before, after): string[]`: the planets mine after and not before (for a waiver `when` with `ctx.before`/`ctx.after`: Integrated Economy).
- `takeControl`, `gainControl(game, state, landedOn, pack, warnings, entry?)`: the signature of `gainControl` changed (one call site, `tactical.ts`).
- `stacks.ts`: `systemOfPlanet(game, planetId, pack)`, `inHomeSystem(game, planetId, pack)` (Meltdown, Nano-Forge).

## The field: `landings[].from`

`EntryBody` tactical `landings[].from?: string`, a planet id the ground forces are committed from. With it the units leave
`state.ground[from]`, not the space area, are left out of `landingOverLimit`, are warned of with `landingFromPlanet`, and a
shortfall on that planet is `unitsMissing`. The component waives with `when` (count per planet, adjacency, command token are its own text).

## Skipped, with the reason

- UI for `from` (the landing group offering ground forces of other planets: sardakkcommander): one component; the field and the check are built, so the domain tests flip, the three UI tests stay `test.fails`/`todo` for the batch.
- A control hook for opponents' entries (`rivalLandings`): rivals' components are not replayed.
- A "choices" editor for plays (items 8, 12, 23 of the needs): belongs to the play subsystem.
- `EffectTurn` gaining `gained`/`states`, `entry.choices` on every entry, `holds()` for legendary cards, `onGain` of a component (Stellar Genesis, Keleres breakthrough, Thunder's Edge): `holdings.ts` and `timeline.ts`, the play and holdings owners. For a planet gained, use the hook; for waivers use `controlGained`.
- Muaat hero (tile replacement), Crimson Legionnaire II start-of-turn placement, Saar mech deploy: exotic or no field to hold them.
- `componentTarget`, `choiceOverLimit`, `componentUnresolved`: codes of the movement and play owners.
