/**
 * What the components an entry names cover of a resource shortfall, all together: each of them reduces the cost or
 * adds to the payment, so two of them lift a shortfall that neither lifts alone (Berekar Berekon 2 and Hegemonic Trade
 * Policy 1 cover 3). Each such component's waiver asks the sum, never its own part. Not imported by the registry.
 */
import { readyToPlay } from '../replay/holdings';
import type { Entry } from '../types';
import type { WaiverContext } from './types';

const AGENT_OF_THE_WINNU = 'leader:winnuagent';
const HEGEMONIC_TRADE_POLICY = 'technology:htp';
const KELERES_AGENT = 'leader:keleresagent';
/** Berekar Berekon: the combined cost of the produced units is 2 less. */
const WINNU_AGENT_REDUCTION = 2;

const namedBy = (entry: Entry | undefined): string[] =>
  entry ? [...(entry.type === 'component' && entry.componentId !== undefined ? [entry.componentId] : []), ...(entry.spends ?? []), ...(entry.uses ?? [])] : [];

/** The resources the named components cover in the payment of `entry`: the agent's 2, the swap of the best planet paid, the commodities spent as trade goods. */
export function coverOf(ctx: WaiverContext): number {
  const { entry, pack, game, before } = ctx;
  const named = namedBy(entry);
  const ready = readyToPlay(pack, before.holdings, game.faction, before.control);
  const payment = entry && 'payment' in entry ? entry.payment : entry && 'effects' in entry ? entry.effects?.payment : undefined;
  let cover = 0;
  if (named.includes(AGENT_OF_THE_WINNU) && ready.has(AGENT_OF_THE_WINNU)) cover += WINNU_AGENT_REDUCTION;
  if (named.includes(HEGEMONIC_TRADE_POLICY) && ready.has(HEGEMONIC_TRADE_POLICY)) {
    cover += Math.max(0, ...(payment?.planets ?? []).map(planetId => (pack.planets[planetId]?.influence ?? 0) - (pack.planets[planetId]?.resources ?? 0)));
  }
  if (named.includes(KELERES_AGENT) && before.holdings.leaders[KELERES_AGENT] === 'unlocked') {
    cover += Math.min(Math.max(0, (payment?.tradeGoods ?? 0) - before.tradeGoods), before.commodities);
  }
  return cover;
}
