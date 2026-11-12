# Infrastructure: production (pass 2, wave 1)

What the production owner built for the batch agents. Code names, point names and helpers are exact. Nothing here
edits `Modifiers` or `ModifierContext` in `types.ts`: the points are added by declaration merging in
`src/domain/effects/points/production.ts`, which any file that calls `applied` for them imports (`../effects/points/production`).

## Warning codes (each a file in `src/domain/rules/codes/`)

| code | rules | step | made when | asked by |
| --- | --- | --- | --- | --- |
| `dockInfantry` | 68.1, 79.1 | production | infantry are built and no producer of the system may build them: every dock has the point `dockInfantry` at 0 and nothing else produces. Params: `systemId` | mitosis (the red tests already use this name) |
| `warSunLocked` | War Sun 1, 67.1 | production | any war sun in a production. The step never names the technology: `technology:ws` waives it, the Muaat's sheet does too. Params: `systemId` | ws, Muaat sheet |
| `productionNotAllowed` | 67.1, 89.5 | production | an entry on Construction's **primary** carries `effects.production`. Params: `systemId`. The secondary keeps `constructionUnits` (the two do not stack). Where a card entry produces on Construction, the production is checked as a tactical one (`source 'system'`): `productionOver` names the value of the system, `shortResources` still counts | minister_industry |

Not built, and why: `productionShipsAway` plus the entry field `shipsTo` (one component, The Icon's Bastion; an exotic
placement with a map pick); `planetClosed` and `planetDemilitarized` (made at the landing, which is the invasion
owner's; the placement and production halves wait for their code); `replacementCost` and `placementOverLimit` (one
play each); `researchUnavailable` and `prerequisitesMissing` (research owner).

## Points of the count

All asked through `applied(pack, holderOf(game, state), point, base, ctx)` (the faction sheet, the controlled legendary
planets and the laws are asked too).

| point | context | base | meaning | asked by |
| --- | --- | --- | --- | --- |
| `productionValue` (existing) | `{ structure, planetId }` | dock: resources + 2, after `planetResources`; **PDS: 0** | A PDS whose value is above 0 is a producer; its value is multiplied by the PDS on the planet and pooled. Not used by Warfare's secondary. The generated level II swaps only the printed number (`value - printed + production`), so what changed the planet's resources stays in it | ht2, dt2, helios2, mw |
| `planetResources` (existing) | `{ planetId }` | the planet's resources | The dock's value now asks it first: a component that raises a planet's resources raises its dock's Production (Helios, Mining World). The context is still `{ planetId }`: the payment owner may extend it (attachments, a dock on the planet); the call in `production.ts` `dockValue` then needs the same fields. **Helios2 must not add the +2 to `productionValue` again** | mw, helios2 |
| `unitProduction` | `{ faction, unit, planetId }` | printed value of the level I unit (the Letani Warrior: 1; others 0) | A ground unit that produces. Asked for each unit type on a planet I control; the value is multiplied by the units there and pooled. Letani Warrior II: `modify.unitProduction: v => v + 1` | lw2 |
| `planetProduction` | `{ planetId, systemId, structures: { pds, spacedock } }` | 0 | A planet I control that produces as a whole. Asked only for planets I control (so Custodia Vigilia: `ctx.planetId === 'mr' ? 3 : v`; Aerie Hololattice: `ctx.structures.pds || ctx.structures.spacedock ? 1 : v`) | custodiavigilia, aerie hololattice |
| `spaceProduction` | `{ systemId, anomalies, units }` | 0 | A system's space area that produces; asked only where I have units. `anomalies` holds the tile's anomalies (`'supernova'`...) | Magmus Reactor |
| `productionTotal` | `{ systemId, faction }` | the pooled sum of the producers | After the sum; for the one `homeDock` source the largest dock. War Machine: `v => v + 4` | war_machine1 |
| `productionCost` | `{ faction }` | the combined cost of the units | After the unit costs. Asked only when a unit used PRODUCTION (producers existed before the units were placed); a production with no producer gets no reduction (Sarween ruling 1). Applies to a tactical action, a card's production and a component's production | st, war_machine1 |
| `dockInfantry` | `{ faction, planetId }` | 1 | 0: this dock's Production may not build infantry (68.1 note 4) | mitosis |
| `dockFighters` | `{ planetId, systemId }` | 3 | Fighters a dock keeps apart from capacity, per dock (`dockFighterRoom` in `transport.ts`) | dt2 |

