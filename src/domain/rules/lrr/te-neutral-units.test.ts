/** Thunder's Edge: Neutral Units. Source: tirules2 rules-reference/neutral-units.md (Notes; no LRR section). */
import { describe, test } from 'vitest';

const WHY = 'not modelled: neutral units are neither placed nor tracked, enemy units belong to opponents only';

describe("Thunder's Edge: Neutral Units", () => {
  test.todo(`neutral units 1: neutral units appear in Fracture systems when it opens and by other effects — ${WHY}`);
  test.todo(`neutral units 2: ships in a space area with neutral units fight a space combat against them — ${WHY}`);
  test.todo(`neutral units 3: ground forces on a planet with neutral units fight a ground combat — ${WHY}`);
  test.todo(`neutral units 4: any player but the active one rolls for them, with the reference card's values — not modelled: combat is not rolled`);
  test.todo(`neutral units 5: they always use every unit ability they can — not modelled: combat abilities are not counted`);
  test.todo(`neutral units 6: they take no turns, own nothing and never retreat — ${WHY}`);
  test.todo(`neutral units 7: hits go to the lowest unit on the reference card — not modelled: combat is not rolled`);
  test.todo(`neutral units 7.1: hits only go to eligible types, such as barrage hits to fighters — not modelled: combat is not rolled`);
  test.todo(`neutral units 8: they count as another player's ships for effects, though there is no neutral player (so they stop a move like enemy ships) — ${WHY}`);
});
