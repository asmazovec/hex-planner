/**
 * What the components an entry names cover of a resource shortfall, all together: each of them reduces the cost or
 * adds to the payment, so two of them lift a shortfall that neither lifts alone (Berekar Berekon 2 and Hegemonic Trade
 * Policy 1 cover 3). Each such component's waiver asks the sum, never its own part. Not imported by the registry.
 */
import type { TurnFacts } from '../../game/turnFacts';
import type { PermitContext } from '../../game/abilities/types';

const AGENT_OF_THE_WINNU = 'leader:winnuagent';
const HEGEMONIC_TRADE_POLICY = 'technology:htp';
const KELERES_AGENT = 'leader:keleresagent';
/** Berekar Berekon: the combined cost of the produced units is 2 less. */
const WINNU_AGENT_REDUCTION = 2;

const namedBy = (entry: TurnFacts | undefined): string[] =>
  entry ? [...(entry.type === 'component' && entry.componentId !== undefined ? [entry.componentId] : []), ...(entry.spends ?? []), ...(entry.uses ?? [])] : [];

/** The resources the named components cover in the payment of the turn: the agent's 2, the swap of the best planet paid, the commodities spent as trade goods. */
export function coverOf(ctx: PermitContext): number {
  const { entry, pack, had } = ctx;
  const named = namedBy(entry);
  const payment = entry && 'payment' in entry ? entry.payment : entry && 'effects' in entry ? entry.effects?.payment : undefined;
  let cover = 0;
  if (named.includes(AGENT_OF_THE_WINNU) && ctx.ready(AGENT_OF_THE_WINNU)) cover += WINNU_AGENT_REDUCTION;
  if (named.includes(HEGEMONIC_TRADE_POLICY) && ctx.ready(HEGEMONIC_TRADE_POLICY)) {
    cover += Math.max(0, ...(payment?.planets ?? []).map(planetId => (pack.planets[planetId]?.influence ?? 0) - (pack.planets[planetId]?.resources ?? 0)));
  }
  if (named.includes(KELERES_AGENT) && ctx.ready(KELERES_AGENT)) {
    cover += Math.min(Math.max(0, (payment?.tradeGoods ?? 0) - had.tradeGoods), had.commodities);
  }
  return cover;
}
