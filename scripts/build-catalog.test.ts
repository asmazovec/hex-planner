import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { loadPack } from '../src/data/loadPack';
import { COMPONENT_KINDS, componentsOf } from '../src/domain/components';
import type { ComponentDef } from '../src/domain/types';
import { SOURCE_CACHE, abilityText, buildCatalog, windowText } from './build-data';

// The component catalog of scripts/build-data.ts: what the packs and src/data/texts hold after a build.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const json = <T>(path: string): T => JSON.parse(readFileSync(join(repo, path), 'utf8')) as T;
const PACKS = ['base', 'pok', 'te'] as const;
const stored = () => PACKS.flatMap(name => json<{ components?: Omit<ComponentDef, 'text'>[] }>(`src/data/packs/${name}.json`).components ?? []);
const texts = () => Object.fromEntries(PACKS.map(name => [
  name, existsSync(join(repo, `src/data/texts/${name}.json`)) ? json<Record<string, string>>(`src/data/texts/${name}.json`) : {},
]));
const full = loadPack(['pok', 'te']);

test('у каждого компонента непустой текст в файле своего дополнения, id уникальны и начинаются с вида', () => {
  const all = componentsOf(full);
  expect(all.length).toBeGreaterThan(600);
  expect(new Set(all.map(c => c.id)).size).toBe(all.length);
  const byPack = texts();
  for (const c of all) {
    expect(c.id.startsWith(`${c.kind}:`), c.id).toBe(true);
    expect(c.text.trim(), c.id).not.toBe('');
    expect(byPack[c.pack][c.id], c.id).toBe(c.text);
  }
  for (const c of stored()) expect(byPack[c.pack][c.id], c.id).toBeTruthy();
});

test('тексты лежат отдельно от чисел: в пакетах текста карт нет, в текстах нет ссылок и картинок', () => {
  expect(stored().length).toBeGreaterThan(300);
  for (const c of stored()) expect(c).not.toHaveProperty('text');
  expect(JSON.stringify(texts())).not.toMatch(/https?:|\.(png|jpe?g|webp)\b/i);
});

test('каждая фракционная ссылка ведёт на существующую фракцию', () => {
  const withFaction = componentsOf(full).filter(c => c.faction !== undefined);
  expect(withFaction.length).toBeGreaterThan(300);
  for (const c of withFaction) expect(full.factions[c.faction!], `${c.id}: ${c.faction}`).toBeDefined();
});

test('в каталог попадают только base, pok, codex* и thunders_edge из официальных файлов; остальное считается по источникам', () => {
  const card = (alias: string, source: string, file: string) => ({ alias, name: alias, phase: 'Action', window: 'Action', text: `Text of ${alias}.`, source, file });
  const catalog = buildCatalog({
    actionCards: [
      card('a1', 'base', 'action_cards'), card('a2', 'codex1', 'action_cards'), card('a3', 'thunders_edge', 'te_actioncards'), card('a4', 'pok', 'action_cards'),
      card('h1', 'ds', 'uncharted_space'), card('h2', 'ds', 'uncharted_space'), card('h3', 'codex1', 'theodisi'), card('h4', 'deprecated', 'action_cards'),
    ],
  }, []);
  expect(catalog.components.base.map(c => c.id)).toEqual(['actionCard:a1']);
  expect(catalog.components.pok.map(c => c.id)).toEqual(['actionCard:a2', 'actionCard:a4']);
  expect(catalog.components.te.map(c => c.id)).toEqual(['actionCard:a3']);
  expect(catalog.texts.pok['actionCard:a2']).toBe('Text of a2.');
  expect(catalog.excludedSources.action_cards).toEqual({ ds: 2, 'codex1 in theodisi.json': 1, deprecated: 1 });
});

test('одинаковые карты колоды складываются в одну с числом копий', () => {
  const window = 'When another player plays an action card other than "Sabotage"';
  const card = (alias: string) => ({ alias, name: 'Sabotage', phase: 'Any', window, text: 'Cancel that action card.', source: 'base', file: 'action_cards' });
  const explore = (id: string) => ({ id, name: 'Core Mine', type: 'Hazardous', resolution: 'Instant', text: 'Gain 1 trade good.', source: 'pok', file: 'explores' });
  const catalog = buildCatalog({ actionCards: ['sabo1', 'sabo2', 'sabo3', 'sabo4'].map(card), explores: ['cm1', 'cm2', 'cm3'].map(explore) }, []);
  expect(catalog.components.base).toEqual([{ id: 'actionCard:sabo1', kind: 'actionCard', name: 'Sabotage', pack: 'base', copies: 4, detail: { phase: 'any', window } }]);
  expect(catalog.components.pok).toEqual([{ id: 'exploration:cm1', kind: 'exploration', name: 'Core Mine', pack: 'pok', copies: 3, detail: { trait: 'hazardous', resolution: 'instant' } }]);
});

test('исследование с прикреплением несёт его числа; подставная реликвия отброшена', () => {
  const catalog = buildCatalog({
    explores: [{ id: 'mw', name: 'Mining World', type: 'Hazardous', resolution: 'Attach', text: 'Attach this card.', attachmentId: 'miningworld', source: 'pok', file: 'explores' }],
    attachments: [{ id: 'miningworld', name: 'Mining World', resourcesModifier: 2, source: 'pok', file: 'attachments' }],
    relics: [
      { alias: 'shard', name: 'Shard of the Throne', text: 'Gain 1 victory point.', source: 'pok', file: 'pok' },
      { alias: 'device', name: 'Enigmatic Device', text: 'Not a relic.', isFakeRelic: true, source: 'pok', file: 'pok' },
    ],
  }, []);
  expect(catalog.components.pok).toEqual([
    { id: 'relic:shard', kind: 'relic', name: 'Shard of the Throne', pack: 'pok' },
    { id: 'exploration:mw', kind: 'exploration', name: 'Mining World', pack: 'pok', copies: 1, detail: { trait: 'hazardous', resolution: 'attach', attachment: 'miningworld', resources: 2 } },
  ]);
  expect(catalog.excluded['relic:device']).toMatch(/isFakeRelic/);
});

