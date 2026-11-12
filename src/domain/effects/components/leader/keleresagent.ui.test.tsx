import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { bench, HOME, quote, secondary, tactical } from '../kit';
import { id } from './keleresagent';

uiBench();

const build = () => tactical(HOME, { production: { cruiser: 1 }, payment: { planets: [], tradeGoods: 2 } });
const table = (entry: ReturnType<typeof build>) => bench({
  faction: 'keleresm', expansions: ['pok'], start: { leaders: { [id]: 'unlocked' } }, entries: [secondary(5), entry],
  game: { docks: ['h1'], planetControl: { h1: 'me', h2: 'me' } },
});

// "You may exhaust this card to allow any player to spend commodities as if they were trade goods."
// Checks: a build paid with two trade goods where the Keleres hold at most one; the player names the agent in «Used»
// and the warning of trade goods missing turns to the allowed look, naming the agent.
// Why the check is redundant here: the commodities pay as trade goods (21.7 "unless otherwise specified").
test('leader:keleresagent named in Used, the trade goods missing read as allowed by Xander Alexin Victori III', async () => {
  const entry = build();
  const keleres = table(entry);
  quote(keleres.pack, id, 'spend commodities as if they were trade goods');
  const live = showUses(keleres, entry);
  expectShownStanding('shortTradeGoods');
  await use('Xander Alexin Victori III');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('shortTradeGoods', 'Xander Alexin Victori III');
});

// LRR 21.7: "A player cannot spend commodities unless otherwise specified."
// Checks: without the agent the warning stands.
// Why the check is NOT redundant here: nothing allows the commodities to be spent.
test('leader:keleresagent not named, the warning of trade goods missing stands', () => {
  const entry = build();
  showUses(table(entry), entry);
  expectShownStanding('shortTradeGoods');
});
