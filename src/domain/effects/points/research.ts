/**
 * The points of the count that research asks, added to `ModifierContext` by declaration merging, so that no shared
 * interface is edited. `Modifiers` is a mapped type over it: a component's `modify` may name them at once.
 *
 * The files of components import nothing from here: the merge works once this file is part of the program.
 */
import type {} from '../types';

declare module '../types' {
  interface ModifierContext {
    /**
     * Whether a research is resolved as the primary of Technology: the base is 0, a value above 0 gives the secondary
     * the primary's limit (two technologies) and cost (the first free, the second six resources). Brilliant.
     */
    researchAsPrimary: { faction: string };
    /**
     * The command tokens a research gives instead of the technology: the base is 0. A value above 0 means the technology
     * is NOT gained, and the card gives that many tokens to distribute for it. Propagation (3).
     */
    researchTokens: { technology: string };
  }
}
