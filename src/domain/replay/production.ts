/** Step 89.5 Production (and the production of cards): where built units stand, and what they cost. */
import { violation } from '../rules/registry';
import { productionCost } from '../unitStats';
import type { DataPack, Game, GameState, UnitCounts, UnitId, Warning } from '../types';
import { planetsOf } from './board';
import { pay } from './payment';
import { add, unitIds, type TacticalEntry } from './state';

export { productionCost };

/** Where a system's production puts ground forces: one of the player's planets there, or null for its space area. */
// TODO(P2-027) #ws:production #type:bug #rule:68.3 #rule:67.4.1 #test:068-production #test:067-producing-units #size:m #placement — Пехота идёт на первую свою планету системы (в том числе только что захваченную), а не на планету с базой; productionGround принимается и на чужую планету (placesOf)
const productionPlanet = (game: Game, state: GameState, systemId: string, pack: DataPack): string | null =>
  planetsOf(game, systemId, pack).find(p => state.control[p] === 'me') ?? null;

// TODO(P2-047) #ws:thunders-edge #type:check #rule:entropic-scars-2 #test:te-entropic-scars #size:s #entropic-scar — Производство в энтропийном шраме (тактика и карты) без нарушения
export interface ProductionPlace { unit: UnitId; /** Null for the space area. */ planetId: string | null; count: number }

/** Ships go to the space area; ground forces to the planets they were bought on, the rest to one of my planets there, or to space if I have none. */
export function placesOf(
  game: Game, state: GameState, target: string, units: UnitCounts, pack: DataPack, onPlanets: Record<string, UnitCounts> = {},
): ProductionPlace[] {
  const places: ProductionPlace[] = [];
  for (const unit of unitIds(units)) {
    let left = units[unit] ?? 0;
    if (pack.units[unit]?.ground) {
      for (const [planetId, counts] of Object.entries(onPlanets)) {
        const count = Math.min(left, counts[unit] ?? 0);
        if (count > 0) places.push({ unit, planetId, count });
        left -= count;
      }
    }
    if (left > 0) places.push({ unit, planetId: pack.units[unit]?.ground ? productionPlanet(game, state, target, pack) : null, count: left });
  }
  return places;
}

/** Effect: the built units stand where `placesOf` puts them. */
// TODO(P2-028) #ws:production #type:check #rule:14.1 #rule:67.6 #rule:67-/-79 #test:014-blockaded #test:067-producing-units #test:079-space-dock #size:m #blockade #no-dock — Производство не проверяет базу (сейчас «нет дока» считается в UI), блокаду и чужие корабли в системе: нарушения noProduction и productionBlockaded в домене
export function placeProduction(
  game: Game, state: GameState, target: string, units: UnitCounts, pack: DataPack, onPlanets?: Record<string, UnitCounts>,
): void {
  for (const { unit, planetId, count } of placesOf(game, state, target, units, pack, onPlanets)) {
    add(planetId === null ? state.systems : state.ground, planetId ?? target, { [unit]: count });
  }
}

/** The tactical action's production is paid in resources: the payment is made, and a shortfall reported. */
// TODO(P2-029) #ws:production #type:model #rule:68.1 #rule:79.1 #rule:67.5 #rule:72.1 #rule:96.3 #test:068-production #test:079-space-dock #test:067-producing-units #test:072-reinforcements #test:096-units #dep:P2-050 #dep:P2-051 #size:m #needs:decision #production-limit #reinforcements — Нет лимита Production и запаса отрядов: нужны данные (P2-050, P2-051), затем нарушения productionOver и reinforcementsOut. Решить, нужно ли
export function payProduction(game: Game, state: GameState, entry: TacticalEntry, pack: DataPack, warnings: Warning[]): void {
  const cost = productionCost(entry.production, game.faction, state.upgrades, pack);
  const paid = pay(state, entry.payment, 'resources', pack, warnings);
  if (cost > paid) warnings.push(violation('shortResources', { needed: cost, paid }));
}
