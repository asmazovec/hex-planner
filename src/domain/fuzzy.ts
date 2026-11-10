/** Something to search for: a component with its name and printed text. */
export interface SearchItem {
  id: string;
  name: string;
  text: string;
}

/** An item as the search reads it: normalised and split into words once. */
interface Entry {
  id: string;
  /** The words of the name joined by spaces. */
  name: string;
  nameWords: string[];
  /** The words of the text, each with a space before it, so that " word" finds the start of a word. */
  text: string;
}

/** Built once per pack by `buildIndex`; entries stand in the order of their names. */
export interface SearchIndex {
  readonly entries: readonly Entry[];
}

const NAME_PREFIX = 100;
const NAME_INSIDE = 70;
const NAME_TYPO = 50;
/** A typo in a word that is still being typed: it is compared with the start of a word of the name. */
const NAME_PREFIX_TYPO = 40;
const TEXT_PREFIX = 20;
const TEXT_INSIDE = 10;
/** One typo is forgiven for every this many letters of a query word. */
const LETTERS_PER_TYPO = 4;

/** The same keys on the Russian and on the English layout. */
const RU_KEYS = 'йцукенгшщзхъфывапролджэячсмитьбюё';
const EN_KEYS = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const OTHER_LAYOUT = new Map<string, string>();
for (let i = 0; i < RU_KEYS.length; i++) {
  OTHER_LAYOUT.set(RU_KEYS[i], EN_KEYS[i]);
  OTHER_LAYOUT.set(EN_KEYS[i], RU_KEYS[i]);
}

/** Lowercase words without punctuation; an apostrophe joins, anything else separates. */
function wordsOf(raw: string): string[] {
  const clean = raw.toLowerCase().replace(/['’]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return clean ? clean.split(' ') : [];
}

/** What the same keys type on the other layout. */
function onOtherLayout(raw: string): string {
  let out = '';
  for (const char of raw.toLowerCase()) out += OTHER_LAYOUT.get(char) ?? char;
  return out;
}

export function buildIndex(items: SearchItem[]): SearchIndex {
  const entries = items.map((item): Entry => {
    const nameWords = wordsOf(item.name);
    return { id: item.id, name: nameWords.join(' '), nameWords, text: wordsOf(item.text).map(word => ` ${word}`).join('') };
  });
  // Equal scores keep this order: the sort of the hits is stable.
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { entries };
}

/** Rows of the distance table, kept between calls: the search runs on every keystroke. */
let rows: [number[], number[], number[]] = [[], [], []];

/**
 * How a word being typed matches a word of a name with at most `max` edits, two neighbouring letters swapped
 * counting as one: NAME_TYPO for the whole word, NAME_PREFIX_TYPO for its start (of the same length, or one letter
 * off), 0 for neither. One table answers both: its last row holds the distance to every start of the word. Stops
 * as soon as two rows in a row cannot get there (a swap reads the row before the previous one).
 */
function typoScore(word: string, full: string, max: number): number {
  const n = word.length;
  const width = Math.min(full.length, n + Math.max(max, 1));
  if (width < n - 1 && width < n - max) return 0;
  let [before, previous, row] = rows;
  for (let j = 0; j <= width; j++) previous[j] = j;
  let previousBest = 0;
  for (let i = 1; i <= n; i++) {
    const a = word.charCodeAt(i - 1);
    row[0] = i;
    let best = i;
    for (let j = 1; j <= width; j++) {
      const b = full.charCodeAt(j - 1);
      let value = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a === b ? 0 : 1));
      if (i > 1 && j > 1 && a === full.charCodeAt(j - 2) && word.charCodeAt(i - 2) === b) {
        value = Math.min(value, before[j - 2] + 1);
      }
      row[j] = value;
      if (value < best) best = value;
    }
    if (best > max && previousBest > max) return 0;
    previousBest = best;
    [before, previous, row] = [previous, row, before];
  }
  rows = [before, previous, row];
  if (full.length <= n + max && previous[full.length] <= max) return NAME_TYPO;
  for (let j = Math.max(1, n - 1); j <= Math.min(width, n + 1); j++) {
    if (previous[j] <= max) return NAME_PREFIX_TYPO;
  }
  return 0;
}

/**
 * The best way one query word matches an entry; 0 when it does not. One letter matches starts of words only.
 * `typoCache` remembers the typo score of every word of a name met during this search: names repeat their words.
 */
function wordScore(entry: Entry, word: string, typoCache: Map<string, number>): number {
  if (entry.nameWords.some(w => w.startsWith(word))) return NAME_PREFIX;
  if (word.length > 1 && entry.name.includes(word)) return NAME_INSIDE;
  const typos = Math.floor(word.length / LETTERS_PER_TYPO);
  if (typos > 0) {
    let best = 0;
    for (const w of entry.nameWords) {
      let score = typoCache.get(w);
      if (score === undefined) typoCache.set(w, (score = typoScore(word, w, typos)));
      if (score > best) best = score;
    }
    if (best) return best;
  }
  if (entry.text.includes(` ${word}`)) return TEXT_PREFIX;
  if (word.length > 1 && entry.text.includes(word)) return TEXT_INSIDE;
  return 0;
}

function hitsOf(index: SearchIndex, words: string[]): { id: string; score: number }[] {
  const hits: { id: string; score: number }[] = [];
  if (!words.length) return hits;
  const typoCaches = words.map(() => new Map<string, number>());
  for (const entry of index.entries) {
    let score = 0;
    for (let i = 0; i < words.length; i++) {
      const s = wordScore(entry, words[i], typoCaches[i]);
      if (!s) {
        score = 0;
        break;
      }
      score += s;
    }
    if (score) hits.push({ id: entry.id, score });
  }
  return hits.sort((a, b) => b.score - a.score);
}

/**
 * The items every word of the query matches, best first, equal ones by name. A word matches the start of a word
 * of the name, a part of the name, a word of the name or its start with a typo, the start of a word of the text or a part of it,
 * in this order of weight; the score is the sum over the words. A query that finds nothing is read once more as
 * typed on the other keyboard layout.
 */
export function search(index: SearchIndex, query: string, limit?: number): { id: string; score: number }[] {
  let hits = hitsOf(index, wordsOf(query));
  if (!hits.length) {
    const other = onOtherLayout(query);
    if (other !== query.toLowerCase()) hits = hitsOf(index, wordsOf(other));
  }
  return limit === undefined ? hits : hits.slice(0, Math.max(0, limit));
}