test('поля вида: цель, закон, обязательство; обязательство чужой фракции ломает сборку', () => {
  const catalog = buildCatalog({
    agendas: [{ alias: 'ag', name: 'Agenda', type: 'Law', target: 'Elect Player', text1: 'One.', text2: 'Two.', source: 'base', file: 'base' }],
    publicObjectives: [{ alias: 'po', name: 'Public', phase: 'Status', text: 'Do it.', points: 2, source: 'pok', file: 'public_objectives' }],
    secretObjectives: [{ alias: 'so', name: 'Secret', phase: 'Action', text: 'Do it quietly.', points: 1, source: 'base', file: 'secret_objectives' }],
    promissory: [{ alias: 'pn', name: 'Note', text: 'Give it back.', faction: 'sol', source: 'base', file: 'promissory_notes' }],
  }, ['sol']);
  expect(catalog.components.base).toEqual([
    { id: 'agenda:ag', kind: 'agenda', name: 'Agenda', pack: 'base', detail: { type: 'law', target: 'Elect Player' } },
    { id: 'promissory:pn', kind: 'promissory', name: 'Note', pack: 'base', faction: 'sol' },
    { id: 'secretObjective:so', kind: 'secretObjective', name: 'Secret', pack: 'base', detail: { phase: 'action', points: 1 } },
  ]);
  expect(catalog.texts.base['agenda:ag']).toBe('One.\nTwo.');
  expect(catalog.components.pok).toEqual([{ id: 'publicObjective:po', kind: 'publicObjective', name: 'Public', pack: 'pok', detail: { stage: 2, points: 2, phase: 'status' } }]);
  expect(() => buildCatalog({ promissory: [{ alias: 'pn', name: 'Note', text: 'T.', faction: 'nobody', source: 'base', file: 'promissory_notes' }] }, ['sol'])).toThrow(/nobody/);
});

test('окно способности и её действие соединяются двоеточием, постоянное действие стоит отдельным абзацем', () => {
  expect(windowText('ACTION:', 'Exhaust this card.')).toBe('ACTION: Exhaust this card.');
  expect(windowText('When you produce', 'You may do it.')).toBe('When you produce: You may do it.');
  expect(abilityText({ permanentEffect: 'Always so', window: 'At the start', windowEffect: 'Place 1 infantry.' })).toBe('Always so\nAt the start: Place 1 infantry.');
  expect(abilityText({ permanentEffect: 'Always so.' })).toBe('Always so.');
});

test('число компонентов по видам и дополнениям совпадает с таблицей в docs/data-verification.md', () => {
  const doc = readFileSync(join(repo, 'docs/data-verification.md'), 'utf8');
  const section = doc.split('## Каталог компонентов')[1]?.split('\n## ')[0] ?? '';
  const rows = [...section.matchAll(/^\| `(\w+)` \| (\d+) \((\d+)\) \| (\d+) \((\d+)\) \| (\d+) \((\d+)\) \|/gm)];
  const expected = Object.fromEntries(rows.map(row => [row[1], row.slice(2).map(Number)]));
  const actual: Record<string, number[]> = {};
  for (const c of componentsOf(full)) {
    const row = actual[c.kind] ??= [0, 0, 0, 0, 0, 0];
    const at = PACKS.indexOf(c.pack) * 2;
    row[at] += 1;
    row[at + 1] += c.copies ?? 1;
  }
  expect(Object.keys(expected).sort()).toEqual([...COMPONENT_KINDS].sort());
  expect(actual).toEqual(expected);
});

const cached = (dir: string, file: string) => join(SOURCE_CACHE, 'data', dir, `${file}.json`);
if (!existsSync(cached('action_cards', 'action_cards'))) console.warn(`verbatim text test SKIPPED: no source copy in ${SOURCE_CACHE}. Run: npx tsx scripts/build-data.ts (it downloads the copy).`);

test.skipIf(!existsSync(cached('action_cards', 'action_cards')))('тексты дословно совпадают с полем text источника', () => {
  const read = (dir: string, file: string) => JSON.parse(readFileSync(cached(dir, file), 'utf8')) as { alias?: string; id?: string; text: string; source: string }[];
  const byPack = texts();
  const all = { ...byPack.base, ...byPack.pok, ...byPack.te };
  let checked = 0;
  for (const [kind, dir, files] of [
    ['actionCard', 'action_cards', ['action_cards', 'te_actioncards']], ['relic', 'relics', ['pok', 'codexii', 'codexiv', 'te_relics']],
    ['publicObjective', 'public_objectives', ['public_objectives']], ['secretObjective', 'secret_objectives', ['secret_objectives']],
    ['technology', 'technologies', ['pok', 'te_techs']], ['breakthrough', 'breakthroughs', ['te_breakthroughs']],
  ] as [string, string, string[]][]) {
    for (const record of files.flatMap(file => read(dir, file))) {
      const id = `${kind}:${record.alias ?? record.id}`;
      const text = all[id];
      if (text === undefined) continue;
      expect(/^(base|pok|thunders_edge|codex\d*)$/.test(record.source), id).toBe(true);
      expect(text, id).toBe(record.text.replace(/\r\n/g, '\n').trim());
      checked += 1;
    }
  }
  expect(checked).toBeGreaterThan(300);
});
