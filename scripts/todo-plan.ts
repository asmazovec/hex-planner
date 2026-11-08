/**
 * Collects the Phase 2 TODOs from the code and writes the plan: by workstream, wave, type and rule.
 *
 *   npm run plan:todos                       writes docs/phase2/plan.md and docs/phase2/todos.json
 *   npm run plan:todos -- --tests r.json     also checks that every failing rules test is covered by a TODO
 *                                            (r.json: `npx vitest run src/domain/rules --reporter=json > r.json`)
 *
 * A TODO is one line, in any comment syntax (`//`, `/* *\/`, `{/* *\/}`, `<!-- -->`, `#`):
 *
 *   TODO(P2-017) #ws:transport #type:check #rule:95.3 #test:095-transport #size:s #pickup — free text
 *
 * Tags: `#ws:` one, required, an id of scripts/todo-plan.workstreams.ts; `#type:` one, required; `#rule:` LRR numbers,
 * any; `#test:` rules test file stems, any; `#dep:` other TODO ids, any; `#needs:` decision | prototype; `#size:` s | m | l;
 * `#layer:` taken from the path when absent; any other `#word` is a free tag. The text follows ` — ` or the last tag.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { WORKSTREAMS, type Workstream } from './todo-plan.workstreams';

export const TYPES = {
  bug: 'Ошибка: код делает то, что правило запрещает',
  check: 'Нет проверки: правило запрещает, нарушения нет',
  model: 'Нет модели: не хватает данных или понятия',
  arch: 'Архитектура: ответственность не на месте',
  dup: 'Дублирование',
  dead: 'Мёртвый код',
  ui: 'Визуальный язык: элемент вне общего контейнера',
  vocab: 'Термины игры',
  data: 'Данные',
  doc: 'Документация',
} as const;
export type TodoType = keyof typeof TYPES;
const TYPE_ORDER = Object.keys(TYPES) as TodoType[];

export interface Todo {
  id: string;
  num: number;
  file: string;
  line: number;
  ws: string;
  type: TodoType;
  layer: string;
  rules: string[];
  tests: string[];
  deps: string[];
  needs: string[];
  size: 's' | 'm' | 'l';
  tags: string[];
  text: string;
}

const ROOTS = ['src', 'scripts', 'docs', 'CLAUDE.md', '.vale', 'tests'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.md', '.yml', '.yaml', '.mjs', '.ini']);
const SKIP = new Set(['node_modules', 'dist', 'phase2']);
const LINE = /TODO\((P2-(\d{3,}))\)\s*(.*)$/;

function files(root: string): string[] {
  let stat;
  try { stat = statSync(root); } catch { return []; }
  if (stat.isFile()) return EXTENSIONS.has(extname(root)) ? [root] : [];
  return readdirSync(root).filter(name => !SKIP.has(name)).flatMap(name => files(join(root, name)));
}

const layerOf = (file: string): string => {
  if (file.startsWith('src/domain')) return 'domain';
  if (file.startsWith('src/ui')) return 'ui';
  if (file.startsWith('src/data') || file.startsWith('scripts/build-data')) return 'data';
  if (file.startsWith('src/state')) return 'state';
  if (file.startsWith('src/storage')) return 'storage';
  if (file.startsWith('src/i18n') || file.startsWith('.vale')) return 'i18n';
  if (file.endsWith('.md')) return 'docs';
  return 'other';
};

/** Parses one TODO line; the text loses a trailing comment closer. */
export function parseTodo(raw: string, file: string, line: number): Todo | null {
  const m = LINE.exec(raw);
  if (!m) return null;
  const rest = m[3].replace(/\s*(\*\/\s*\}?|-->)\s*$/, '');
  const [tagPart, ...textParts] = rest.split(/\s+—\s+/);
  const tokens = tagPart.split(/\s+/).filter(Boolean);
  const tagTokens: string[] = [];
  let i = 0;
  while (i < tokens.length && tokens[i].startsWith('#')) tagTokens.push(tokens[i++]);
  const text = [tokens.slice(i).join(' '), ...textParts].filter(Boolean).join(' — ').trim();
  const todo: Todo = { id: m[1], num: Number(m[2]), file, line, ws: '', type: '' as TodoType, layer: layerOf(file),
    rules: [], tests: [], deps: [], needs: [], size: 'm', tags: [], text };
  for (const token of tagTokens) {
    const [key, value] = token.slice(1).split(/:(.*)/s);
    if (value === undefined) { todo.tags.push(key); continue; }
    if (key === 'ws') todo.ws = value;
    else if (key === 'type') todo.type = value as TodoType;
    else if (key === 'layer') todo.layer = value;
    else if (key === 'rule') todo.rules.push(value);
    else if (key === 'test') todo.tests.push(value);
    else if (key === 'dep') todo.deps.push(value);
    else if (key === 'needs') todo.needs.push(value);
    else if (key === 'size') todo.size = value as Todo['size'];
    else todo.tags.push(`${key}:${value}`);
  }
  return todo;
}

