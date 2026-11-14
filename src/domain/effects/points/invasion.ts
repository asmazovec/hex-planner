/**
 * The points and hooks of the invasion subsystem, added by declaration merging so that no shared interface is edited
 * (docs/phase4/infra/invasion.md). A file that uses them needs no import of this one: the augmentation is global.
 */

declare module '../types' {
  interface ModifierContext {
    /** The trade goods a player gains with each planet they gain control of; the base is 0 (Scavenge). */
    tradeGoodsOnControl: { planetId: string };
  }
}
