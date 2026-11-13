/**
 * The codemod that moves component files from the old shape (`export const effect: ComponentEffect`, run on the old
 * per-player state) to the kernel's (`export const ability: Ability`, with a declared `holder`). It rewrites only what is
 * mechanical, through the TypeScript syntax tree, and lists every file it leaves, with why:
 *  - a hint (`tier: 'hint'` with `rule` and `hintAt` only): the holder is read from the card's printed trigger;
 *  - a passive effect whose `modify` never touches the old state (`state`, `shared`, `states`, `game`, `entry`): its
 *    holder is `self`, its numbers are the same function of the same point.
 * A file that plays (`play`), waives, restricts or reads the old state is hand work: it is listed as `left`.
 *
 *   npx tsx scripts/migrate-effects.ts [--write] [--kind technology] [--list] [--waivers]
 *
 * With `--waivers` it moves the `waive` of an effect to the `permit` of an ability instead (`convertWaivers`): only the
 * waivers whose `when` reads nothing of the old state beyond the warning, the entry, the pack and the round's primaries.
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
// Waivers: `waive` of an effect on the old state becomes `permit` of an ability on the kernel.

/** What a `when` may read of the old context and still mean the same on the native one: the entry, the pack, the round's primaries. */
const SAME_CONTEXT = new Set(['entry', 'pack', 'primaries', 'had', 'before', 'board', 'my', 'of', 'key', 'playerOf', 'home', 'neighbours', 'commodityValue', 'planetsIn', 'systemOf', 'holder', 'id']);

/** What a `when` asks of the owner's old state before the turn, in the words of the board before it (`ctx.had`, `ctx.before`). */
const BEFORE_READS: [RegExp, string][] = [
  [/Object\.entries\(ctx\.shared\.attachments \?\? \{\}\)\.some\(\(\[planet, cards\]\) => cards\.includes\((\w+)\) && ctx\.before\.control\[planet\] === 'me'\)/g, 'ctx.had.planets().some(planet => planet.attached.includes($1))'],
  [/ctx\.before\.holdings\.leaders\[(\w+)\] === 'unlocked'/g, "ctx.had.card($1) === 'ready'"],
  [/ctx\.before\.holdings\.(?:hand|relics)\.includes\((\w+)\)/g, 'ctx.had.holds($1)'],
  [/ctx\.before\.commodities/g, 'ctx.had.commodities'],
  [/ctx\.before\.control\[([^\]]+)\] === 'me'/g, 'ctx.before.planets[$1]?.owner === ctx.holder'],
];

/** The helpers of `domain/effects/helpers/movement` a `when` called with the old context, and the same question asked of the native one. */
const MAP_READS: [RegExp, string][] = [
  [/\brouteBlockKind\((\w+), ctx\)/g, 'ctx.routeBlockKind($1)'],
  [/\boneShipShort\((\w+), ctx\)/g, 'ctx.oneShipShort($1)'],
  [/\boneShipShort\((\w+), ctx, ([^)]+)\)/g, 'ctx.oneShipShort($1, $2)'],
  [/\bspeedWithoutAnomalies\((\w+), ctx\)/g, 'ctx.speedWithoutAnomalies($1)'],
  [/\bcrossesRift\((\w+), ctx\)/g, 'ctx.crossesRift($1)'],
  [/\bhasAnomaly\(ctx\.game, ([^,]+(?:\([^)]*\))?), ('\w+'), ctx\.pack\)/g, 'ctx.hasAnomaly($1, $2)'],
  [/\bblockedByShips\(ctx, ([^)]+(?:\([^)]*\))?)\)/g, 'ctx.blockedByShips($1)'],
  [/\bothersShipsIn\(ctx, (\w+)\)/g, 'ctx.othersShipsIn($1)'],
  [/\bonlyUnits\((\w+), ctx, (\[[^\]]*\])\)/g, 'ctx.onlyUnits($1, $2)'],
  [/\bshipsOnly\((\w+), ctx\)/g, 'ctx.shipsOnly($1)'],
  [/\bplayerNear\(ctx, ([^,]+), (\w+)\)/g, 'ctx.playerNear($1, $2)'],
  [/\bmecatolSlot\(ctx\.game\)/g, 'ctx.mecatolSlot()'],
];
const MAP_NAMES = ['routeBlockKind', 'oneShipShort', 'speedWithoutAnomalies', 'crossesRift', 'hasAnomaly', 'blockedByShips', 'othersShipsIn', 'onlyUnits', 'shipsOnly', 'playerNear', 'mecatolSlot'];
const MAP_HELPERS = MAP_NAMES;
/** Whether a `when` may read this of the context: it means the same on the native one. */
const allowed = (name: string): boolean => SAME_CONTEXT.has(name) || MAP_NAMES.includes(name);

