# Infrastructure: payment, trade goods, commodities, transactions

What the owner of the payment subsystem built for the batch agents. Nothing here edits a component's file; each item
says which components asked for it (batch numbers from `docs/phase4/needs/payment.md`).

## Points of the count (`src/domain/effects/points/payment.ts`, declaration merging)

| point | context | base | asked at |
| --- | --- | --- | --- |
| `tradeGoodValue` | `{ kind: 'resources' \| 'influence', faction }` | 1 | `applyPayment`, `paymentValue`, `autoPay`: what one trade good spent is worth. Mirror Computing (04): `modify: { tradeGoodValue: v => v * 2 }`. The shortfall warnings run against the new worth; `shortTradeGoods` is unchanged. |
| `commodityValue` | `{ faction }` | printed value of the faction | `commodityValueOf` (`replay/cards/trade.ts`): Trade's replenish, `replenish`, `gainCommodities`. Dynamis Core (24): `v => v + 2`. |
| `planetResources`, `planetInfluence` | `{ planetId, attached? }`; `planetResources` also `dock?` (the player has a space dock on the planet: `planetValue` passes `state.docks`, the dock's Production passes `true`; Helios V2) (line added to `ModifierContext`) | printed value | `planetValue` (`domain/payment.ts`) in `checkPayment`/`applyPayment`/`autoPay`/`readyResources`/`readyInfluence`, the payment block. |

`attached` is the list of cards and laws attached to the planet (`shared.attachments[planetId]`). Cards attached to a
planet are held by no player, so `appliedToPlanet` asks them as well, for that planet only, in registry order.
A **law** is asked for every planet (it is in force for the game): its modify must look at `ctx.attached?.includes(id)`
to know it was elected for this planet (Core Mining, Senate Sanctuary, Terraforming Initiative: 27). A card that is
only ever attached (Terraform, Nano-Forge, Dyson Sphere, exploration attachments: 12, 24, 32, 33) needs no check:
it is asked for its planet alone. Whoever writes `shared.attachments[planetId]` (the `play` of the attaching card)
makes the value follow; the payment is given `shared` through `PayView`.

A held **planet card** (The Triad, `PLANET_CARDS` in `domain/payment.ts`, value 3/3 printed, then `planetResources` with
`planetId: 'relic:thetriad'`) is payable: it stands in `readyPlanetIds`, is exhausted in `holdings.exhausted`, the second
use warns `planetExhausted`, the status phase readies it. It is no planet of mine, so `planetNotControlled` is still
made for it: the component's waiver lifts it (`waive: [{ code: 'planetNotControlled', rule, when: w => w.params.planetId === id }]`). Not held: counts for nothing and warns as before (25).

## The hook of a transaction

`ComponentEffect.dealt?: (turn: DealTurn) => void`, any tier. After each transaction act of a turn is settled
(`replay/acts.ts`), it is asked of every component in force (`inForceOf`) of **both** sides. `DealTurn`:
`game` (the owner's view), `pack`, `entry`, `side` (`give` = the owner of the turn, `get` = the neighbour), `self` and
`partner` (`me` or opponent id), `faction`, `state` (this side, after), `other`, `shared` (my state), `gave` and `got`
(what actually moved; `components` carry the id as moved, notes with their address; commodities arrive as the receiver's
`tradeGoods`), `commodityValue`, `warnings` (the entry's).

- Dark Pact (10): on `side: 'give'`, when `turn.gave.commodities >= turn.commodityValue` and the partner is the Empyrean
  player (`turn.game` players by id), `state.tradeGoods += 1; other.tradeGoods += 1`.
- Black Ops (14), Support for the Throne (34): the note is held by the receiver after the deal, so its own `dealt` runs;
  check `turn.got.components` for its id with the address, then change `state` (and `lose` it from the holder to purge).
- Hubris (10): `push(violation(noteRefused.code, { id, name }))` for an Alliance in `turn.got.components`.
- Dealt is for components that are in force; it runs for every transaction act, so test `gave` / `got` first.

A new code **`noteRefused`** (`rules/codes/noteRefused.ts`, LRR 94.3 and 69.5, step `transaction`) is for such
restrictions. Rule test `rules/lrr/094-note-refused.test.ts`.

An **action card** in a transaction now warns `transactionKind` for everyone (94.3.1); it still changes hands. Arbiters
(02) and Black Market Dealings (23) waive it (`when`: the id of the card or kind; the waiver of Black Market is asked of
the entry that names it in `uses`). `TRANSACTION_KINDS` still says what the editor offers; `TransactionStep` takes a
`uses` prop: when a used component's effect has a `waive` of `transactionKind`, relics and unscored secret objectives
are offered too (23). The test 094 "94.3.1" was changed to expect the warning.

## Helpers for a `play` (`src/domain/replay/payment.ts`, `replay/cards/trade.ts`)

- `spendTradeGoods(state, n, warnings, step = 'payment')`: takes what is there, warns `shortTradeGoods {needed, have}`,
  never below zero (Bribery 18, Mercenary Contract 23, F. Researched 19, Trade Routes 28, Vast Reserves 30).
- `commoditiesForShortfall({ state, warnings })`: after the entry's payment, takes from the commodities what the payment
  lacked in trade goods (read from its `shortTradeGoods` warning of step `payment`) and returns it (Keleres agent 13:
  `play: turn => void commoditiesForShortfall(turn)` plus `waive: shortTradeGoods`). `play` runs after the payment.
- `replenish(game, state, pack, shared?)`, `gainCommodities(game, state, pack, n, shared?)` (capped at the value, returns
  the gain), `commodityValueOf(...)`: Hacan agent (02), Dynamis Core (24), exploration `aw1`/`fb1` (33).
- `pay(state, payment, kind, pack, warnings, view?)`, `checkPayment(state, payment, view?)`, `applyPayment(..., view?)`:
  `view = { faction, shared?, step? }` (`PayView`); `step` puts the warnings in another block, e.g. `'status'` for the
  scoring payments of the status phase (29, 30). Without `view` the printed values stand.
- `readyPlanets(state, planets, warnings, step = 'card')`: the step of `readyNotControlled` (Brilliance 23: `'component'`).
- `planetValue(pack, state, planetId, kind, view?)`, `tradeGoodWorth(...)`, `paymentValue(payment, kind, pack, at?)`,
  `readyResources/readyInfluence(state, pack, view?)`: for objectives that count ready planets (Monument, Sway the Council,
  Hoard Raw Materials: 28, 32). `autoPay(state, need, kind, pack, view?)` knows a trade good may be worth more.

## The cost of a component action

`ComponentEffect.cost?: { kind: 'resources' | 'influence'; amount: number }` (any tier) and the field
`payment?: Payment` of the `component` entry. When the component played by a component entry declares a `cost`, the
replay (`payPlayedCost`, called by `timeline.applyEntry` before the plays) pays the entry's `payment`: planets exhausted,
trade goods spent, shortfall warned as `shortResources`/`shortInfluence`, all at step `component`. The editor
(`TurnEditor`) shows the payment block for it and seeds it automatically. Impersonation 3 influence (22), Plagiarize 5
influence, Enigmatic Device 6 resources (33): `effect: { tier: 'play', rule, cost: { kind: 'influence', amount: 3 } }`,
no `play` needed for the payment.

## Testing without a component file

`src/domain/effects/points/throwaway.ts`: `vi.mock('<path>/effects/registry', async o => (await import('<path>/effects/points/throwaway')).mockRegistry(await o()))`,
then `throwaway['<id>'] = effect` and `alwaysInForce.push('<id>')`. Used by `points/payment.test.ts`,
`TransactionStep.test.tsx`, `TurnEditor.cost.test.tsx`, `rules/lrr/094-note-refused.test.ts`.

## Not built, with the reason

- Hooks at a phase start (Council Patronage 13): the round and status flow, not payment.
- Control gained (`tradeGoodsGained`/`controlGained`: Scavenge 01, Minister of Exploration 26, Assimilate/Liberate 04, 16),
  `commitInfluence` (Keleres mech 13): `gainControl`/`landUnits` of invasion.
- Strategy token spent giving trade goods (Magmus 02), research cost and prerequisites (Inheritance Systems 04, Brilliant
  06, Jol-Nar agent 06, researchPrerequisites): the research subsystem (`cards/technology.ts`).
- Choices for a component in `uses`, a choices editor for component actions (05, 17, 34): the play subsystem.
- The status editor, scoring payments' UI (29): the status subsystem; the replay side is `view.step = 'status'`.
- Relic fragments held and in transactions, exploration cards in holdings (33): holdings, not payment.
- A specialty given by an attachment (`exploration:warfare`), `attachTarget`, `relicFragmentsShort`, `playTargetInvalid`:
  one-off mechanics of the attaching/play subsystem.
- Black Ops' tokens: the deal has no pool field; the `dealt` hook may choose.
- Tokens, and a choice, when received by Hubris at setup (`startForFaction`): holdings.
