import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { searchComponents } from './componentSearch';
import { componentsOf } from './components';
import type { ComponentDef } from './types';

const ru = loadPack(['pok', 'te'], 'ru');
const en = loadPack(['pok', 'te'], 'en');
const ids = (found: ComponentDef[]) => found.map(c => c.id);
const find = (query: string, pack = ru) => searchComponents(pack, query);
const tech = (c: ComponentDef) => ru.technologies[c.id.slice('technology:'.length)];

describe('Russian', () => {
  test('capital letters of a Russian query change nothing', () => {
    expect(ids(find('ПОБЕДНОЕ ОЧКО ЛЕГЕНДАРНОЙ'))).toEqual(ids(find('победное очко легендарной')));
    expect(ids(find('Победное Очко Легендарной'))).toContain('relic:shard');
  });

  test('«е» typed for «ё» finds the same as «ё», and the other way round', () => {
    expect(find('ещё').length).toBeGreaterThan(0);
    expect(ids(find('еще'))).toEqual(ids(find('ещё')));
    expect(ids(find('зеленая'))).toEqual(ids(find('зелёная')));
    expect(ids(find('жёлтая'))).toEqual(ids(find('желтая')));
  });

  test('a Russian word of the text with a typo finds the component', () => {
    expect(ids(find('астеройдов'))).toContain('technology:amd');
    expect(ids(find('передвигатся через астеройды'))).toContain('technology:amd');
  });

  test('a Russian word in another form than the text has finds the component', () => {
    // The text says «поля астероидов» and «корабли».
    expect(ids(find('астероиды'))).toContain('technology:amd');
    expect(ids(find('кораблей астероиды'))).toContain('technology:amd');
  });

  test('a part of a Russian word and any order of the words find the component', () => {
    expect(ids(find('астер'))).toContain('technology:amd');
    expect(ids(find('легендарной очко победное'))).toContain('relic:shard');
  });

  test('an English name is found from the Russian interface, typo and all', () => {
    // An agenda has the same name.
    expect(ids(find('shard of the throne')).slice(0, 2)).toContain('relic:shard');
    expect(ids(find('sabotge'))[0]).toMatch(/^actionCard:sabo/);
  });

  test('an English phrase of the original text finds the component while the texts are Russian', () => {
    expect(ids(find('gain victory point legendary'))).toContain('relic:shard');
    expect(ids(find('cancel that action card'))).toContain('actionCard:sabo1');
  });

  test('a Russian phrase finds nothing of a component while the texts are English', () => {
    expect(ids(find('победное очко легендарной', en))).not.toContain('relic:shard');
  });

  test('a name typed in Russian letters as it sounds finds the English name', () => {
    expect(find('хакан').length).toBeGreaterThan(0);
    expect(find('хакан')[0].faction).toBe('hacan');
    expect(ids(find('саботаж'))[0]).toMatch(/^actionCard:sabo/);
    expect(find('жол нар').some(c => c.faction === 'jolnar')).toBe(true);
  });

  test('a query typed on the wrong keyboard layout is read on the other one', () => {
    expect(ids(find('ыфищефпу'))[0]).toMatch(/^actionCard:sabo/);
    // «реликвия» on the English layout.
    expect(find('htkbrdbz').length).toBeGreaterThan(0);
    expect(ids(find('htkbrdbz'))).toEqual(ids(find('реликвия')));
  });
});

/** Those the query asks for stand first, before anything that only mentions the words; at least `least` of them. */
function ahead(found: ComponentDef[], asked: (c: ComponentDef) => boolean, least = 1): boolean {
  const flags = found.map(asked);
  const other = flags.indexOf(false);
  return flags.filter(Boolean).length >= least && (other === -1 || !flags.slice(other).includes(true));
}

