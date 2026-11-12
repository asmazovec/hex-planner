# Shared base for component effects (pass 2, wave 1)

One file per subsystem: `exploration.md` (wave 3), `play.md`, `movement.md`, `production.md`, `payment.md`, `research.md`, `status.md`,
`invasion.md`. What no owner built is in `skipped.md`. Read the file of every subsystem your component touches.

## Decided when the seven branches were merged

Where a subsystem file disagrees with this list, this list is right.

- `EffectTurn` is one type for `play`, `gained`, `lost` and `restrict`: `game`, `state`, `shared`, `entry`, `id`,
  `player`, `states`, `choices`, `held`, `pack`, `warnings`, and `cards` on the entries of a round. `choices` is always
  `choicesFor(entry, id)`: the entry's `choices` for its component action (or for an entry with no component action,
  as an agenda entry), then `useChoices[id]`. The interface writes `useChoices` for a component named in «Used».
- `gained` and `lost` are called in one place, `src/domain/replay/afterEntry.ts`, after the entry's gains. There is no
  `GainTurn` hook.
- `handOverLimit` is checked once, in `afterEntry.ts`, for an entry that gains action cards; its step is `round`.
- Two helpers are named `appliedFor`, and both let a play effect's `modify` count for the entry that names it:
  `src/domain/effects/entryApply.ts` — `(pack, holder, entry, point, base, ctx)`, used by production and unit costs;
  `src/domain/effects/points/status.ts` — `(pack, holder, entry, before, point, base, ctx)`, which also asks that the
  owner holds the component ready. Use the one the step you touch already uses.
- The point `dockFighters` is declared in `points/production.ts` (`faction` optional).
- `holderOf(game, state, shared)` gives the laws that bind the player (`lawOwners`) and the other players' holdings
  (`others`, for an Alliance note). A law reaches a rival's count only through `shared`.
- The code for lacking prerequisites is `prerequisitesMissing`. Tests that say `researchPrerequisites` or
  `prerequisiteMissing` are renamed by their batch.
- `relic:obsidian` and the «lacks one prerequisite» tests of `technology:analytical` were turned into `test.fails` by
  the owners because the new checks made them red; their batches turn them back when the effect exists.
- An agenda entry keeps `choices.card` as text; read it with `Number()`.
- A play that writes wormhole tokens writes to `turn.shared`.
