/** Something to search for: a component with its name, what it is, and its printed text. */
export interface SearchItem {
  id: string;
  name: string;
  /** What kind of thing it is, in words. Weighs less than the name. */
  kind?: string;
  /** What else is known of it, in words: its faction, its attributes. Weighs a little less than the kind and more than the text. */
  tags?: string;
  text: string;
}

/** The fields of an item, by weight. */
const NAME = 0;
const KIND = 1;
const TAGS = 2;
const TEXT = 3;
/** The fields that say what an item is; the text only mentions things. */
const WHAT = [NAME, KIND, TAGS];

/** An item as the search reads it: normalised and split into words once. */
interface Entry {
  id: string;
  /** The words of the name joined by spaces: the order of equal hits. */
  name: string;
  /** The distinct words of the name, of the kind, of the tags and of the text, as numbers of words of the index. */
  fields: [number[], number[], number[], number[]];
}

/** Built once per pack by `buildIndex`; entries stand in the order of their names. */
export interface SearchIndex {
  readonly entries: readonly Entry[];
  /** Every distinct word of every item: a query word is compared with each of them once, whatever the number of items. */
  readonly words: readonly string[];
}

/** How a query word matches a word of an item, weakest first; 0 is no match. */
const PREFIX_TYPO = 1;
const TYPO = 2;
const INSIDE = 3;
/** The word in another form: the same stem with another ending («агенты» for «агент», "relics" for "relic"). */
const STEM = 4;
const PREFIX = 5;
const EXACT = 6;

/**
 * What a match is worth, by field and by the way it matched. A whole word, its start or another form of it: the name
 * above the kind and the tags. Then a part of a word or a typo, in the same order of fields: "red" as a colour is above
 * "red" inside «Predictive». The kind is just above the tags: «agenda» is an agenda before it is an action card of the
 * agenda phase. Any match of the text is below all of them.
 */
const SCORES: readonly (readonly number[])[] = [
  [0, 40, 46, 50, 96, 100, 104],
  [0, 31, 33, 37, 55, 57, 62],
  [0, 30, 32, 36, 54, 56, 60],
  [0, 4, 6, 10, 18, 20, 21],
];
/**
 * A Russian word read by its sound and found with a typo is a guess («агенты» is not «Agency»): below a typo of the
 * tags as typed, above the text. By field.
 */
const SOUND_TYPO = [28, 27, 26];
/**
 * The weakest word of a query decides first, the sum after it: an item that is all the words ask for («relic» of
 * «Prophecy of Kings») stands above one that has a word in its name and only mentions another in its text.
 */
const WEAKEST = 1000;
/** Added when the query spells the whole name: «War Sun» stands above «Prototype War Sun II». */
const WHOLE_NAME = 10;
/** One typo is forgiven for every this many letters of a query word. */
const LETTERS_PER_TYPO = 4;
/** A shorter query word is not compared with the words of a text with a typo: short words are too alike. */
const TEXT_TYPO_LETTERS = 5;
/** Taken off a match found by the sound of Russian letters without a typo. */
const BY_SOUND = 2;

/** The same keys on the Russian and on the English layout. */
const RU_KEYS = 'йцукенгшщзхъфывапролджэячсмитьбюё';
const EN_KEYS = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const OTHER_LAYOUT = new Map<string, string>();
for (let i = 0; i < RU_KEYS.length; i++) {
  OTHER_LAYOUT.set(RU_KEYS[i], EN_KEYS[i]);
  OTHER_LAYOUT.set(EN_KEYS[i], RU_KEYS[i]);
}

