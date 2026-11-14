import { componentById, componentsOf, noteBase } from './components';
import { buildIndex, search, type SearchIndex } from './fuzzy';
import type { ComponentDef, ComponentKind, ComponentPack, DataPack } from './types';

/** How many results a search shows. */
export const RESULT_LIMIT = 30;

/**
 * The words a component is found by besides its name and text, in English and in Russian at once: the search does
 * not depend on the language of the interface, and a player types whichever comes to mind. The domain has no i18n,
 * so the words stand here; `src/ui/components/useComponentSearch.test.ts` checks that every label the interface
 * shows for a kind, a leader, a technology colour, a trait or a unit finds its components. Russian terms are those
 * of the Russian Rules Reference; a second word is what players say (a colour for a technology type).
 */
export const KIND_TERMS: Record<ComponentKind, string> = {
  technology: 'technology технология',
  actionCard: 'action card карта действия',
  relic: 'relic реликвия',
  publicObjective: 'public objective общая цель',
  secretObjective: 'secret objective секретная цель',
  agenda: 'agenda карта политики',
  exploration: 'exploration card карта исследования',
  promissory: 'promissory note обязательство',
  leader: 'leader лидер',
  ability: 'faction ability способность фракции фракционная',
  breakthrough: 'breakthrough прорыв',
  mech: 'mech мех',
  legendary: 'legendary planet легендарная планета',
};

export const LEADER_TERMS: Record<string, string> = { agent: 'agent агент', commander: 'commander командир', hero: 'hero герой' };

/** A technology type by its name and by its colour (Learn to Play: «Биотехнологии (зелёные)»). */
export const TECH_TERMS: Record<string, string> = {
  biotic: 'biotic green биотехнология биотическая зелёная',
  propulsion: 'propulsion blue двигательная двигатели синяя',
  cybernetic: 'cybernetic yellow кибернетическая кибернетика жёлтая',
  warfare: 'warfare red военная красная',
  unitUpgrade: 'unit upgrade улучшение юнита',
};

export const UNIT_TERMS: Record<string, string> = {
  infantry: 'infantry пехота', fighter: 'fighter истребитель', destroyer: 'destroyer эсминец', cruiser: 'cruiser крейсер',
  carrier: 'carrier транспортник', dreadnought: 'dreadnought дредноут', warsun: 'war sun солнце войны', flagship: 'flagship флагман',
  pds: 'pds псо', spacedock: 'space dock база', mech: 'mech мех',
};

const PHASE_TERMS: Record<string, string> = {
  strategy: 'strategy phase фаза стратегии', action: 'action phase фаза действий', status: 'status phase фаза статуса',
  agenda: 'agenda phase фаза политики', any: 'any phase любая фаза',
};

const STAGE_TERMS: Record<string, string> = { 1: 'stage I этап I', 2: 'stage II этап II' };

/** RR 26.1: «законы и распоряжения»; «директива» is what the English word sounds like. */
const AGENDA_TERMS: Record<string, string> = { law: 'law закон', directive: 'directive распоряжение директива' };

export const TRAIT_TERMS: Record<string, string> = {
  cultural: 'cultural культурная', hazardous: 'hazardous опасная', industrial: 'industrial промышленная', frontier: 'frontier рубеж',
};

const RESOLUTION_TERMS: Record<string, string> = { attach: 'attachment прикрепление', fragment: 'relic fragment фрагмент реликвии' };

/** Without «technology»: that word is the kind of the technologies. */
const SPECIALTY_TERMS = 'specialty специализация';

/** Of a faction: «фракционная технология» (RR 28.16). */
const FACTION_TERMS = 'faction фракционная';

const PACK_TERMS: Record<ComponentPack, string> = {
  base: 'base game базовая игра', pok: 'Prophecy of Kings pok', te: "Thunder's Edge te",
};

/** An agenda's target is a few words («Elect Player»); a longer one is a rule in brackets after them, or a whole text. */
const TARGET_LETTERS = 60;

/** The words of what an agenda elects, in Russian (RR 26.3: «закон требует выбрать игрока или планету»). */
const TARGET_TERMS: Record<string, string> = {
  for: 'за', against: 'против', elect: 'выбрать избрать', player: 'игрок', planet: 'планета', law: 'закон', strategy: 'стратегии',
  card: 'карта', secret: 'секретная', objective: 'цель', scored: 'выполненная', home: 'домашняя',
};

