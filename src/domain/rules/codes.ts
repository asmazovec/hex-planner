/** The warning codes declared in files of their own (see codeDef.ts), collected so that adding one edits no shared file. */
import type { CodeDef } from './codeDef';

const files = import.meta.glob<CodeDef>(['./codes/*.ts', '!./codes/*.test.ts'], { import: 'default', eager: true });

/** The file a code is declared in, as the collector sees it. */
export const codeFile = (code: string): string => `./codes/${code}.ts`;

/** Every code of the files by its file path, for the contract test. */
export const CODE_FILES: Readonly<Record<string, CodeDef>> = files;

/** The codes of the files, by code. */
export const EXTENSION_CODES: ReadonlyMap<string, CodeDef> = new Map(Object.values(files).map(def => [def.code as string, def]));