/** How Russian letters sound in the letters of an English game name: «саботаж» is Sabotage, «жол нар» is Jol-Nar. */
const SOUNDS: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** Lowercase words without punctuation, «ё» as «е»; an apostrophe joins, anything else separates. */
function wordsOf(raw: string): string[] {
  const clean = raw.toLowerCase().replace(/ё/g, 'е').replace(/['’]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return clean ? clean.split(' ') : [];
}

/** The endings of Russian words, and the English plural: what is left is the stem. */
const ENDING = /(?:ами|ями|ого|его|ому|ему|ов|ев|ам|ям|ах|ях|ом|ем|ым|им|ых|их|[аеиоуыэюяйь]{1,2}|es|s)$/;
/** The shortest stem, and the longest ending another form may add to it. */
const STEM_LETTERS = 3;
const ENDING_LETTERS = 3;

/** A word without its ending; nothing for a word that has none or is too short to lose it. */
function stemOf(word: string): string | undefined {
  const stem = word.replace(ENDING, '');
  return stem !== word && stem.length >= STEM_LETTERS ? stem : undefined;
}

/** What the same keys type on the other layout. */
function onOtherLayout(raw: string): string {
  let out = '';
  for (const char of raw.toLowerCase()) out += OTHER_LAYOUT.get(char) ?? char;
  return out;
}

/** A Russian word in English letters by its sound; nothing for a word with no Russian letter. */
function bySound(word: string): string | undefined {
  let out = '';
  let russian = false;
  for (const char of word) {
    const sound = SOUNDS[char];
    if (sound !== undefined) russian = true;
    out += sound ?? char;
  }
  return russian && out ? out : undefined;
}

export function buildIndex(items: SearchItem[]): SearchIndex {
  const numbers = new Map<string, number>();
  const words: string[] = [];
  const numbersOf = (raw: string): number[] => {
    const own = new Set<number>();
    for (const word of wordsOf(raw)) {
      let number = numbers.get(word);
      if (number === undefined) {
        numbers.set(word, number = words.length);
        words.push(word);
      }
      own.add(number);
    }
    return [...own];
  };
  const entries = items.map((item): Entry => ({
    id: item.id, name: wordsOf(item.name).join(' '),
    fields: [numbersOf(item.name), numbersOf(item.kind ?? ''), numbersOf(item.tags ?? ''), numbersOf(item.text)],
  }));
  // Equal scores keep this order: the sort of the hits is stable.
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { entries, words };
}

/** Rows of the distance table, kept between calls: the search runs on every keystroke. */
let rows: [number[], number[], number[]] = [[], [], []];

/**
 * How a word being typed matches a word of an item with at most `max` edits, two neighbouring letters swapped
 * counting as one: TYPO for the whole word, PREFIX_TYPO for its start (of the same length, or one letter
 * off), 0 for neither. One table answers both: its last row holds the distance to every start of the word. Stops
 * as soon as two rows in a row cannot get there (a swap reads the row before the previous one).
 */
function typoMatch(word: string, full: string, max: number): number {
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
  if (full.length <= n + max && previous[full.length] <= max) return TYPO;
  for (let j = Math.max(1, n - 1); j <= Math.min(width, n + 1); j++) {
    if (previous[j] <= max) return PREFIX_TYPO;
  }
  return 0;
}

/** How one query word matches every word of the index. One letter matches starts of words only. */
function matchesOf(index: SearchIndex, word: string, forms: boolean): Uint8Array {
  const matches = new Uint8Array(index.words.length);
  const typos = Math.floor(word.length / LETTERS_PER_TYPO);
  const stem = forms ? stemOf(word) : undefined;
  for (let i = 0; i < matches.length; i++) {
    const full = index.words[i];
    if (full === word) matches[i] = EXACT;
    else if (full.startsWith(word)) matches[i] = PREFIX;
    else if (stem !== undefined && full.length <= stem.length + ENDING_LETTERS && full.startsWith(stem)) matches[i] = STEM;
    else if (word.length > 1 && full.includes(word)) matches[i] = INSIDE;
    else if (typos > 0) matches[i] = typoMatch(word, full, typos);
  }
  return matches;
}

/** The best match among the words of one field. */
function best(matches: Uint8Array, field: number[]): number {
  let found = 0;
  for (let i = 0; i < field.length; i++) {
    const match = matches[field[i]];
    if (match > found) {
      if (match === EXACT) return EXACT;
      found = match;
    }
  }
  return found;
}

/** A query word as the search compares it: with every word of the index as typed, and by its sound if it is Russian. */
interface Asked {
  matches: Uint8Array;
  sound?: Uint8Array;
  /** Long enough to be compared with the words of a text with a typo. */
  textTypos: boolean;
}

/** What a match by sound is worth in the name, the kind or the tags. */
const soundScore = (field: number, match: number): number => (match >= INSIDE ? SCORES[field][match] - BY_SOUND : match ? SOUND_TYPO[field] : 0);

/** The best way one query word matches an entry; 0 when it does not. */
function wordScore(entry: Entry, asked: Asked): number {
  let score = 0;
  for (const field of WHAT) {
    const words = entry.fields[field];
    score = Math.max(score, SCORES[field][best(asked.matches, words)]);
    if (asked.sound) score = Math.max(score, soundScore(field, best(asked.sound, words)));
  }
  if (score > 0) return score;
  const inText = best(asked.matches, entry.fields[TEXT]);
  return inText >= INSIDE || asked.textTypos ? SCORES[TEXT][inText] : 0;
}

function hitsOf(index: SearchIndex, words: string[]): { id: string; score: number }[] {
  const hits: { id: string; score: number }[] = [];
  if (!words.length) return hits;
  const asked = words.map((word): Asked => {
    const sound = bySound(word);
    return { matches: matchesOf(index, word, true), ...(sound ? { sound: matchesOf(index, sound, false) } : {}), textTypos: word.length >= TEXT_TYPO_LETTERS };
  });
  for (const entry of index.entries) {
    let score = 0;
    let weakest = Infinity;
    for (let i = 0; i < asked.length; i++) {
      const s = wordScore(entry, asked[i]);
      if (!s) {
        score = 0;
        break;
      }
      score += s;
      if (s < weakest) weakest = s;
    }
    if (!score) continue;
    score += weakest * WEAKEST;
    const name = entry.fields[NAME];
    let spelled = 0;
    for (const { matches } of asked) if (best(matches, name) === EXACT) spelled++;
    hits.push({ id: entry.id, score: name.length > 0 && spelled >= name.length ? score + WHOLE_NAME : score });
  }
  return hits.sort((a, b) => b.score - a.score);
}

/**
 * The items every word of the query matches, best first, equal ones by name. A word matches a word of the name, of
 * the kind, of the tags or of the text, in this order of weight: the whole word, its start, another form of it, a part of it, the
 * word or its start with a typo; a Russian word also matches a name or a tag by its sound. The word that matched worst decides first,
 * then the sum over the words, and a name spelled whole adds to it. A
 * query that finds nothing is read once more as typed on the other keyboard layout.
 */
export function search(index: SearchIndex, query: string, limit?: number): { id: string; score: number }[] {
  let hits = hitsOf(index, wordsOf(query));
  if (!hits.length) {
    const other = onOtherLayout(query);
    if (other !== query.toLowerCase()) hits = hitsOf(index, wordsOf(other));
  }
  return limit === undefined ? hits : hits.slice(0, Math.max(0, limit));
}