/** What an agenda elects, as its card says it and in Russian words. */
function targetOf(target: string | number | undefined): string {
  const words = typeof target === 'string' ? target.split(' (')[0] : '';
  if (words.length > TARGET_LETTERS) return '';
  return [words, ...words.toLowerCase().split(/[^a-z]+/).map(word => TARGET_TERMS[word] ?? '')].join(' ');
}

/** The kind of a component in words; a leader is also an agent, a commander or a hero. */
function kindOf(component: ComponentDef): string {
  const type = component.kind === 'leader' ? LEADER_TERMS[String(component.detail?.type)] : undefined;
  return type ? `${KIND_TERMS.leader} ${type}` : KIND_TERMS[component.kind];
}

/** What else a component is, in words: type, attributes, faction, expansion. */
function tagsOf(pack: DataPack, component: ComponentDef): string {
  const detail = component.detail ?? {};
  const of = (terms: Record<string, string>, key: string | number | undefined): string => (key === undefined ? '' : terms[key] ?? '');
  const tags = [PACK_TERMS[component.pack]];
  switch (component.kind) {
    case 'leader':
      tags.push(String(detail.title ?? ''));
      break;
    case 'technology':
      tags.push(of(TECH_TERMS, detail.type), of(UNIT_TERMS, detail.upgrade));
      break;
    case 'publicObjective':
    case 'secretObjective':
      tags.push(of(STAGE_TERMS, detail.stage), of(PHASE_TERMS, detail.phase));
      break;
    case 'agenda':
      tags.push(of(AGENDA_TERMS, detail.type), targetOf(detail.target));
      break;
    case 'actionCard':
      tags.push(of(PHASE_TERMS, detail.phase));
      break;
    case 'exploration':
      tags.push(of(TRAIT_TERMS, detail.trait), of(RESOLUTION_TERMS, detail.resolution));
      if (detail.techSpecialty !== undefined) tags.push(SPECIALTY_TERMS, of(TECH_TERMS, detail.techSpecialty));
      break;
    case 'legendary':
      tags.push(String(detail.planet ?? ''));
      break;
    default:
  }
  const faction = component.faction ? pack.factions[component.faction] : undefined;
  // The short name the interface uses is a word of the full one; the id is how players shorten the rest («ghost»).
  if (faction) tags.push(FACTION_TERMS, faction.name, faction.id);
  return tags.join(' ');
}

/**
 * Everything a component says: its text as the pack was loaded, the English original when that is a translation,
 * and the window of an action card, which stands on the card beside the text.
 */
function textOfAll(pack: DataPack, component: ComponentDef): string {
  const original = pack.originalTexts?.[component.id];
  const detail = component.detail ?? {};
  return [
    component.text, original !== undefined && original !== component.text ? original : '',
    typeof detail.window === 'string' ? detail.window : '',
  ].join(' ');
}

const INDEXES = new WeakMap<DataPack, SearchIndex>();
/**
 * The index of a pack's components, built once for the pack. A pack is loaded per set of expansions and per language
 * of the texts, so the index follows both.
 */
function indexOf(pack: DataPack): SearchIndex {
  let index = INDEXES.get(pack);
  if (!index) {
    INDEXES.set(pack, index = buildIndex(componentsOf(pack).map(component => ({
      id: component.id, name: component.name, kind: kindOf(component), tags: tagsOf(pack, component), text: textOfAll(pack, component),
    }))));
  }
  return index;
}

/**
 * The one search of components: the drawer and the picker both ask it. Every word of the query must match the
 * component somewhere, typos forgiven: in its name, in what it is (kind, leader type, technology colour and upgraded
 * unit, objective stage, agenda type and what it elects, phase, exploration trait, faction, expansion; English and
 * Russian words alike), or in its text (as loaded, the English original, an action card's window). Best first: a
 * name above what it is, that above the text. Of the given kinds and among the given ids only; none for an empty
 * query. A promissory note found is the cards it stands for: those among the ids, or else one of each player of the
 * game.
 */
export function searchComponents(pack: DataPack, query: string, kinds?: ComponentKind[], among?: Set<string>, notes?: (def: ComponentDef) => ComponentDef[]): ComponentDef[] {
  if (query.trim() === '') return [];
  const found: ComponentDef[] = [];
  for (const { id } of search(indexOf(pack), query)) {
    const component = componentById(pack, id);
    if (!component || (kinds && !kinds.includes(component.kind))) continue;
    const cards = among ? [...among].filter(other => noteBase(other) === id).flatMap(other => componentById(pack, other) ?? [])
      : notes ? notes(component) : [component];
    found.push(...cards);
    if (found.length >= RESULT_LIMIT) break;
  }
  return found.slice(0, RESULT_LIMIT);
}
