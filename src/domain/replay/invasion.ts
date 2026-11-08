/** Step 89.4 Invasion: ground forces land on the planets of the active system and take control; an opponent's landings too. */
import { violation } from '../rules/registry';
import type { GameState, UnitCounts, Warning } from '../types';
import { add, removeUnits, unitIds, type TacticalEntry } from './state';

/** Check, over the state before the landing: no more of a unit lands than stands in the active system. */
export function checkLandings(state: GameState, target: string, entry: TacticalEntry): Warning[] {
  const wanted: UnitCounts = {};
  for (const landing of entry.landings) {
    for (const id of unitIds(landing.units)) wanted[id] = (wanted[id] ?? 0) + (landing.units[id] ?? 0);
  }
  return unitIds(wanted).flatMap(id => {
    const available = state.systems[target]?.[id] ?? 0;
    const total = wanted[id] ?? 0;
    return total > available ? [violation('landingOverLimit', { unit: id, wanted: total, available })] : [];
  });
}

/** Ground units land in the target after the moves. */
// TODO(P2-021) #ws:invasion #type:bug #rule:76.1 #rule:49.2 #rule:89.4 #test:076-ships #test:049-invasion #test:089-tactical-action #size:s #landing — Высаживает любой тип юнита, в том числе корабли, и на любую планету: только наземные войска и только планеты активной системы
export function landUnits(state: GameState, target: string, entry: TacticalEntry, warnings: Warning[]): void {
  warnings.push(...checkLandings(state, target, entry));
  for (const landing of entry.landings) {
    // The shortfall is already reported as landingOverLimit, so the generic warning is not given here.
    const landed = removeUnits(state.systems, target, landing.units);
    if (unitIds(landed).length === 0) continue;
    add(state.ground, landing.planetId, landed);
    // A planet newly taken enters exhausted, so it cannot pay within this entry.
    if (state.control[landing.planetId] !== 'me' && !state.exhausted.includes(landing.planetId)) {
      state.exhausted.push(landing.planetId);
    }
    // TODO(P2-020) #ws:invasion #type:bug #rule:49.5 #rule:42.4.4 #test:049-invasion #test:042-ground-combat #size:s #control — Контроль ставится до снятия groundLosses: если все высадившиеся погибли, контроль всё равно мой. Устанавливать контроль после потерь на планете
    state.control[landing.planetId] = 'me';
  }
}

/** Effect on my state of an opponent's tactical action: the planets they land on are theirs. */
export function rivalLandings(state: GameState, entry: TacticalEntry, owner: string): void {
  // TODO(P2-022) #ws:invasion #type:bug #rule:49.5 #rule:25.5 #test:049-invasion #test:025-control #size:m #rivals #control — Высадка соперника переворачивает контроль по одному списку landings: без проверки, что кто-то высадился и выжил; планета, взятая мной у соперника, остаётся его в state.rivals
  for (const { planetId } of entry.landings) {
    state.control[planetId] = 'enemy';
    if (state.rivalHolds) state.rivalHolds[planetId] = owner;
  }
}
