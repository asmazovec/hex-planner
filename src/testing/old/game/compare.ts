import type { Holdings, GameState } from '../../../domain/types';
import { sorted, stacks } from '../../../game/compare';

export const holdingsOf = (h: Holdings): Record<string, unknown> => ({
  technologies: sorted(h.technologies), hand: sorted(h.hand), relics: sorted(h.relics), promissory: sorted(h.promissory),
  leaders: h.leaders, scored: sorted(h.scored), secrets: sorted(h.secrets), found: sorted(h.found), exhausted: [...new Set(sorted(h.exhausted))],
  breakthrough: h.breakthrough ?? null, inPlay: sorted(h.inPlay),
});
/** A state as plain data to compare. The old model lets a pool go below zero; the kernel stops at zero, so a pool counts from zero. */
export function normalState(state: GameState, viewer = true, claimed: string[] = []): Record<string, unknown> {
  const own = Object.keys(state.control).filter(id => state.control[id] === 'me');
  const rivals = state.rivals;
  return {
    faction: state.faction,
    systems: stacks(state.systems), ground: stacks(state.ground),
    exhausted: sorted(state.exhausted.filter(id => own.includes(id) && !claimed.includes(id))),
    // Only the planets a player holds: the old model marks another player's planet `enemy` only where it was written by hand.
    control: Object.fromEntries(Object.entries(state.control).filter(([id, who]) => who === 'me' && !claimed.includes(id))), tokensOnMap: sorted(state.tokensOnMap),
    tradeGoods: state.tradeGoods, commodities: state.commodities,
    tactic: Math.max(0, state.tactic), fleet: Math.max(0, state.fleet), strategy: Math.max(0, state.strategy), vp: state.vp,
    holdings: holdingsOf(state.holdings),
    docks: sorted(state.docks.filter(id => !claimed.includes(id))), pds: Object.fromEntries(Object.entries(state.pds).filter(([, n]) => n > 0)),
    afloat: Object.fromEntries(Object.entries(state.afloat ?? {}).filter(([, s]) => Object.values(s).some(n => (n ?? 0) > 0))),
    custodiansRemoved: state.custodiansRemoved === true,
    // What lies on a component's card: units placed on it, a technology lent with it.
    onCard: Object.fromEntries(Object.entries(state.onCard ?? {}).flatMap(([id, on]) => {
      const kept = { ...(on.units && Object.keys(stacks({ u: on.units })).length > 0 ? { units: on.units } : {}), ...(on.technology ? { technology: on.technology } : {}) };
      return Object.keys(kept).length > 0 ? [[id, kept]] : [];
    })),
    ...(viewer ? {
      // Someone who is not at the table has no faction; a planet two states claim (a test board of two players of one faction) is the viewer's.
      rivals: Object.fromEntries(Object.entries(rivals ?? {}).filter(([, s]) => s.faction !== '').map(([id, s]) => [id, normalState(s, false, own)])),
      opponentVp: Object.fromEntries(Object.entries(state.opponentVp).filter(([id]) => rivals?.[id]?.faction !== '')),
      laws: sorted(state.laws), revealed: sorted(state.revealed), lawOwners: state.lawOwners ?? {},
      attachments: Object.fromEntries(Object.entries(state.attachments ?? {}).map(([id, cards]) => [id, sorted(cards)])),
      wormholeTokens: (state as GameState & { wormholeTokens?: Record<string, string> }).wormholeTokens ?? {},
    } : {}),
  };
}
