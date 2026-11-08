/** Thunder's Edge: Synergy. Source: tirules2 rules-reference/synergy.md (Notes; no LRR section). */
import { describe, test } from 'vitest';

const WHY = 'not modelled: technology prerequisites and objectives are not checked, research is only counted';

describe("Thunder's Edge: Synergy", () => {
  test.todo(`synergy 1: a synergy lets components of one technology colour count as the other — ${WHY}`);
  test.todo(`synergy 2: in research, owned technologies and specialties of my planets of one synergy colour may count as either — ${WHY}`);
  test.todo(`synergy 3: in scoring, owned technologies of one synergy colour may count as either — ${WHY}`);
  test.todo(`synergy 4: the choice is made for each technology and specialty on its own — ${WHY}`);
  test.todo(`synergy 4.1: two propulsion technologies with a propulsion/biotic synergy meet Fighter II — ${WHY}`);
  test.todo(`synergy 5: each one counts as only one colour at a time — ${WHY}`);
  test.todo(`synergy 5.1: a single propulsion technology does not meet Fighter II with that synergy — ${WHY}`);
  test.todo(`synergy 6: the colour chosen may change from one moment to the next — ${WHY}`);
  test.todo(`synergy 6.1: two researches of the Technology primary may count the same technology as different colours — ${WHY}`);
});