/** Drops the named imports the text no longer uses, and an import left empty. */
function dropUnusedImports(text: string, names: readonly string[]): string {
  const body = text.replace(/^import [^;]*;\n/gm, '');
  let out = text;
  for (const name of names) {
    if (new RegExp(`(?<![.\\w])${name}\\b`).test(body)) continue;
    out = out.replace(/^(import (?:type )?\{)([^}]*)(\} from [^;]*;\n)/gm, (line, open: string, list: string, close: string) => {
      const all = list.split(',').map(item => item.trim()).filter(item => item !== '');
      const kept = all.filter(item => item !== name);
      if (kept.length === all.length) return line;
      return kept.length === 0 ? '' : `${open} ${kept.join(', ')} ${close}`;
    });
  }
  return out;
}

/** Why a `when` is not a mechanical move (it reads the old state), or undefined when it is. */
function whenProblem(when: ts.Expression, file: ts.SourceFile): string | undefined {
  if (!ts.isArrowFunction(when)) return '`when` is not an arrow function';
  if (when.parameters.some(parameter => parameter.type !== undefined)) return '`when` is typed';
  const second = when.parameters[1];
  if (second === undefined) return undefined;
  if (ts.isObjectBindingPattern(second.name)) {
    const bad = second.name.elements.find(element => element.dotDotDotToken !== undefined || !allowed((element.propertyName ?? element.name).getText(file)));
    return bad ? `\`when\` reads \`${(bad.propertyName ?? bad.name).getText(file)}\`` : undefined;
  }
  const name = second.name.getText(file);
  let problem: string | undefined;
  const visit = (node: ts.Node): void => {
    if (problem) return;
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) {
      if (!allowed(node.name.text)) problem = `\`when\` reads \`${node.name.text}\``;
      return;
    }
    if (ts.isIdentifier(node) && node.text === name) { problem = '`when` uses the whole context'; return; }
    ts.forEachChild(node, visit);
  };
  visit(when.body);
  return problem;
}

