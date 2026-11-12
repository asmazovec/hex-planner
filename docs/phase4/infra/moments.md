# Infrastructure of the moments of a round (pass 2, wave 3)

Moments the replay did not tell components about: the start of a round, the start and the end of the status phase, the
start of a turn, a strategy token spent, a use of PRODUCTION, a planet lost, units destroyed; and the fleet pool maximum.
The code stands in `src/domain/effects/points/moments.ts` (hooks, points and the runner, by declaration merging), the
calls in `replay/timeline.ts`, `cards.ts`, `status.ts`, `tactical.ts`, `invasion.ts` and `cards/trade.ts`; the tests of
the infrastructure use throwaway effects (`moments.test.ts`).

## Hooks on `ComponentEffect`

All are for a `passive` effect, run while the component is in force (`inForceOf`), in registry order, with a
`MomentTurn`: `game`, `state` (the player's), `shared` (mine), `pack`, `warnings` (of the entry the moment belongs to;
push checks with `violation`), `id` (the component as held, a note under its address), `player`, `states` (everyone's).

| Hook | When | Extra fields | For |
| --- | --- | --- | --- |
| `onRoundStart` | once a round, before the first entry of the round that is replayed (a round with no replayed entry has none) | | me |
| `onStatusStart` | once a round, before the first entry of the status phase, or when the agenda begins if no status entry came first | | me |
| `onStatusEnd` | once a round, when the status phase ends (`finishStatus`: after the first status tokens entry's tokens, the board cleared and the cards readied) | | me |
| `onTurnStart` | before each turn entry of the action phase (`isTurn`: tactical, strategic, pass, a component action that is not a window) | | the owner of the entry |
| `onTokenSpent` | after a strategy card's token (primary for a token, secondary) or `spendStrategyTokens` of a component | `count`, `card`, `secondary` | the owner of the entry |
| `onProduced` | after a tactical action's production, when a unit used PRODUCTION | `units`, `systemId` | the owner of the entry |
| `onControlLost` | an opponent's landing takes a planet I control (`rivalLandings`); in force is asked before the loss | `planetId`, `to` | me |
| `onDestroyed` | at the end of a tactical action, with its `losses` (space, `systemId`) and `groundLosses` (`planetId`) | `losses[]` of `{ unit, count, planetId?, systemId? }` | the owner of the entry |

The warnings a round-level hook makes go to the entry replayed next (`lead` in `timeline.ts`); `onStatusEnd`'s to the
status entry that ended the phase. A status phase the plan does not reach (no status entry, no agenda entry) has no
`onStatusStart` and no `onStatusEnd`, as the plan has not said it happened.

Not built: the opponents' round-level moments (their components are not replayed), the destruction of units outside a
tactical action, a spent token in a status entry's `spend`.

## Points of the count

- `fleetPoolMax: { faction }`: the most tokens a fleet pool may hold; the base is no limit (`Infinity`). Checked after the
  status entry's tokens, a card's tokens and `gainTokens`: more tokens warn `fleetPoolTokens` (`fleet`, `limit`, LRR 37.1,
  step `status`). Asked by `agenda:regulations` (`Math.min(value, 4)`).
- `tradeGoodsOnReplenish: { faction, neighbours }`: trade goods gained after the owner replenishes commodities; the base is 0.
  `replenishWith` (`replay/cards/trade.ts`) asks it after Trade's primary and secondary and after Council Patronage;
  `neighbours` counts the players who are the owner's neighbours (LRR 60). Asked by `agenda:minister_commerce`.

## State

`GameState.onCard?: Record<componentId, { units?, technology? }>`: what waits on a component's card, by the id as held.
Crimson Legionnaire II keeps the infantry destroyed there until the next turn start; Share Knowledge keeps the
technology lent until the status phase ends.

## Components built on it

`leader:muaatcommander` (`onTokenSpent`), `breakthrough:hacanbt` (`onProduced`), `ability:council_patronage`
(`onRoundStart`), `promissory:malevolency` (`onStatusEnd`), `promissory:shareknowledge` (play and `onStatusEnd`),
`legendary:styx` (`onControlLost`), `technology:cl2` (`onDestroyed`, `onTurnStart`), `ability:mitosis` (`onStatusStart`),
`agenda:minister_commerce` (`tradeGoodsOnReplenish`), `agenda:regulations` (`fleetPoolMax`).
