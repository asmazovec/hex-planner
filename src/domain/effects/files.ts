/**
 * The file of a component under `src/domain/effects/components`, without its extension: the kind is the folder, the
 * source id the name, less what a file name cannot hold (`promissory:<color>_ta` is `promissory/color_ta`). Its test
 * is `<that>.test.ts`, its test of the interface `<that>.ui.test.tsx`. Kept apart from the registry, which collects
 * the files with the bundler: a script reads this alone.
 */
export function fileOf(id: string): string {
  const colon = id.indexOf(':');
  return `${id.slice(0, colon)}/${id.slice(colon + 1).replace(/[^A-Za-z0-9_-]+/g, '')}`;
}
