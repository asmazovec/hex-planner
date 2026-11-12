import { test } from 'vitest';
import { expectShownWaived, showWarnings, uiBench } from '../../../../ui/testing/effects';
import { bench, componentAction, quote } from '../kit';
import { id } from './xxchaagent';

uiBench();

// "ACTION: Exhaust this card to ready any planet"
// Checks: the agent's action readies Target One, another player's planet; the warning that an effect readies only
// one's own planets reads as allowed by Ggrocuto Rinn.
// Why the check is redundant here: 71 note 3 limits readying to one's planets; the agent readies any planet.
test('leader:xxchaagent readying another player\'s planet reads as allowed by Ggrocuto Rinn', () => {
  const action = componentAction(id, { choices: { planet: 't1' } });
  const xxcha = bench({ faction: 'xxcha', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [action], game: { planetControl: { t1: 'enemy' } } });
  quote(xxcha.pack, id, 'ready any planet');
  showWarnings(xxcha, action);
  expectShownWaived('readyNotControlled', 'Ggrocuto Rinn');
});

test.todo('leader:xxchaagent the component action asks for the planet to ready: the component editor is not in the bench yet');