export function collect(cwd = process.cwd()): Todo[] {
  return ROOTS.flatMap(root => files(join(cwd, root))).flatMap(path => {
    const file = relative(cwd, path).split('\\').join('/');
    if (file === 'scripts/todo-plan.ts' || file === 'scripts/todo-plan.test.ts') return [];
    return readFileSync(path, 'utf8').split(/\r?\n/).flatMap((raw, i) => parseTodo(raw, file, i + 1) ?? []);
  }).sort((a, b) => a.num - b.num);
}

export function validate(todos: Todo[]): string[] {
  const errors: string[] = [];
  const ids = new Map<string, Todo>();
  const known = new Set(WORKSTREAMS.map(w => w.id));
  for (const t of todos) {
    const at = `${t.id} (${t.file}:${t.line})`;
    if (ids.has(t.id)) errors.push(`${at}: id already used at ${ids.get(t.id)!.file}:${ids.get(t.id)!.line}`);
    ids.set(t.id, t);
    if (!known.has(t.ws)) errors.push(`${at}: unknown or missing #ws "${t.ws}"`);
    if (!TYPE_ORDER.includes(t.type)) errors.push(`${at}: unknown or missing #type "${t.type}"`);
    if (!['s', 'm', 'l'].includes(t.size)) errors.push(`${at}: #size must be s, m or l`);
    if (!t.text) errors.push(`${at}: no text`);
    for (const n of t.needs) if (!['decision', 'prototype'].includes(n)) errors.push(`${at}: #needs must be decision or prototype`);
  }
  // A #dep on an id no longer in the code is a dependency already done: fixed TODOs are deleted.
  for (const t of todos) for (const d of t.deps) if (!/^P2-\d{3,}$/.test(d)) errors.push(`${t.id}: #dep ${d} is not a TODO id`);
  for (const w of WORKSTREAMS) for (const a of w.after) if (!known.has(a)) errors.push(`workstream ${w.id}: after unknown ${a}`);
  return errors;
}

/** Waves: a workstream comes one wave after the latest of those it builds on. */
export function waves(list: Workstream[] = WORKSTREAMS): Map<string, number> {
  const wave = new Map<string, number>();
  const visit = (id: string, path: string[]): number => {
    if (wave.has(id)) return wave.get(id)!;
    if (path.includes(id)) throw new Error(`workstream cycle: ${[...path, id].join(' → ')}`);
    const w = list.find(x => x.id === id)!;
    const n = w.after.length === 0 ? 0 : 1 + Math.max(...w.after.map(a => visit(a, [...path, id])));
    wave.set(id, n);
    return n;
  };
  for (const w of list) visit(w.id, []);
  return wave;
}

interface FailingTest { file: string; title: string }

/** Failing rules tests no TODO points at: by `#test:` stem and the rule number before the title's colon. */
export function uncovered(todos: Todo[], failing: FailingTest[]): FailingTest[] {
  /** The title's rule, spaces as dashes: '41 note 6: …' is '41-note-6'. A rule tag covers it when it is that or its start, at a boundary. */
  const prefixOf = (title: string) => title.split(':')[0].trim().replace(/\s+/g, '-').toLowerCase();
  const covers = (rule: string, prefix: string) => prefix.startsWith(rule.toLowerCase()) && !/\d/.test(prefix.charAt(rule.length));
  return failing.filter(({ file, title }) => {
    const prefix = prefixOf(title);
    return !todos.some(t => t.tests.includes(file) && (t.rules.length === 0 || t.rules.some(r => covers(r, prefix))));
  });
}

function readFailing(path: string): FailingTest[] {
  const report = JSON.parse(readFileSync(path, 'utf8')) as { testResults: { name: string; assertionResults: { status: string; title: string }[] }[] };
  return report.testResults.flatMap(f => f.assertionResults.filter(t => t.status === 'failed').map(t => ({
    file: f.name.split(/[\\/]/).pop()!.replace(/\.test\.ts$/, ''), title: t.title,
  })));
}

const cell = (s: string) => s.replace(/\|/g, '\\|');
const link = (t: Todo) => `[${t.file}:${t.line}](../../${t.file}#L${t.line})`;

