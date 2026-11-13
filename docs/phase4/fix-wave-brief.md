# Fix wave after the faction playthroughs: common brief

33 long games were played through the interface; the reports are in `docs/phase4/playthrough-reports.json`
(array of `{faction, covered, notCovered, findings[]}`; a finding has `kind, severity, title, component, repro,
expected, actual, evidence, confidence`). You own ONE group of findings, named in your task. Find them in the
file by the title words given (node one-liner), read `repro`, `expected`, `actual`, `evidence` of each, including
the same problem reported by other factions.

Rules of the work:

- You are in your own git worktree. If `node_modules` is missing, link the main checkout's:
  `cmd /c mklink /J node_modules C:\Users\asmaz\Projects\ti4-planner\node_modules`. Never run anything in the main checkout.
- Check each finding before fixing: reproduce it with a failing test FIRST (vitest in the domain or a `*.ui.test.tsx`;
  Playwright only when nothing else can show it). A finding that is the tester's mistake or a deliberate product
  decision is not fixed: say so in the report with the reason. Rules are checked in the knowledge-rag corpus
  (ToolSearch "knowledge-rag") and the test quotes the LRR section or card text.
- Follow CLAUDE.md: the product stays light, warnings never block, new interface is built from the shared
  primitives, texts go through i18n in ru and en with Hobby World terms, component texts are never typed by hand
  (game data only through `scripts/build-data.ts`), repeated controls do not move under the finger.
- Stay inside your group. Other agents fix the other groups at the same time in the same files' neighbours: keep
  the diff small and local, do not reformat, do not rename shared things, do not touch `tests/scenarios`.
  If the fix needs something from another group, do the minimum and write it in the report.
- Before the end: `npx tsc -b`, `npm run lint`, `npm run lint:terms`, `npx vitest run` (all of it) are green;
  if you touched `src/ui`, also `npm run e2e` with your own port: `E2E_PORT=<port from your task>`.
  Update CLAUDE.md only where a statement in it became false.
- Commit to your worktree branch (several commits are fine), message ends with
  `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`. Do not push, do not merge.
- Final answer: branch name; per finding: fixed (test file) / not a bug (why) / left (why); what the scenario
  specs in `tests/scenarios` now assert wrongly because of your fix (file and the `// BUG` step), so they can be updated.

## Second wave (after the first was merged and published)

Same rules, with these changes:
- Many findings of the reports are ALREADY FIXED by the first wave: read `docs/phase4/fix-wave-changes.md` and check
  each finding against the current code before touching it. Only what still reproduces is yours.
- Do NOT run the whole `npx vitest run` or `npm run e2e`: twelve agents doing that at once made the machine unusable.
  Run `npx tsc -b`, `npx eslint` on the files you changed, `npm run lint:terms`, and vitest only for the files and
  folders you touched plus the contract tests (`src/domain/effects/contract.test.ts`, `src/domain/rules/contract.test.ts`,
  `src/storage/schema.contract.test.ts`, `src/domain/startStructures.test.ts`). The full suite and e2e are run once after the merge.
- Never run `npm run build` in the main checkout. Save every file as UTF-8 (two files of the first wave were written
  in cp1251 and broke the build): no PowerShell `Set-Content`/`Out-File` without `-Encoding utf8`, prefer the Edit/Write tools.
- A new field of an entry or of the game must be added to `src/storage/schema.ts` (the contract test will tell).
