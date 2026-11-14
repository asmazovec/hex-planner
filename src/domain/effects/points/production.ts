/**
 * The points of the count that production asks (declaration merging: `Modifiers` is mapped over `ModifierContext`, so
 * a point added here is a point of `applied` everywhere, and no shared interface is edited).
 *
 * Production sources: `productionValue` (a structure: the space dock's resources plus its number; a PDS asks it with a
 * base of 0, so a Hel-Titan is `ctx.structure === 'pds' ? 1 : v`) is joined by `unitProduction` (a ground force that
 * produces: the Arborec infantry), `planetProduction` (a planet of mine that produces as a whole) and
 * `spaceProduction` (a system's space area that produces). Each of those three has base 0 and the printed value of
 * the unit where the replay knows it; a source with a value above 0 is a producer, and the values of a system's
 * producers are pooled (68.1.1).
 */
import type { MapSource } from '../../replay/board';
import type { DataPack, Holdings, StructureCounts, UnitCounts, UnitId } from '../../types';

declare module '../types' {
  interface ModifierContext {
    /** PRODUCTION of one ground force standing on a planet I control (Letani Warrior: 1, level II adds 1); the replay multiplies by the units there. Base: the printed value, 0 when the unit has none. */
    unitProduction: { faction: string; unit: UnitId; planetId: string };
    /** A planet I control that produces by itself (Custodia Vigilia on Mecatol Rex, a planet with a structure under Aerie Hololattice): its PRODUCTION. Base 0. */
    planetProduction: { planetId: string; systemId: string; /** My structures on the planet. */ structures: StructureCounts };
    /** A system's space area that produces (a supernova with my units, Magmus Reactor). Asked for a system where I have units. Base 0. */
    spaceProduction: {
      systemId: string; /** Anomalies of the system. */ anomalies: string[]; units: UnitCounts;
      /** The wormholes of the system, the tokens placed on it included (Particle Synthesis). */ wormholes: string[]; game: MapSource; pack: DataPack;
    };
    /** The pooled PRODUCTION of a system's producers, after the sum: the base is the sum (War Machine adds 4 to the total). */
    productionTotal: { systemId: string; faction: string };
    /** The combined cost of the units a production makes, asked only when a unit used PRODUCTION (Sarween Tools, War Machine). */
    productionCost: {
      faction: string;
      /** The system that produces, when the entry names it. */ systemId?: string;
      /** Its wormholes, the tokens placed on it included. */ wormholes: string[];
      /** What the owner holds (AI Development Algorithm counts the unit upgrades). */ holdings: Holdings; pack: DataPack;
    };
    /** Whether a space dock may produce infantry: base 1, 0 forbids (Arborec, 68.1 note 4). */
    dockInfantry: { faction: string; planetId: string };
    /** Fighters a space dock keeps apart from capacity, per dock: base 3 (79 note 2). */
    dockFighters: { faction?: string; planetId: string; systemId: string };
  }
}

export {};
