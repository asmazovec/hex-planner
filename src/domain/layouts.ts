import type { DataPack, MapLayout, MapTemplate } from './types';

/** Slot key of a map position: `"<q>,<r>"`. */
export const slotKeyOf = (q: number, r: number): string => `${q},${r}`;

/** Every layout, in the order the picker shows them and the pack sorts its templates. */
export const LAYOUT_ORDER: MapLayout[] = ['standard', 'hyperlanes', 'alternate', 'large'];

/**
 * The layouts each player count can have, whether or not the expansions on give them: three and four players have
 * Milty Draft's hyperlane maps besides the rules' own, five can do without hyperlanes as in the base game, six can play
 * the Large Galaxy, seven and eight the alternate hyperlanes of the Prophecy of Kings appendix.
 */
export const LAYOUT_CHOICES: Record<number, MapLayout[]> = {
  3: ['standard', 'hyperlanes'],
  4: ['standard', 'hyperlanes'],
  5: ['standard', 'hyperlanes'],
  6: ['standard', 'large'],
  7: ['hyperlanes', 'alternate'],
  8: ['standard', 'alternate'],
};

/** The layout the rules give a player count by default: hyperlanes for five and seven players, no hyperlanes otherwise. */
const RULES_DEFAULT: Record<number, MapLayout> = { 5: 'hyperlanes', 7: 'hyperlanes' };

/** The template of a player count and layout; undefined when the data pack has none (for example no Prophecy of Kings). */
export const templateFor = (playerCount: number, layout: MapLayout, pack: DataPack): MapTemplate | undefined =>
  pack.templates.find(template => template.playerCount === playerCount && template.layout === layout);

/** The layout a new game starts with: the rules' own when the pack has it, else standard, else the first the pack has. */
export const defaultLayout = (playerCount: number, pack: DataPack): MapLayout => {
  const rules = RULES_DEFAULT[playerCount] ?? 'standard';
  if (templateFor(playerCount, rules, pack)) return rules;
  if (templateFor(playerCount, 'standard', pack)) return 'standard';
  return pack.templates.find(template => template.playerCount === playerCount)?.layout ?? rules;
};

/** The template in use: the layout asked for, or the default one of the player count when the pack lacks it. */
export const templateOf = (playerCount: number, pack: DataPack, layout?: MapLayout): MapTemplate | undefined =>
  (layout ? templateFor(playerCount, layout, pack) : undefined) ?? templateFor(playerCount, defaultLayout(playerCount, pack), pack);
