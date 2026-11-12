# Entry fields and interface pieces (pass 2, wave 3, owner: fields)

Code: `src/domain/effects/points/landing.ts`, `src/domain/commitSources.ts`, `src/ui/plan/blocks/LandingBlock.tsx`,
`src/ui/plan/blocks/ChoicesBlock.tsx`, `src/domain/replay/tactical.ts`.

## The landing offer: `ComponentEffect.landingOffer`

Declared by merging in `effects/points/landing.ts`; `landingOffers(pack, holder)` merges the offers of every component
in force. Nothing is offered unless a component in force declares it, so the plain landing stays as light as it was.

| Field | Offers | Asked by |
| --- | --- | --- |
| `structures: ['pds', 'spacedock']` | tiles "Land one PDS / Space dock" on every planet row of the landing, with no flight bringing them (they never run short of stock); written to `landings[].structures` | Reclamation, Reclaimer |
| `fromPlanets: true` | on each planet row, "Land one Infantry from <planet>" for the ground forces of the planets of the active system and of adjacent systems without my command token (`commitSources`); written as a landing of its own with `from` | G'hom Sek'kus |
| `shipsAway: true` | in the production row, buttons for the systems with my command token (`shipsTo`) | The Icon |

A landing with `from` and one without are two entries of `landings` for the same planet; `withLanding`, `withLandedStructure`
and `landedOn` touch only the one without `from`, `withLandingFrom` and `landedFrom` the one with it. A landing from a
planet never counts as ground forces that stood in the space area (`afterBattle`, `checkArrival`). `UnitDraftItem.id`
tells apart two items of one kind in a row (the same infantry from two places); the callbacks get it as the third argument.
The save schema keeps `landings[].from` and `shipsTo`.

## Choices keyed at run time: kind `counts`

`ChoiceSpec { kind: 'counts', verb: {ru, en}, slots: ctx => ChoiceSlot[] }`, `ChoiceSlot { key, unit, planet?, group?, max? }`.
`ChoicesBlock` draws one button per slot, named "<verb> <unit> [on <planet>]" (a press adds one; `aria-pressed` while above
0, the count beside it), and a "Take back: ..." minus that is always there (disabled at 0), so neither moves. Slots with the
same `group` (a system) stand under its name. Each count is kept in the entry's choices under the slot's `key`, so the effect
reads `choices[key]` as before. Refit Troops (key = planet id), Scuttle (key = `<unit>@<slot>`).

## Ships placed away from the active system: `shipsTo`

`EntryBody` tactical `shipsTo?: string`. In `landAndBuild` the ships of `production` stand in that system, the ground
forces where they always do, and the code `productionShipsAway` (68.2, step production; params `systemId`, `to`) is made for
everyone. The Icon (`breakthrough:bastionbt`) waives it in «Used» when the system holds my command token and a ground force
of mine and no other player's ships. Rule test: `lrr/068-production.test.ts`.

## Not built

- A second PRODUCTION in any system (Agency Supply Network, `technology:asn`): needs a production block for another system in
  the tactical editor (system, units, payment). One component, a new editor step: left as a hint, its tier test `test.fails`.
- Ships moved by a component entry (Helix Protocol, `leader:argenthero`): needs `moves` on the component entry, its editor
  (every ship, any system to any system), a replay step and a check of destinations. One component, a new editor step: left as a hint.