export function render(todos: Todo[], gaps: FailingTest[] | null): string {
  const wave = waves();
  const byWs = (id: string) => todos.filter(t => t.ws === id);
  const count = <K extends string>(key: (t: Todo) => K[]) => {
    const m = new Map<K, number>();
    for (const t of todos) for (const k of key(t)) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const out: string[] = [];
  out.push('# План Фазы 2', '');
  out.push('Собрано скриптом `npm run plan:todos` из комментариев `TODO(P2-…)` в коде. Не правьте этот файл руками: правьте TODO и запустите скрипт снова.', '');
  out.push(`Всего: **${todos.length}** TODO в **${new Set(todos.map(t => t.file)).size}** файлах, **${WORKSTREAMS.length}** потоков.`, '');

  out.push('## По типам', '', '| Тип | Значение | Количество |', '|---|---|---|');
  const types = count(t => [t.type]);
  for (const k of TYPE_ORDER) if (types.get(k)) out.push(`| \`${k}\` | ${TYPES[k]} | ${types.get(k)} |`);
  out.push('');

  out.push('## Волны', '', 'Поток стоит на волну позже самого позднего из тех, на чей результат он опирается. Потоки одной волны независимы: их можно делать параллельно, у каждого свои файлы.', '');
  const maxWave = Math.max(...wave.values());
  for (let n = 0; n <= maxWave; n++) {
    const list = WORKSTREAMS.filter(w => wave.get(w.id) === n);
    out.push(`**Волна ${n}:** ${list.map(w => `[${w.id}](#ws-${w.id}) (${byWs(w.id).length})`).join(', ')}`, '');
  }

  out.push('## Потоки', '');
  for (const w of [...WORKSTREAMS].sort((a, b) => wave.get(a.id)! - wave.get(b.id)!)) {
    const items = byWs(w.id).sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.num - b.num);
    out.push(`<a id="ws-${w.id}"></a>`, `### ${w.title} · \`${w.id}\` · волна ${wave.get(w.id)}`, '');
    out.push(`**Цель.** ${w.goal}`, '');
    if (w.after.length) out.push(`**Опирается на:** ${w.after.map(a => `\`${a}\``).join(', ')}`, '');
    out.push(`**Файлы потока:** ${w.owns.map(o => `\`${o}\``).join(', ')}`, '');
    const needs = items.filter(t => t.needs.length);
    if (needs.length) out.push(`**Нужно ваше решение или прототип:** ${needs.map(t => `${t.id} (${t.needs.join(', ')})`).join(', ')}`, '');
    if (items.length === 0) { out.push('_Нет TODO._', ''); continue; }
    out.push('Порядок исправления: сначала ошибки, затем проверки, модели, архитектура, остальное.', '');
    out.push('| ID | Тип | Правила | Где | Что | Теги | Разм. | Зависит |', '|---|---|---|---|---|---|---|---|');
    for (const t of items) {
      out.push(`| ${t.id} | ${t.type} | ${t.rules.join(', ')} | ${link(t)} | ${cell(t.text)} | ${t.tags.map(x => `#${x}`).join(' ')} | ${t.size} | ${t.deps.map(d => (todos.some(o => o.id === d) ? d : `~~${d}~~ ✓`)).join(', ')} |`);
    }
    out.push('');
  }

  out.push('## По правилам', '', '| Правило | TODO |', '|---|---|');
  const rules = count(t => t.rules);
  const ruleKey = (r: string) => r.split(/[^\d]+/).filter(Boolean).map(n => n.padStart(4, '0')).join('.') || r;
  for (const r of [...rules.keys()].sort((a, b) => ruleKey(a).localeCompare(ruleKey(b)))) {
    out.push(`| ${r} | ${todos.filter(t => t.rules.includes(r)).map(t => t.id).join(', ')} |`);
  }
  out.push('');

  out.push('## По слоям и тегам', '');
  out.push(`Слои: ${[...count(t => [t.layer])].map(([k, v]) => `${k} ${v}`).join(', ')}.`, '');
  out.push(`Теги: ${[...count(t => t.tags)].sort((a, b) => b[1] - a[1]).map(([k, v]) => `#${k} ${v}`).join(', ')}.`, '');

  if (gaps) {
    out.push('## Падающие тесты правил без TODO', '');
    out.push(gaps.length === 0 ? 'Каждый падающий тест правил закрыт TODO.' : gaps.map(g => `- \`${g.file}\` — ${g.title}`).join('\n'), '');
  }
  return out.join('\n');
}

function main(): void {
  const todos = collect();
  const errors = validate(todos);
  const testsAt = process.argv.indexOf('--tests');
  const gaps = testsAt > 0 ? uncovered(todos, readFailing(process.argv[testsAt + 1])) : null;
  mkdirSync('docs/phase2', { recursive: true });
  writeFileSync('docs/phase2/plan.md', render(todos, gaps));
  writeFileSync('docs/phase2/todos.json', JSON.stringify({ workstreams: WORKSTREAMS, waves: Object.fromEntries(waves()), todos }, null, 2));
  console.log(`${todos.length} TODO → docs/phase2/plan.md, docs/phase2/todos.json`);
  if (gaps?.length) console.log(`${gaps.length} failing rules tests without a TODO (listed in the plan)`);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/todo-plan.ts')) main();
