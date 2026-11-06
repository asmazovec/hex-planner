import summaries from './sheetSummaries.json';

type Lang = 'ru' | 'en';
interface Summary { ru: string; en: string; unlockRu?: string; unlockEn?: string }

// Own short retellings for the player's memory, not card text. The card itself decides in play.
const SUMMARIES = summaries as Record<string, Summary>;

/** The old Jol-Nar commander is not in the source: only its name differs from the card that replaces it, as far as known. */
const SAME_TEXT: Record<string, string> = { 'jolnarcommander-pok': 'jolnarcommander' };

/** The retelling of an ability, leader, mech or breakthrough, by source id. */
export function sheetSummary(id: string, lang: Lang): { text: string; unlock?: string } | null {
  const found = SUMMARIES[SAME_TEXT[id] ?? id];
  if (!found) return null;
  const unlock = lang === 'ru' ? found.unlockRu : found.unlockEn;
  return { text: found[lang], ...(unlock ? { unlock } : {}) };
}

export const sheetSummaryIds = (): string[] => Object.keys(SUMMARIES);