/** Converts the waivers of one file: a file that only waives becomes an `Ability`, one that also plays exports both shapes. */
export function convertWaivers(source: string, holderFor: (id: string) => HolderRule): { output: string; holder: string } | { left: string } {
  const crlf = source.includes('\r\n');
  const text = MAP_READS.reduce((made, [from, to]) => made.replace(from, to), BEFORE_READS.reduce((made, [from, to]) => made.replace(from, to), source.replace(/\r\n/g, '\n')));
  const file = ts.createSourceFile('component.ts', text, ts.ScriptTarget.ES2022, true);
  let statement: ts.VariableStatement | undefined;
  let declaration: ts.VariableDeclaration | undefined;
  let id: string | undefined;
  for (const each of file.statements) {
    if (!ts.isVariableStatement(each)) continue;
    for (const item of each.declarationList.declarations) {
      if (!ts.isIdentifier(item.name)) continue;
      if (item.name.text === 'effect') { statement = each; declaration = item; }
      if (item.name.text === 'id' && item.initializer && ts.isStringLiteral(item.initializer)) id = item.initializer.text;
    }
  }
  const init = declaration?.initializer;
  if (!statement || !declaration || !init || !ts.isObjectLiteralExpression(init) || id === undefined) return { left: 'no `effect` object with an `id`' };
  if (declaration.type?.getText(file) !== 'ComponentEffect') return { left: '`effect` is not annotated ComponentEffect' };
  const props = new Map<string, ts.PropertyAssignment>();
  for (const property of init.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) return { left: 'shorthand or computed property' };
    props.set(property.name.text, property);
  }
  const waive = props.get('waive');
  if (!waive) return { left: 'no `waive`' };
  if (!ts.isArrayLiteralExpression(waive.initializer)) return { left: '`waive` is not an array literal' };
  for (const element of waive.initializer.elements) {
    if (!ts.isObjectLiteralExpression(element)) return { left: 'a waiver is not an object literal' };
    for (const property of element.properties) {
      if (!ts.isPropertyAssignment(property)) return { left: 'a waiver has a method or shorthand' };
      if (property.name.getText(file) === 'when') {
        const problem = whenProblem(property.initializer, file);
        if (problem) return { left: problem };
      }
    }
  }
  const holder = props.get('holder')?.initializer.getText(file) ?? `'${holderFor(id)}'`;
  const full = [...props.keys()].every(name => name === 'tier' || name === 'rule' || name === 'waive');
  const imports = file.statements.filter(ts.isImportDeclaration);
  const typed = imports.find(i => i.importClause?.namedBindings && ts.isNamedImports(i.importClause.namedBindings) && i.importClause.namedBindings.elements.some(e => e.name.text === 'ComponentEffect'));
  if (!typed) return { left: 'no import of ComponentEffect' };
  const last = imports[imports.length - 1];
  const edits: { start: number; end: number; text: string }[] = [];
  if (full) {
    let uses = 0;
    const count = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node.text === 'ComponentEffect') uses += 1;
      ts.forEachChild(node, count);
    };
    count(file);
    if (uses !== 2) return { left: 'ComponentEffect is used beyond the annotation and its import' };
    edits.push({ start: declaration.name.getStart(file), end: declaration.type.getEnd(), text: 'ability: Ability' });
    edits.push({ start: init.getStart(file) + 1, end: init.getStart(file) + 1, text: `\n  holder: ${holder},` });
    edits.push({ start: waive.name.getStart(file), end: waive.name.getEnd(), text: 'permit' });
    const names = (typed.importClause!.namedBindings as ts.NamedImports).elements.filter(e => e.name.text !== 'ComponentEffect');
    const addition = "import type { Ability } from '../../../../game/abilities/types';";
    if (names.length === 0) edits.push({ start: typed.getStart(file), end: typed.getEnd(), text: addition });
    else {
      edits.push({ start: typed.getStart(file), end: typed.getEnd(), text: `import ${typed.importClause!.isTypeOnly ? 'type ' : ''}{ ${names.map(n => n.getText(file)).join(', ')} } from ${typed.moduleSpecifier.getText(file)};` });
      edits.push({ start: last.getEnd(), end: last.getEnd(), text: `\n${addition}` });
    }
  } else {
    const cut = (property: ts.PropertyAssignment): void => {
      let start = property.getStart(file);
      while (start > 0 && (text[start - 1] === ' ' || text[start - 1] === '\t')) start -= 1;
      let end = property.getEnd();
      if (text[end] === ',') end += 1;
      if (text[end] === '\n') end += 1;
      edits.push({ start, end, text: '' });
    };
    cut(waive);
    const declared = props.get('holder');
    if (declared) cut(declared);
    edits.push({ start: statement.getEnd(), end: statement.getEnd(), text: `\n\nexport const ability: Hooked = {\n  holder: ${holder},\n  permit: ${waive.initializer.getText(file)},\n};` });
    edits.push({ start: last.getEnd(), end: last.getEnd(), text: "\nimport type { Hooked } from '../../../../game/abilities/types';" });
  }
  let output = text;
  for (const edit of edits.sort((a, b) => b.start - a.start)) output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  output = dropUnusedImports(output, MAP_HELPERS);
  return { output: crlf ? output.replace(/\n/g, '\r\n') : output, holder: holder.replace(/'/g, '') };
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
      const source = readFileSync(path, 'utf8');
      const result = args.includes('--waivers') ? convertWaivers(source, holderFor) : convertFile(source, holderFor);
      if ('left' in result) { left.set(result.left, [...(left.get(result.left) ?? []), path]); continue; }
      converted.push(`${path} (${'tier' in result ? `${result.tier}, ` : ''}${result.holder})`);
      if (write) writeFileSync(path, result.output);
    }
  }
  console.log(`${write ? 'converted' : 'convertible'}: ${converted.length}`);
  for (const [reason, paths] of [...left].sort((a, b) => b[1].length - a[1].length)) console.log(`left ${paths.length}: ${reason}`);
  if (args.includes('--list')) console.log([...converted, ...[...left].flatMap(([r, p]) => p.map(x => `${x}  <- ${r}`))].join('\n'));
}

if (process.argv[1]?.endsWith('migrate-effects.ts')) main();
