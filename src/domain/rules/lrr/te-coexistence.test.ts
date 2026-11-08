/** Thunder's Edge: Coexistence. Source: tirules2 rules-reference/coexistence.md (Notes; no LRR section). */
import { describe, test } from 'vitest';

const WHY = 'not modelled: a planet has one controller and a landing counts as a won invasion, coexistence is not tracked';

describe("Thunder's Edge: Coexistence", () => {
  test.todo(`coexistence 1: some effects let players share a planet without combat — ${WHY}`);
  test.todo(`coexistence 2: one of them controls the planet, the others coexist — ${WHY}`);
  test.todo(`coexistence 2.1: told to coexist on a planet someone else controls, the controller keeps it — ${WHY}`);
  test.todo(`coexistence 2.2: told to coexist on my own planet, another player gains it exhausted — ${WHY}`);
  test.todo(`coexistence 3: a coexisting structure is always blockaded — not modelled: blockades are not tracked`);
  test.todo(`coexistence 4: units added to coexisting ones coexist at once — ${WHY}`);
  test.todo(`coexistence 5: when one player is left the coexistence ends, and a coexisting player gains control — ${WHY}`);
  test.todo(`coexistence 6: bombarding a shared planet picks whose units take the hits — not modelled: bombardment is not counted`);
  test.todo(`coexistence 6.1: with several bombarding units the choice is made per unit — not modelled: bombardment is not counted`);
  test.todo(`coexistence 6.2: extra hits do not pass to another player's units — not modelled: bombardment is not counted`);
  test.todo(`coexistence 7: the controller may start a ground combat against a coexisting player — ${WHY}`);
  test.todo(`coexistence 8: a coexisting player may start a ground combat against the controller — ${WHY}`);
  test.todo(`coexistence 9: committing ground forces to a planet I had no units on starts a ground combat — not modelled: ground combat outcome is not counted, the landing takes the planet`);
  test.todo(`coexistence 10: winning gives control, then more combats may follow against other coexisting players — ${WHY}`);
  test.todo(`coexistence 11: a coexisting player controls the planet only for scoring — not modelled: objectives are not checked`);
});
