# Wave 1: what the owners did not build

Each line is a need of pass 1 an owner left out, with the reason. A batch agent that meets one keeps its test red (`test.fails`) and reports it.

## production

- shipsTo and productionShipsAway (Bastion): one component, exotic placement with a map pick
- extraProduction (Agency Supply Network): one component
- Shop of the big hex offering my other docks' planets outside the active system (Saar commander): rows of the shop are the system's planets; one component; waiver when can check the dock
- Choices editor for component actions and a production block in the component editor (Muaat agent, Arborec hero UI, Sling Relay, Titan Prototype, Nanomachines...): belongs to the play owner's editor; domain accepts effects.production on component entries
- planetClosed and planetDemilitarized codes: made at the landing (invasion owner); attachment context also missing
- replacementCost, placementOverLimit: one play component each
- researchUnavailable, prerequisitesMissing, statusInfantry, vp point, attachments in the planetResources context: neighbours (research, status, payment)
- Hecatoncheires (mech and infantry instead of a PDS) in the Construction block: one component; the check constructionUnits exists for the waiver
- dt2 gravity rift of the dock's system, and play hooks between production and placement (sar, aida, titans commander): movement and play owners
- Interface and Playwright: no new repeatable control was added, so no e2e spec was changed or run

## payment

- Council Patronage round-start hook (13): round/status flow, not payment
- tradeGoodsGained/controlGained on gaining control (Scavenge 01, Minister of Exploration 26, L1Z1X bt 04, Liberate 16) and commitInfluence for the Keleres mech (13): gainControl/landUnits of invasion
- Magmus strategy-token trade goods (02), research cost/prerequisites (Inheritance Systems 04, Brilliant 06, Jol-Nar agent 06, researchPrerequisites): research subsystem
- Choices for components in `uses` and a choices editor for component actions (05, 17, 34, Plagiarize/Divert Funding): play subsystem
- Status editor and scoring payments UI (29, 30): status subsystem; replay side ready via view.step='status'
- Relic fragments held and in transactions, exploration cards in holdings and GainsBlock (33): holdings
- exploration:warfare specialty through an attachment, attachTarget, relicFragmentsShort, playTargetInvalid: one-off mechanics
- Hubris setup purge (startForFaction) (10): holdings; Black Ops token pools: no deal field, the dealt hook may choose
- Triad's fragment bonus: no fragments held

## movement

