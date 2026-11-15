/**
 * What the big hex writes by hand into the saved game: the units and ground forces of a player, the docks and PDS of the setup,
 * the control of a planet, a manual adjustment, the units of a setup entry. The hex reads the board through the kernel.
 * Players go by their id at the table.
 */
import { placedChangeOf, startingPdsOf, structureAtStart } from '../game/edit/start';
import { withDelta } from '../game/edit/turn';
import { useGame } from './gameStore';
import { writeSaved } from './turnBridge';
import { withAdjustedUnit } from '../domain/tactical';
import type { AdjustmentDelta, DataPack, StructureKind, UnitId } from '../domain/types';
import type { PlayerId } from '../game/types';

export interface SetupWrites {
  /** One more or less of a unit of a player written by hand on the hex; ground forces go by planet. */
  changePlaced: (slot: string, player: PlayerId, unit: UnitId, planetId: string | null, amount: number) => void;
  /** One more or less of a structure by hand: a dock is set, a PDS counted over the starting ones. */
  changeStructure: (pack: DataPack, kind: StructureKind, planetId: string, amount: 1 | -1) => void;
  /** Whether the game itself holds this structure, apart from what entries plan. */
  inBaseline: (pack: DataPack, kind: StructureKind, planetId: string) => boolean;
  /** Who controls a planet at the start; null leaves it free. */
  setPlanetControl: (planetId: string, player: PlayerId | null) => void;
  /** A manual correction of the round's units of `player` in a system. */
  changeAdjustment: (roundNo: number, change: { kind: 'setup' | 'losses' | 'build'; systemId: string; unit: UnitId; planetId: string | null; amount: number }, player: PlayerId) => void;
  /** The units of a setup entry of the plan, changed by one. */
  adjustSetup: (entryId: string, delta: AdjustmentDelta, slot: string, unit: UnitId, planetId: string | null, amount: number) => void;
}

/** The writers of the setup mode of the big hex; none while no game is open. */
export function useSetupWrites(): SetupWrites | undefined {
  const saved = useGame(s => s.saved);
  const setUnits = useGame(s => s.setUnits);
  const setGround = useGame(s => s.setGround);
  const setDock = useGame(s => s.setDock);
  const setPds = useGame(s => s.setPds);
  const setPlanetControl = useGame(s => s.setPlanetControl);
  const changeAdjustment = useGame(s => s.changeAdjustment);
  if (!saved) return undefined;
  return {
    changePlaced: (slot, player, unit, planetId, amount) => {
      const next = placedChangeOf(saved, slot, player, unit, planetId, amount);
      if ('planetId' in next) setGround(next.planetId, player, next.units);
      else setUnits(next.slot, player, next.units);
    },
    changeStructure: (_pack, kind, planetId, amount) => {
      if (kind === 'spacedock') setDock(planetId, amount > 0);
      else setPds(planetId, (startingPdsOf(saved)[planetId] ?? 0) + amount);
    },
    inBaseline: (_pack, kind, planetId) => structureAtStart(saved, kind, planetId),
    setPlanetControl,
    changeAdjustment,
    adjustSetup: (entryId, delta, slot, unit, planetId, amount) => {
      const now = useGame.getState().saved;
      const write = now ? writeSaved(now, entryId) : undefined;
      if (write) write.update(withDelta(write.turn, withAdjustedUnit(delta, slot, unit, planetId, amount)));
    },
  };
}
