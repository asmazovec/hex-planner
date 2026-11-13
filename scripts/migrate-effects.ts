/**
 * The codemod that moves component files from the old shape (`export const effect: ComponentEffect`, run on the old
 * per-player state) to the kernel's (`export const ability: Ability`, with a declared `holder`). It rewrites only what is
 * mechanical, through the TypeScript syntax tree, and lists every file it leaves, with why:
 *  - a hint (`tier: 'hint'` with `rule` and `hintAt` only): the holder is read from the card's printed trigger;
 *  - a passive effect whose `modify` never touches the old state (`state`, `shared`, `states`, `game`, `entry`): its
 *    holder is `self`, its numbers are the same function of the same point.
 * A file that plays (`play`), waives, restricts or reads the old state is hand work: it is listed as `left`.
 *
 *   npx tsx scripts/migrate-effects.ts [--write] [--kind technology] [--list]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { defaultHolder, type HolderRule } from '../src/domain/effects/holder';

export type Converted = { output: string; holder: HolderRule; tier: string } | { left: string };

const ALLOWED = new Set(['tier', 'rule', 'hintAt', 'modify', 'holder']);
const OLD_STATE = new Set(['state', 'shared', 'states', 'game', 'entry', 'warnings']);
const ABILITY_IMPORT = '../../../../game/abilities/types';

/** Converts the text of one component file; `holderFor` gives a hint's holder from its id. */
export function convertFile(source: string, holderFor: (id: string) => HolderRule): Converted {
  const crlf = source.includes('\r\n');
  const text = source.replace(/\r\n/g, '\n');
  const file = ts.createSourceFile('component.ts', text, ts.ScriptTarget.ES2022, true);
  const found: { statement: ts.VariableStatement; declaration: ts.VariableDeclaration }[] = [];
  let id: string | undefined;
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      if (declaration.name.text === 'effect') found.push({ statement, declaration });
      if (declaration.name.text === 'id' && declaration.initializer && ts.isStringLiteral(declaration.initializer)) id = declaration.initializer.text;
    }
  }
  if (found.length !== 1 || id === undefined) return { left: found.length === 0 ? 'no `effect`' : 'not a single `effect` and `id`' };
  const { declaration } = found[0];
  const init = declaration.initializer;
  if (!init || !ts.isObjectLiteralExpression(init)) return { left: '`effect` is not an object literal' };
  if (!declaration.type || declaration.type.getText(file) !== 'ComponentEffect') return { left: '`effect` is not annotated ComponentEffect' };

  const props = new Map<string, ts.PropertyAssignment>();
  for (const property of init.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) return { left: 'shorthand or computed property' };
    if (!ALLOWED.has(property.name.text)) return { left: `has \`${property.name.text}\`` };
    props.set(property.name.text, property);
  }
  const tier = props.get('tier')?.initializer;
  if (!tier || !ts.isStringLiteral(tier) || (tier.text !== 'hint' && tier.text !== 'passive')) return { left: `tier ${tier?.getText(file) ?? '?'}` };
  if (props.has('holder')) return { left: 'already has a holder' };
  if (tier.text === 'passive') {
    const modify = props.get('modify');
    if (!modify) return { left: 'passive without modify' };
    let touched: string | undefined;
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && OLD_STATE.has(node.text)) touched = node.text;
      ts.forEachChild(node, visit);
    };
    visit(modify.initializer);
    if (touched) return { left: `modify reads \`${touched}\`` };
  }
  const holder: HolderRule = tier.text === 'hint' ? holderFor(id) : 'self';

  // Other uses of the type name than the annotation and its import: the file is not just an effect.
  let uses = 0;
  const count = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === 'ComponentEffect') uses += 1;
    ts.forEachChild(node, count);
  };
  count(file);

  const edits: { start: number; end: number; text: string }[] = [];
  edits.push({ start: declaration.name.getStart(file), end: declaration.type.getEnd(), text: 'ability: Ability' });
  const single = !text.slice(init.getStart(file), init.getEnd()).includes('\n');
  edits.push({ start: init.getStart(file) + 1, end: init.getStart(file) + 1, text: single ? ` holder: '${holder}',` : `\n  holder: '${holder}',` });

  const imports = file.statements.filter(ts.isImportDeclaration);
  const typed = imports.find(i => i.importClause?.namedBindings && ts.isNamedImports(i.importClause.namedBindings) && i.importClause.namedBindings.elements.some(e => e.name.text === 'ComponentEffect'));
  if (!typed || uses !== 2) return { left: 'ComponentEffect is used beyond the annotation and its import' };
  const names = (typed.importClause!.namedBindings as ts.NamedImports).elements.filter(e => e.name.text !== 'ComponentEffect');
  const last = imports[imports.length - 1];
  const addition = `import type { Ability } from '${ABILITY_IMPORT}';`;
  if (names.length === 0) {
    // The old import line becomes the new one.
    edits.push({ start: typed.getStart(file), end: typed.getEnd(), text: addition });
  } else {
    const typeOnly = typed.importClause!.isTypeOnly;
    edits.push({ start: typed.getStart(file), end: typed.getEnd(), text: `import ${typeOnly ? 'type ' : ''}{ ${names.map(n => n.getText(file)).join(', ')} } from ${typed.moduleSpecifier.getText(file)};` });
    edits.push({ start: last.getEnd(), end: last.getEnd(), text: `\n${addition}` });
  }
  let output = text;
  for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  return { output: crlf ? output.replace(/\n/g, '\r\n') : output, holder, tier: tier.text };
}

// ---------------------------------------------------------------------------------------------------------------------

function holderTable(): (id: string) => HolderRule {
  const texts: Record<string, string> = {};
  for (const name of ['base', 'pok', 'te']) Object.assign(texts, JSON.parse(readFileSync(`src/data/texts/${name}.json`, 'utf8')) as Record<string, string>);
  const details: Record<string, Record<string, string | number> | undefined> = {};
  for (const name of ['base', 'pok', 'te']) {
    const pack = JSON.parse(readFileSync(`src/data/packs/${name}.json`, 'utf8')) as { components: { id: string; detail?: Record<string, string | number> }[] };
    for (const c of pack.components) details[c.id] = c.detail;
  }
  return id => defaultHolder({ text: texts[id] ?? '', detail: details[id] });
}

function main(): void {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const only = args.includes('--kind') ? args[args.indexOf('--kind') + 1] : undefined;
  const root = 'src/domain/effects/components';
  const holderFor = holderTable();
  const converted: string[] = [];
  const left = new Map<string, string[]>();
  for (const kind of readdirSync(root)) {
    if ((only && kind !== only) || !statSync(join(root, kind)).isDirectory()) continue;
    for (const name of readdirSync(join(root, kind))) {
      if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue;
      const path = join(root, kind, name);
      const result = convertFile(readFileSync(path, 'utf8'), holderFor);
      if ('left' in result) { left.set(result.left, [...(left.get(result.left) ?? []), path]); continue; }
      converted.push(`${path} (${result.tier}, ${result.holder})`);
      if (write) writeFileSync(path, result.output);
    }
  }
  console.log(`${write ? 'converted' : 'convertible'}: ${converted.length}`);
  for (const [reason, paths] of [...left].sort((a, b) => b[1].length - a[1].length)) console.log(`left ${paths.length}: ${reason}`);
  if (args.includes('--list')) console.log([...converted, ...[...left].flatMap(([r, p]) => p.map(x => `${x}  <- ${r}`))].join('\n'));
}

if (process.argv[1]?.endsWith('migrate-effects.ts')) main();
