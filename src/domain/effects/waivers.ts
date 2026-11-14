/**
 * What an entry plays: its component action, what it spends, what it names in `uses`, the objectives a status entry
 * scores. The waivers themselves are the permits of the components, asked on the kernel (`game/resolve/waive.ts`).
 */
import type { TurnFacts } from '../../game/turnFacts';

/** The components an entry plays, each once: its component action, what it spends, what it uses. */
export function playedBy(entry: TurnFacts): string[] {
  const ids = [
    ...(entry.type === 'component' && entry.componentId !== undefined ? [entry.componentId] : []), ...(entry.spends ?? []), ...(entry.uses ?? []),
    // The objectives a status entry scores are played by it (61.5), and the agenda an entry of the agenda phase resolves is played by that entry.
    ...(entry.type === 'statusTokens' ? entry.scored ?? [] : []),
    ...(entry.phase === 'agenda' ? (entry.gains ?? []).filter(id => id.startsWith('agenda:')) : []),
  ];
  return ids.filter((id, index) => ids.indexOf(id) === index);
}
