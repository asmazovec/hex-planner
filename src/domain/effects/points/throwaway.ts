/**
 * Test support: effects that exist only in a test, put in front of the registry with `vi.mock` so the infrastructure
 * is tested without writing (or touching) a component's file. Held ids (technologies, relics, notes) and ids the test
 * names in `inForce` are answered from `throwaway`.
 */
import { noteBase } from '../../components';
import type { Ability } from '../types';

export const throwaway: Record<string, Ability> = {};
export const alwaysInForce: string[] = [];

type Registry = typeof import('../registry');

export function mockRegistry(real: Registry): Registry {
  const extra = (who: { technologies?: string[]; relics?: string[]; promissory?: string[] }, asked: (e: Ability) => boolean): string[] => {
    const held = [...(who.technologies ?? []), ...(who.relics ?? []), ...(who.promissory ?? []), ...alwaysInForce];
    return [...new Set(held)].filter(id => throwaway[noteBase(id)] && asked(throwaway[noteBase(id)]));
  };
  const holdingsOf = (who: object): { technologies?: string[] } =>
    ('holdings' in who ? (who as { holdings: object }).holdings : who) as { technologies?: string[] };
  return {
    ...real,
    effectOf: (pack, id) => throwaway[noteBase(id)] ?? real.effectOf(pack, id),
    inForceOf: (pack, holder, only) => [...real.inForceOf(pack, holder, only), ...extra(holdingsOf(holder), e => !only || only(e))],
    passivesOf: (pack, who) => [
      ...real.passivesOf(pack, who),
      ...extra(holdingsOf(who), e => e.tier === 'passive').map(id => [id, throwaway[noteBase(id)]] as [string, Ability]),
    ],
  };
}
