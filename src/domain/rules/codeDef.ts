/**
 * A warning code in a file of its own. The core codes stand in `WARNING_CODES` (types.ts) and `RULES` (registry.ts);
 * a new one is a file `src/domain/rules/codes/<code>.ts` whose default export is `defineCode('<code>', …)`: its LRR
 * points, its step and its two texts. Nothing else is edited: `codes.ts` collects the files, the rule registry reads
 * them, and the interface takes the texts from them at startup.
 */
import type { ExtensionCode, RuleStep } from '../types';

export interface CodeDef {
  code: ExtensionCode;
  /** LRR points, the main one first, numbered as in the rules tests' names. */
  rules: string[];
  /** The step that checks it: it decides the block of the editor the warning stands in (`STEP_PLACES`). */
  step: RuleStep;
  /** The text of the warning in both languages, with `{{param}}` for its params as in src/i18n; game terms per the official rules. */
  text: { ru: string; en: string };
}

/** Declares a code; `name` is also the name of the file. */
export const defineCode = (name: string, def: Omit<CodeDef, 'code'>): CodeDef => ({ code: name as ExtensionCode, ...def });
