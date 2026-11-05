import type { DataPack, MapLayout, MapTemplate } from './types';

/** Slot key of a map position: `"<q>,<r>"`. */
export const slotKeyOf = (q: number, r: number): string => `${q},${r}`;

/** The template of a player count and layout; undefined when the data pack has none (for example no Prophecy of Kings). */
export const templateFor = (playerCount: number, layout: MapLayout, pack: DataPack): MapTemplate | undefined =>
  pack.templates.find(template => template.playerCount === playerCount && template.layout === layout);

/** The layout a new game starts with: the rules' own, which for five players with the tiles has hyperlanes. */
export const defaultLayout = (playerCount: number, pack: DataPack): MapLayout =>
  playerCount === 5 && templateFor(5, 'hyperlanes', pack) ? 'hyperlanes' : 'standard';

/** The template in use: the layout asked for, or the first template of the player count when the pack lacks it. */
export const templateOf = (playerCount: number, pack: DataPack, layout?: MapLayout): MapTemplate | undefined =>
  (layout ? templateFor(playerCount, layout, pack) : undefined) ?? pack.templates.find(template => template.playerCount === playerCount);
