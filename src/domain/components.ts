import type { ComponentDef, ComponentKind, DataPack, SheetItem } from './types';

export const COMPONENT_KINDS: ComponentKind[] = [
  'technology', 'actionCard', 'relic', 'publicObjective', 'secretObjective', 'agenda', 'exploration', 'promissory',
  'leader', 'ability', 'breakthrough', 'mech', 'legendary',
];

const NOTE = 'promissory:';

/** Where the address of a note stands in its id: after the `@`, up to the `#` of a text beside the main one, if any. */
function addressOf(id: string): { at: number; end: number } | undefined {
  if (!id.startsWith(NOTE)) return undefined;
  const hash = id.indexOf('#');
  const end = hash < 0 ? id.length : hash;
  const at = id.lastIndexOf('@', end);
  return at < 0 ? undefined : { at, end };
}

/** The catalogue id of a note, without the address; any other id as it is. */
export function noteBase(id: string): string {
  const address = addressOf(id);
  return address ? id.slice(0, address.at) + id.slice(address.end) : id;
}

/**
 * A promissory note a player holds is one card of one player: its id is the catalogue id with the address of the
 * player whose note it is, `promissory:<id>@<player>`, `me` or an opponent id. The catalogue itself lists each note
 * once, without an address.
 */
export const noteId = (base: string, player: string): string => `${noteBase(base)}@${player}`;

/** The player a note is addressed to, `me` or an opponent id; none for a catalogue id. */
export function noteAddress(id: string): string | undefined {
  const address = addressOf(id);
  return address && id.slice(address.at + 1, address.end);
}

/** The printed text under an id, verbatim from the source or its translation, as the pack was loaded; empty when the pack has none (an unknown id, an expansion that is off). */
export function textOf(pack: DataPack, id: string): string {
  return pack.texts[noteBase(id)] ?? '';
}

interface Catalog { list: ComponentDef[]; byId: Map<string, ComponentDef> }
const CATALOGS = new WeakMap<DataPack, Catalog>();

function build(pack: DataPack): Catalog {
  const byId = new Map<string, ComponentDef>();
  const add = (component: ComponentDef) => { if (!byId.has(component.id)) byId.set(component.id, component); };
  for (const component of pack.components) add(component);

  // A sheet item is in play when its expansion is: its text is loaded with that expansion. Leaders and mechs also need
  // Prophecy of Kings, which is on when the pack has the mech unit. An item a present one replaces is out.
  const pok = pack.units.mech !== undefined;
  const present = <T extends SheetItem>(kind: ComponentKind, items: T[]): T[] => {
    const loaded = items.filter(item => pack.texts[`${kind}:${item.id}`] !== undefined);
    const replaced = new Set(loaded.map(item => item.replaces));
    return loaded.filter(item => !replaced.has(item.id));
  };
  const techOwner = new Map<string, string>();
  const techOut = new Set<string>();
  for (const faction of Object.values(pack.factions)) {
    const sheet = faction.sheet;
    if (!sheet) continue;
    const item = (kind: ComponentKind, from: SheetItem, detail?: ComponentDef['detail']) => add({
      id: `${kind}:${from.id}`, kind, name: from.name, pack: from.pack, text: textOf(pack, `${kind}:${from.id}`), faction: faction.id,
      ...(detail ? { detail } : {}),
    });
    for (const ability of present('ability', sheet.abilities)) item('ability', ability);
    if (pok) {
      for (const leader of present('leader', sheet.leaders)) item('leader', leader, { type: leader.type, ...(leader.title ? { title: leader.title } : {}) });
      for (const mech of present('mech', sheet.mechs)) item('mech', mech);
    }
    if (sheet.breakthrough) for (const breakthrough of present('breakthrough', [sheet.breakthrough])) item('breakthrough', breakthrough);
    const techs = present('technology', sheet.techs ?? []);
    for (const tech of sheet.techs ?? []) {
      if (techs.includes(tech)) { if (!techOwner.has(tech.id)) techOwner.set(tech.id, faction.id); } else techOut.add(tech.id);
    }
  }
  for (const tech of Object.values(pack.technologies)) {
    const id = `technology:${tech.id}`;
    if (pack.texts[id] === undefined || (techOut.has(tech.id) && !techOwner.has(tech.id))) continue;
    const owner = techOwner.get(tech.id);
    add({
      id, kind: 'technology', name: tech.name, pack: tech.pack ?? 'base', text: textOf(pack, id), ...(owner ? { faction: owner } : {}),
      detail: { type: tech.type ?? (tech.upgrade ? 'unitUpgrade' : 'none'), ...(tech.upgrade ? { upgrade: tech.upgrade } : {}) },
    });
  }
  for (const planet of Object.values(pack.planets)) {
    const id = `legendary:${planet.id}`;
    if (planet.legendary && pack.texts[id] !== undefined) add({ id, kind: 'legendary', name: planet.legendary, pack: planet.pack ?? 'base', text: textOf(pack, id), detail: { planet: planet.name } });
  }
  return { list: [...byId.values()], byId };
}

const catalogOf = (pack: DataPack): Catalog => {
  let catalog = CATALOGS.get(pack);
  if (!catalog) CATALOGS.set(pack, catalog = build(pack));
  return catalog;
};

/**
 * Every component of the pack as one flat list: the cards of `pack.components`, then the technologies, the abilities,
 * leaders, mechs and breakthroughs of the faction sheets, and the legendary planets. Ids are `<kind>:<source id>`.
 * A component shared by several factions (Keleres) is listed once, under the first of them.
 */
export function componentsOf(pack: DataPack): ComponentDef[] {
  return catalogOf(pack).list;
}

/** The component under an id. An addressed note is its catalogue card under its own id: it is held and handed over as that one card. */
export function componentById(pack: DataPack, id: string): ComponentDef | undefined {
  const { byId } = catalogOf(pack);
  const found = byId.get(id);
  if (found) return found;
  const base = noteBase(id);
  const note = base === id ? undefined : byId.get(base);
  if (!note) return undefined;
  const addressed = { ...note, id };
  byId.set(id, addressed);
  return addressed;
}