`unitCost` (existing) now asks the laws too: `productionCost(units, faction, who, pack, entry?)` takes a `Holdings` or a
`Holder` (`holderOf(game, state)`); the replay passes the holder, so a law (Regulated Conscription) counts. The UI price
in the tactical editor and `withProduction` do too.

## A play effect that changes a number for its own entry

`appliedFor(pack, who, entry, point, base, ctx)` in `src/domain/effects/entryApply.ts` is `applied` plus the `modify` of
the `play` effects the entry names (`playedBy`: its component action, `spends`, `uses`; each once, so a second copy adds
nothing). Write the effect with `tier: 'play'` and a `modify`; the contract test now accepts `modify` on a `play` effect
(a hint still has none). It is asked for these points: `unitCost` (Harrugh Gefhara: `() => 0`), `productionTotal`,
`productionCost`. The component need not be held for its modify to count (a play of one not held is warned of by
`componentNotHeld`); if the text requires it ready, narrow it in a waiver's `when` or do not rely on `modify`.

## Producers and helpers (`src/domain/replay/production.ts`)

- `producerList(game, state, systemId, pack, source?)`: every producer of mine in a system, `{ kind: 'dock' | 'pds' |
  'unit' | 'planet' | 'space', planetId, value, infantry }`. `producers()` is its planet ids. A scar gives none.
- `systemProduction(game, state, systemId, pack, source?, entry?)`: the pooled value with `productionTotal` applied; 0
  with no producer. For the secret objective PEM ("a system whose units' Production sums to 8").
- `unitLimitWarnings(state, units, pack, step?)` and `unitsOnBoard(state, unit)`: the reinforcement limit
  (`reinforcementsOut`) for units a play puts on the board (Aeurex Mechanica, Avernus). Fighters and infantry are not limited.
- `costOf(game, state, units, pack, producing, entry?)`: unit costs and the combined cost.
- `applyComponentProduction`: a `component` entry now has `effects?: CardEffects` (as a card's); its `production` is
  checked (system source), placed, paid with `effects.payment` and its system checked. No editor writes it yet (see below).
- `checkProduction(..., source, step, entry?)` and `payProduction(..., producing)` take the entry and the flag.
- `placeCarried` (structures.ts): the `unitsMissing` of a structure missing from the space area now carries `planetId`
  (Reclamation, Reclaimer).

## Renames and decisions for the batch agents

- The red tests agreed on `dockInfantry`, `warSunLocked`, `productionNotAllowed`: no rename.
- `productionStructure`/`structureProduction` (batch 09 and 12 asked for a point with different names for a PDS or a
  structure that produces): use `productionValue` with `structure: 'pds'` for the PDS (as the ht2 test does) and
  `planetProduction` for "a planet with a structure produces" (Aerie Hololattice). `dockInfantry` is the name of the
  point and of the code.
- `statusInfantry` (Mitosis at the status phase) is the status owner's, not built here.
- The shared test `unitUpgrades.test.ts` pins `ffac2` and `dt2` at resources + 4: whoever gives them a flat value changes
  those cases (they are not pass 1 reds).

## Skipped needs (with the reason)

- Offering my other docks' planets outside the active system in the shop of the big hex (saarcommander): the shop's
  rows are the planets of the system; one component asks. The waiver `when` can check the dock and the blockade.
- A choices editor for component actions, and a production block in the component editor (arborechero, muaatagent,
  sr, titanprototype...): the editor of component actions is the play owner's; the domain takes `effects.production`.
- `shipsTo` (Bastion), `extraProduction` (Agency Supply Network): one component each, exotic.
- Titans' Hecatoncheires in the Construction block (mech and infantry instead of a PDS): one component; the check
  `constructionUnits` is in place for its waiver.
- A play effect running `play` for `uses` after the production (sar, aida, titans commander): `timeline.ts` already
  runs `play` for each component an entry names, but after the whole entry, not between steps; hooks between steps are
  the play owner's.
- `Modifiers` for the laws of a planet (Holy Planet, Demilitarized Zone): the context needs the attachments; payment owner.