describe('fields', () => {
  test('the kind, in Russian and in English, in any number', () => {
    for (const [query, kind] of [
      ['технология', 'technology'], ['технологии', 'technology'], ['technology', 'technology'],
      ['реликвия', 'relic'], ['реликвии', 'relic'], ['relics', 'relic'], ['обязательство', 'promissory'], ['promissory', 'promissory'],
      ['прорыв', 'breakthrough'], ['breakthrough', 'breakthrough'], ['лидер', 'leader'], ['leaders', 'leader'],
      ['карта действия', 'actionCard'], ['карты действий', 'actionCard'], ['action card', 'actionCard'],
      ['секретная цель', 'secretObjective'], ['общая цель', 'publicObjective'], ['public objective', 'publicObjective'],
      ['карта политики', 'agenda'], ['agenda', 'agenda'], ['карта исследования', 'exploration'], ['exploration', 'exploration'],
      ['способность фракции', 'ability'], ['faction ability', 'ability'], ['мех', 'mech'], ['mech', 'mech'],
      ['легендарная планета', 'legendary'], ['legendary planet', 'legendary'],
    ] as const) {
      const word = query.split(' ')[0];
      // A name that holds the word stands above the kind.
      // So does a relic fragment for «relic»: it is one in its own words.
      expect(ahead(find(query), c => c.kind === kind || c.name.toLowerCase().includes(word) || (kind === 'relic' && c.detail?.resolution === 'fragment'), 5), query).toBe(true);
      expect(find(query).some(c => c.kind === kind), query).toBe(true);
    }
  });

  test('the type of a leader', () => {
    for (const [query, type] of [['агент', 'agent'], ['агенты', 'agent'], ['agent', 'agent'], ['командир', 'commander'], ['commander', 'commander'], ['герой', 'hero'], ['hero', 'hero']] as const) {
      expect(ahead(find(query), c => c.kind === 'leader' && c.detail?.type === type, 20), query).toBe(true);
    }
  });

  test('the colour of a technology, by its name and by its colour', () => {
    for (const [query, type] of [
      ['биотическая', 'biotic'], ['биотех', 'biotic'], ['зелёная', 'biotic'], ['зелёные', 'biotic'], ['biotic', 'biotic'], ['green', 'biotic'],
      ['двигательная', 'propulsion'], ['синяя', 'propulsion'], ['propulsion', 'propulsion'], ['blue', 'propulsion'],
      ['кибернетическая', 'cybernetic'], ['жёлтая', 'cybernetic'], ['cybernetic', 'cybernetic'], ['yellow', 'cybernetic'],
      ['военная', 'warfare'], ['красная', 'warfare'], ['warfare', 'warfare'], ['red', 'warfare'],
    ] as const) {
      expect(ahead(searchComponents(ru, `${query} технология`, ['technology']), c => tech(c).type === type, 8), query).toBe(true);
    }
  });

  test('a unit upgrade, and the unit it upgrades', () => {
    expect(ahead(find('улучшение юнита'), c => c.kind === 'technology' && tech(c).upgrade !== undefined, 25)).toBe(true);
    expect(ahead(find('unit upgrade'), c => c.kind === 'technology' && tech(c).upgrade !== undefined, 25)).toBe(true);
    for (const query of ['pds улучшение', 'псо улучшение', 'pds upgrade']) {
      expect(ahead(find(query), c => c.kind === 'technology' && tech(c).upgrade === 'pds'), query).toBe(true);
    }
    expect(ahead(find('улучшение дредноут'), c => c.kind === 'technology' && tech(c).upgrade === 'dreadnought')).toBe(true);
    expect(ahead(find('улучшение пехоты'), c => c.kind === 'technology' && tech(c).upgrade === 'infantry', 2)).toBe(true);
  });

  test('the stage of an objective', () => {
    expect(ahead(find('цель этап II'), c => c.kind === 'publicObjective' && c.detail?.stage === 2, 10)).toBe(true);
    // «I» is also the start of «II»: the whole word stands first.
    expect(ahead(find('objective stage I'), c => c.kind === 'publicObjective' && c.detail?.stage === 1, 10)).toBe(true);
  });

  test('the type of an agenda and what it elects', () => {
    for (const query of ['закон', 'законы', 'law']) {
      expect(ahead(find(query), c => (c.kind === 'agenda' && (c.detail?.type === 'law' || /Law/.test(String(c.detail?.target)))) || /\blaw/i.test(c.name), 20), query).toBe(true);
    }
    for (const query of ['распоряжение', 'директива', 'directive']) {
      expect(ahead(find(query), c => (c.kind === 'agenda' && c.detail?.type === 'directive') || /\bdirective/i.test(c.name), 20), query).toBe(true);
    }
    for (const query of ['law elect player', 'закон выбрать игрока', 'закон избрать игрока']) {
      expect(ahead(find(query), c => c.kind === 'agenda' && c.detail?.type === 'law' && c.detail?.target === 'Elect Player', 5), query).toBe(true);
    }
  });

  test('the phase and the window of an action card', () => {
    expect(ahead(find('карта действия фаза политики'), c => c.kind === 'actionCard' && c.detail?.phase === 'agenda', 10)).toBe(true);
    expect(ahead(find('action card after an agenda is revealed'), c => c.detail?.window === 'After an agenda is revealed')).toBe(true);
  });

  test('the trait of an exploration card', () => {
    for (const [query, trait] of [['опасная', 'hazardous'], ['hazardous', 'hazardous'], ['культурная', 'cultural'], ['промышленная', 'industrial'], ['рубеж', 'frontier'], ['frontier', 'frontier']] as const) {
      expect(ahead(find(`карта исследования ${query}`), c => c.kind === 'exploration' && c.detail?.trait === trait, 5), query).toBe(true);
    }
  });

  test('the faction, by its full name, its short name and with the kind', () => {
    const agent = find('агент hacan');
    expect(agent[0]).toMatchObject({ kind: 'leader', faction: 'hacan', detail: { type: 'agent' } });
    expect(ahead(agent, c => c.kind === 'leader' && c.faction === 'hacan' && c.detail?.type === 'agent')).toBe(true);
    expect(ids(find('агент хакан'))[0]).toBe(agent[0].id);
    expect(ids(find('agent emirates'))[0]).toBe(agent[0].id);
    expect(ahead(find('hacan'), c => c.faction === 'hacan' || /hacan/i.test(c.name), 8)).toBe(true);
    expect(ahead(find('синяя jol'), c => c.faction === 'jolnar' && tech(c)?.type === 'propulsion')).toBe(true);
    expect(ahead(find('обязательство creuss'), c => c.kind === 'promissory' && (c.faction === 'ghost' || /creuss/i.test(c.name)))).toBe(true);
  });

  test('the expansion', () => {
    expect(ahead(find("реликвия thunder's edge"), c => c.kind === 'relic' && c.pack === 'te', 5)).toBe(true);
    // A relic fragment is an exploration card with «relic» in its name.
    expect(ahead(find('relic prophecy of kings'), c => c.pack === 'pok' && (c.kind === 'relic' || /relic/i.test(c.name)), 5)).toBe(true);
  });
});

