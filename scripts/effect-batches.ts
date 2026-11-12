/**
 * Splits every component of the catalogue (all expansions on) into batches of about twenty for the work on their
 * effects (docs/phase4/component-effects.md): the components of a faction stay together, two factions a batch, then
 * the common ones by kind. Deterministic: the order is that of the catalogue.
 *
 *   npm run plan:effects             writes docs/phase4/batches/NN.json and README.md
 *   npm run plan:effects -- --status prints, per batch, how many components have their effect file and how many are red
 *
 * The batch files and the index never hold a status: a status changes with every branch, and thirty-five branches
 * writing it would collide. It is read from the files of the components themselves.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { loadPack } from '../src/data/loadPack';
import { componentsOf } from '../src/domain/components';
import { fileOf } from '../src/domain/effects/files';
import type { ComponentDef, ComponentKind, DataPack } from '../src/domain/types';

export const BATCH_SIZE = 20;
export const OUT = 'docs/phase4/batches';
const COMPONENTS = 'src/domain/effects/components';

export interface BatchItem { id: string; name: string; kind: ComponentKind; pack: string; faction?: string; /** Under src/domain/effects/components, without the extension. */ file: string }
export interface Batch { batch: number; title: string; components: BatchItem[] }

/** The three sheets of the Council Keleres are one faction played three ways. */
const groupOf = (faction: string): string => (faction.startsWith('keleres') ? 'keleres' : faction);

/** The common components in the order they are worked on: technologies by colour, then each kind of card. */
const COMMON_KINDS: ComponentKind[] = ['technology', 'actionCard', 'relic', 'agenda', 'publicObjective', 'secretObjective', 'exploration', 'promissory', 'legendary'];
const COLOURS = ['biotic', 'propulsion', 'cybernetic', 'warfare', 'unitUpgrade', 'none'];
const KIND_TITLES: Record<string, string> = {
  technology: 'technologies', actionCard: 'action cards', relic: 'relics', agenda: 'agendas', publicObjective: 'public objectives',
  secretObjective: 'secret objectives', exploration: 'exploration', promissory: 'promissory notes', legendary: 'legendary planets',
};

const item = (component: ComponentDef): BatchItem => ({
  id: component.id, name: component.name, kind: component.kind, pack: component.pack, ...(component.faction ? { faction: component.faction } : {}), file: fileOf(component.id),
});

/** The batches of a pack: the factions two a batch, then the common components twenty a batch. */
export function batchesOf(pack: DataPack): Batch[] {
  const catalog = componentsOf(pack);
  const factions = new Map<string, ComponentDef[]>();
  for (const component of catalog) {
    if (component.faction === undefined) continue;
    const group = groupOf(component.faction);
    factions.set(group, [...(factions.get(group) ?? []), component]);
  }
  const batches: Omit<Batch, 'batch'>[] = [];
  const groups = [...factions];
  for (let i = 0; i < groups.length; i += 2) {
    const pair = groups.slice(i, i + 2);
    batches.push({ title: `Factions: ${pair.map(([name]) => name).join(', ')}`, components: pair.flatMap(([, list]) => list).map(item) });
  }
  const colour = (component: ComponentDef) => COLOURS.indexOf(String(component.detail?.type ?? 'none'));
  const common = COMMON_KINDS.flatMap(kind => {
    const list = catalog.filter(component => component.faction === undefined && component.kind === kind);
    return kind === 'technology' ? [...list].sort((a, b) => colour(a) - colour(b)) : list;
  });
  for (let i = 0; i < common.length; i += BATCH_SIZE) {
    const list = common.slice(i, i + BATCH_SIZE);
    const kinds = [...new Set(list.map(component => KIND_TITLES[component.kind]))];
    batches.push({ title: `Common: ${kinds.join(', ')}`, components: list.map(item) });
  }
  return batches.map((batch, index) => ({ batch: index + 1, ...batch }));
}

const numbered = (batch: Batch): string => String(batch.batch).padStart(2, '0');

/** Where a component stands: no file yet, red tests waiting (`test.fails`), or written. */
export function statusOf(file: string): 'none' | 'red' | 'written' {
  const path = `${COMPONENTS}/${file}`;
  if (!existsSync(`${path}.ts`)) return 'none';
  const red = [`${path}.test.ts`, `${path}.ui.test.tsx`].some(test => existsSync(test) && /\btest\.fails\(/.test(readFileSync(test, 'utf8')));
  return red ? 'red' : 'written';
}

export function renderIndex(batches: Batch[]): string {
  const total = batches.reduce((sum, batch) => sum + batch.components.length, 0);
  return [
    '# Batches of component effects',
    '',
    `${total} components in ${batches.length} batches, written by \`npm run plan:effects\` (scripts/effect-batches.ts). The guide for a batch:`,
    '[../component-effects.md](../component-effects.md).',
    '',
    'A batch file lists its components with the file each effect goes to under `src/domain/effects/components`.',
    'No status is kept here: `npm run plan:effects -- --status` reads it from the component files of the checkout.',
    '',
    '| Batch | Components | What |',
    '| --- | --- | --- |',
    ...batches.map(batch => `| [${numbered(batch)}](${numbered(batch)}.json) | ${batch.components.length} | ${batch.title} |`),
    '',
  ].join('\n');
}

function main(): void {
  const batches = batchesOf(loadPack(['pok', 'te']));
  if (process.argv.includes('--status')) {
    for (const batch of batches) {
      const states = batch.components.map(component => statusOf(component.file));
      const count = (state: string) => states.filter(s => s === state).length;
      console.log(`${numbered(batch)}  ${String(batch.components.length).padStart(2)} components  written ${count('written')}  red ${count('red')}  none ${count('none')}  ${batch.title}`);
    }
    return;
  }
  mkdirSync(OUT, { recursive: true });
  for (const file of readdirSync(OUT)) if (/^\d+\.json$/.test(file)) rmSync(`${OUT}/${file}`);
  for (const batch of batches) writeFileSync(`${OUT}/${numbered(batch)}.json`, `${JSON.stringify(batch, null, 2)}\n`);
  writeFileSync(`${OUT}/README.md`, renderIndex(batches));
  console.log(`${batches.reduce((sum, batch) => sum + batch.components.length, 0)} components → ${batches.length} batches in ${OUT}`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/effect-batches.ts')) main();
