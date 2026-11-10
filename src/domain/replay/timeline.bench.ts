import { bench, describe } from 'vitest';
import { timeline } from './timeline';
import { editRound, fixturePack as pack, longGame } from './timelineFixture';

const game = longGame(6, 3);
const plan = game.plans[0];
const whole = timeline(game, plan, 'forecast', pack);
const edited = editRound(game, 6, r => ({ ...r, entries: r.entries.map(e => (e.id === 'r6-fix' ? { ...e, label: 'other' } : e)) }));

describe(`a plan of ${plan.rounds.flatMap(r => r.entries).length} entries, six players`, () => {
  bench('the whole plan', () => { timeline(game, plan, 'forecast', pack); });
  bench('after an edit of the last round', () => { timeline(edited, edited.plans[0], 'forecast', pack, whole); });
  bench('ten questions about entries, a replay each (as before)', () => { for (let i = 0; i < 10; i++) timeline(game, plan, 'forecast', pack); });
  bench('ten questions about entries of one timeline', () => { for (let i = 0; i < 10; i++) whole.byEntry.get('r6-fix'); });
});