- No new warning code: every check the movement components lift already exists; codes named by red tests (systemOccupied, wormholeTokenPlace, planetNotGainable, componentTarget, converterTarget, techNotFromNeighbor, factionTechCopied, landingFromPlanet, productionShipsAway, fleetPoolTokens, researchUnavailable) belong to play, invasion, production or status. Because there is no new code there is no new rule test under src/domain/rules/lrr
- Warning for a jump between systems that are not joined (batch 15 general, Sever, Sundered, Incursion): CLAUDE.md makes the jump a deliberate, never-warned move
- A component of another player imposing a route check (technology:ah, routeBlocked context structures): one card, shape unclear
- Route-reach highlight following waivers (Antimass Deflectors, Light/Wave Deflector, Gravity Drive) and Travel Ban dropping adjacency: a waiver applies to a warning, links only add
- Entry fields and interface pieces (component choices editor, moves on a component entry, useChoices, LandingBlock structures from reinforcements, landing from a planet): one-card needs or other subsystems; no repeatable control added, so tests/e2e/steady-controls.spec.ts is untouched
- Production and payment items (ffac2, hacanbt, ghostbt, mr, ah as producer, planetResources in payment.ts), status items (fleetPoolMax, fleetAtStatusEnd, Ministers' trade goods points), Holdings note in hand vs in play (Trade Convoys), Muaat Star Forge, Floating Factory in space

## invasion

- UI for landings[].from (LandingBlock offering ground forces of other planets): one component (sardakkcommander); domain is built, its UI tests stay red/todo
- control hook for opponents' entries (rivalLandings): rivals' components are not replayed
- choices editor for plays (needs 8, 12, 23): belongs to the play subsystem
- EffectTurn gained/states, entry.choices on all entries, legendary holds() needing control, onGain of a component (Stellar Genesis, Keleres bt, Thunder's Edge): holdings.ts/timeline.ts, play and holdings owners; the hook and controlGained cover the invasion side
- Muaat hero tile replacement, Crimson Legionnaire II start-of-turn placement, Saar mech deploy: exotic, no field/model
- componentTarget, choiceOverLimit, componentUnresolved codes: movement and play owners; items about exploration plays in gains are covered by the hook for planets gained in a tactical landing only
- combat.ts and LandingBlock.tsx: nothing needed

## research

- handOverLimit (batch 08): the hand limit belongs to the hand, not to research, so a neighbour owns it.
- returnedTechInvalid (Divert Funding) and playTargetInvalid (Brilliance, Mercenary Contract, Scuttle): one-off checks of a played card. The helpers techOf and colourOf are there for them.
- Choices editor and showComponent harness for the components that research or return a technology (tech_rider, divert_funding, fires, shareknowledge, deepwroughthero, cripple and others): belongs to the play subsystem. ResearchBlock can serve as the technology picker.
- Lending a technology until the end of the status phase (Share Knowledge) and an on-gain hook (Quantum Core): state and holdings mechanics of a neighbour.
- Check that a faction technology belongs to the player's faction (90.11): no red test asks for it.
- Waiver or modify of research by a law or legendary planet at researchAsPrimary: the card cost has holdings and faction only, no laws.
- Data fix: some technologies print prerequisites that the pack lacks (Gravity Drive has none in the pack); the build script is not mine.
- No new e2e journey: the specialty buttons were added to the existing steady-controls test (which passes, though the argent bench may show no specialty planet).

## status

- Choice UI for a component action's choices (Fabrication, Orbital Drop, Repeal, Bribery, Emelpar): belongs to the play subsystem owner.
- pass.choices and tactical.choices (Ral Nel hero, Ordinian, Acamar agent pool): entry bodies of the play owner.
- Mitosis infantry of the status phase (Arborec mech): exotic one-faction step.
- Hook on change of control of a planet (Styx, Thunder's Edge legendary, Holy Planet of Ixth VP): invasion.ts is another owner's; the vp point stays unasked.
- Adding the points of a scored objective to state.vp: points are typed by hand and plans would count twice.
- USED_KINDS exploration in UsesBlock: the uses block belongs to the play owner.
- Elect Scored Secret Objective law (Classified Document Leaks) and transfer of a law between players after combat (Crown of Emphidia, Shard of the Throne): combat winners not modelled.
- Codes warSunAbsent, placeNotControlled, componentCondition, playCondition, attachmentTarget, explorationCondition: they belong to the play, production and exploration neighbours.

## play

- Points file src/domain/effects/points/play.ts: no pass-1 report asked a number that no existing point gives; handLimit exists and is now asked
- play-tier effect with `modify` held only for the naming entry (actionCard:fs1): needs the entry in Holder at every count point
- A component of another player named in a rival's `uses` (Deepgloom Executable, batch 08): needs an owner address on a use
- Map picking (MapPickButton) for a system choice: systems are buttons named by planets or number, light by design
- Mahact starting without its own Hubris note (startForFaction in src/domain/holdings.ts, batch 10): outside the subsystem
- Automatic return of an Alliance note when the owner's units are activated (batch 34)
- Faction check of sheet abilities in holds(): reverted, because existing tests (LRR 22.1, Aetherpassage) and batches 02/03 say holds passes for every faction and the play checks game.faction itself
- Steady-controls e2e spec: no real component declares a number choice yet, and the stepper is the already covered Stepper primitive
- Count points planetResources, planetInfluence, researchCost, prerequisites, tokensGained, vp are asked by no step; owners of payment, research and status call applied with holderOf
- Laws for a rival's state at speed, capacity, unitCost: a rival's state keeps no laws, so a law reaches these points for me only

## moments (wave 3)

- The opponents' round-level moments (`onRoundStart`, `onStatusStart`, `onStatusEnd`): their components are not replayed.
- A strategy token spent through a status entry's `spend`, and units destroyed outside a tactical action: no hook.
- The opponent who takes Styx gains its point: opponents' scores move only by their status entries.
- Crimson Legionnaire II's commodity gain or conversion, Fleet Regulations "Against", Malevolency's hand-over: the player's choice or a one-off outcome, entered by hand.
- Share Knowledge: a technology outside the note's candidates is taken as entered; no warning code.
