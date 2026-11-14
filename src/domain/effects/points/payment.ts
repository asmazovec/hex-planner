/**
 * The points and hooks of payment, trade goods, commodities and transactions, added to the contract by declaration
 * merging so that no shared interface is edited. A component asks and answers them like any other point.
 */
import type { DataPack, Entry } from '../../types';
import { stacked, type Applied } from '../apply';
import { effectOf, orderOf, passivesOf, type Holder } from '../registry';
import type { Ability } from '../types';

declare module '../types' {
  interface ModifierContext {
    /** What one trade good spent on a payment is worth in `kind`; the base is 1. */
    tradeGoodValue: { kind: 'resources' | 'influence'; faction: string };
    /** The commodity value of a faction: what the commodities are replenished to; the base is the printed value. */
    commodityValue: { faction: string };
  }

  interface Ability {
    /**
     * Any tier. What the component costs to play as a component action, paid with the `payment` of the entry
     * (resources or influence, from planets and trade goods): the replay pays it and warns when it is short.
     */
    cost?: { kind: 'resources' | 'influence'; amount: number };
    /**
     * Any tier. What the component costs when a component entry names it in `uses` beside its own action (a mech that
     * deploys after an ability): paid with the same `payment` as the action's own `cost`, which it is added to. None
     * for an entry it does not follow.
     */
    useCost?: (entry: Entry) => { kind: 'resources' | 'influence'; amount: number } | undefined;
  }
}

/**
 * A planet's resources or influence after the components of its controller and those attached to it. Attached cards
 * (the attachments kept on my state) are held by no player, so they are asked here, for this planet only,
 * and every modifier is given the planet's `attached` list; a law in force for the whole game must look there to
 * know it was elected for this planet.
 */
export function appliedToPlanet(
  pack: DataPack, who: Holder, attached: readonly string[], point: 'planetResources' | 'planetInfluence', base: number, planetId: string, dock = false,
): Applied {
  const own = passivesOf(pack, who);
  const have = new Set(own.map(([id]) => id));
  const extra = attached.filter(id => !have.has(id)).flatMap((id): [string, Ability][] => {
    const effect = effectOf(pack, id);
    return effect ? [[id, effect]] : [];
  });
  const all = [...own, ...extra].sort((a, b) => orderOf(pack, a[0]) - orderOf(pack, b[0]));
  return stacked(all, point, base, { planetId, attached, pack, dock });
}