describe('the query', () => {
  test('every word must match: one more word only narrows', () => {
    const wide = ids(find('агент'));
    const narrow = ids(find('агент хакан'));
    expect(narrow.length).toBeLessThan(wide.length);
    expect(ids(searchComponents(ru, 'агент', ['leader'])).length).toBeGreaterThan(narrow.length);
    expect(find('агент хакан зззззз')).toEqual([]);
  });

  test('a query that matches nothing finds nothing, and an empty one too', () => {
    expect(find('ъъъъъъ')).toEqual([]);
    expect(find('qqzzqq')).toEqual([]);
    expect(find('')).toEqual([]);
    expect(find('  ')).toEqual([]);
  });

  test('a name stands above a kind or a faction, and those above the text', () => {
    // «Agent» is no name here; "hero" and "law" are words of names, of kinds and of texts.
    const law = find('law');
    // An agenda is a law, or elects one.
    const where = (c: ComponentDef) => (/\blaw/i.test(c.name) ? 0 : c.kind === 'agenda' && (c.detail?.type === 'law' || /Law/.test(String(c.detail?.target))) ? 1 : 2);
    const order = law.map(where);
    expect(order).toEqual([...order].sort());
    expect(order).toContain(0);
    expect(order).toContain(1);
    // A faction of the query stands above the cards that only mention it.
    const hacan = searchComponents(en, 'hacan');
    const mention = hacan.findIndex(c => c.faction !== 'hacan' && !/hacan/i.test(c.name));
    expect(mention === -1 || hacan.slice(mention).every(c => c.faction !== 'hacan')).toBe(true);
  });

  test('an exact word stands above a longer one that starts with it, and that above a typo', () => {
    const names = (query: string) => searchComponents(en, query).map(c => c.name);
    const war = names('war sun');
    expect(war[0]).toMatch(/^War Sun/);
    const sabotage = names('sabotage');
    expect(sabotage[0]).toBe('Sabotage');
  });

  test('kinds and ids narrow what is searched', () => {
    expect(searchComponents(ru, 'hacan', ['leader']).every(c => c.kind === 'leader')).toBe(true);
    expect(ids(searchComponents(ru, 'саботаж', undefined, new Set(['actionCard:sabo1', 'relic:shard'])))).toEqual(['actionCard:sabo1']);
  });

  test('at most thirty are returned', () => {
    expect(find('технология')).toHaveLength(30);
  });
});

test('every component is found by its own name first', () => {
  const missed: string[] = [];
  for (const component of componentsOf(en)) {
    const found = searchComponents(en, component.name);
    if (!found.slice(0, 12).some(c => c.name === component.name)) missed.push(component.name);
  }
  expect(missed).toEqual([]);
});

test('the index is built once for a pack: the second search does not build it again', () => {
  const pack = loadPack(['pok', 'te'], 'ru');
  const first = performance.now();
  searchComponents(pack, 'агент');
  const built = performance.now() - first;
  const second = performance.now();
  for (let i = 0; i < 20; i++) searchComponents(pack, 'агент');
  expect((performance.now() - second) / 20).toBeLessThan(Math.max(built, 5));
});

test('a line typed letter by letter is answered within a frame per letter', () => {
  const lines = ['агент хакан', 'красная технология jol', 'pds улучшение', 'law elect player', 'победное очко легендарной', 'передвигатся через астеройды', 'карта действия фаза политики'];
  find('a');
  let letters = 0;
  const started = performance.now();
  for (const line of lines) for (let n = 1; n <= line.length; n++, letters++) find(line.slice(0, n));
  expect((performance.now() - started) / letters).toBeLessThan(16);
});
