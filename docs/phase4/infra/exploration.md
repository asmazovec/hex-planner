# Exploration cards and what is attached to a planet (pass 2, wave 3)

## Cards kept by a player: `Holdings.found`

An exploration card is held only when it stays in the play area: a relic fragment (35.9, `detail.resolution ===
'fragment'`) and Enigmatic Device (35 note 2). `staysInPlay(def)` in `src/domain/holdings.ts` says which. `found` keeps
repeats (a copy per fragment found), like the hand of action cards.

- `HOLDING_FIELD.exploration = 'found'`: `gain` pushes a copy of a card that stays, `lose` removes one copy, `holds` is
  true for an exploration card that does not stay (it is played where it was explored: DMZ in `uses`).
- `GainsBlock` (HELD_KINDS) now offers exploration cards; «Dropped» offers the copies held (`losable`).
- Transactions: `TRANSACTION_KINDS` has `exploration`; `acts.ts` warns `transactionKind` for an exploration card that
  does not stay (35.9.2 lets only fragments change hands).
- `playComponent`: a card whose printed text says "purge this card" leaves `found` (Enigmatic Device). A fragment is
  purged by the entry's `spends`, three copies.
- Storage: `StartHoldings.found` (schema.ts `startHoldings`), set by hand in the components drawer (relics group, with
  the stepper «In play area»). The relics count of a player includes the fragments.
- Relic fragments: `exploration/batch33/fragments.ts`. The ACTION checks, when played, that the type's fragments held
  before the entry (the unknown fragment standing for any type) are three: `relicFragmentsShort` (73.1).

## Attachments reaching the count points

- `planetResources`/`planetInfluence` contexts carry `pack` (`appliedToPlanet` passes it): a card can read what the
  planet prints.
- `productionValue` context carries `attached`; `dockValue` and the PDS line of `replay/production.ts` pass
  `state.attachments[planetId]` and ask the resources through `appliedToPlanet`, so Mining World and the like count in a
  dock's Production. Limit: attachments stand on my state, so a rival's production counts none.
- `specialtiesOf(pack, planetId, attached)` in `payment.ts`: printed specialties and those of attached cards
  (`detail.techSpecialty`); `techSlicePlanets` (the expedition's technology part) uses it.
- `exploration/batch33/facility.ts`: the four research facilities, attached where explored; on a planet that already
  has a specialty, +1 resource and +1 influence instead.

## An attached card in force: `restrict`

`afterEntry` asks `restrict` of every card attached to a planet (`shared.attachments`) that is not already in force
through the holder's laws, for every entry. Demilitarized Zone (exploration) uses it: `planetDemilitarized` (12.1, 35.8)
for a landing, a ground production or a structure on its planet; the entry that plays the card is not warned.
`effects/helpers/planetsNamed.ts` lists the planets an entry puts units on.

## Agenda: Holy Planet of Ixth

`productionValue` modify (0 for a dock whose planet has the law attached) and `onGainControl` (+1 victory point). The
point `vp` stays asked by no step, so the effect has no `vp` modifier. Losing control (-1) is not modelled.
