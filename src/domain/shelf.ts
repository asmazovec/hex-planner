/** The cards a player holds, as the counting layer reads them: shared by the kernel and the component files. */
/** What a player holds of the game's components, by component id (`<kind>:<source id>`). */
export interface Shelf {
  /** Researched technologies, unit upgrades among them. */
  technologies: string[];
  /** Action cards in hand, with repeats. */
  hand: string[];
  relics: string[];
  /** Promissory notes in hand and those played face up. */
  promissory: string[];
  /** Leaders by id; one not listed is locked. */
  leaders: Record<string, LeaderState>;
  breakthrough?: 'held' | 'exhausted';
  /** Scored objectives, public and secret. */
  scored: string[];
  /** Secret objectives in hand. */
  secrets: string[];
  /**
   * Exploration cards found and kept in the play area, with repeats: the relic fragments (35.9) and the cards that
   * say so (Enigmatic Device). An exploration card that attaches, is a token or is resolved at once is held by no one.
   */
  found: string[];
  /** Exhausted components the status phase readies: technologies, relics, legendary planet cards. */
  exhausted: string[];
}
export type LeaderState = 'unlocked' | 'exhausted' | 'purged';
