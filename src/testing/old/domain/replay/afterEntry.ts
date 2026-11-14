import type { Entry } from '../../../../domain/types';

/** What an entry chose for the components it plays, by the names their effects ask for: a component's `choices`, an agenda's outcome and election. */
export const choicesOf = (entry: Entry): Record<string, string | number> =>
  ('choices' in entry ? entry.choices : undefined) ?? {};
