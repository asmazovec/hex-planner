/** The round (LRR 40): its phases in order, and the entries that only mark the flow of the round. */
import { componentById } from '../components';
import type { DataPack } from '../types';
import type { TurnFacts } from '../../game/turnFacts';

/** An action card played in a window of its own ("After ...", "When ..."): not a component action, so no turn (2.6, 40.2). */
const inWindow = (pack: DataPack | undefined, id: string): boolean => {
  const def = pack ? componentById(pack, id) : undefined;
  return def?.kind === 'agenda' || (def?.kind === 'actionCard' && def.detail?.window !== 'Action');
};

/** An action card headed "Action" is a component action (2.6.1): named by a secondary, the secondary is a turn of the action phase. */
const actsAsAction = (pack: DataPack | undefined, id: string): boolean => {
  const def = pack ? componentById(pack, id) : undefined;
  return def?.kind === 'actionCard' && def.detail?.window === 'Action';
};

/**
 * The entries that are a turn of the action phase (LRR 3.1): a pass ends the player's turns. A component entry for a
 * card played in a window of its own is no turn (2.6); a secondary that plays an "Action" card (Strategize) is one.
 */
export const isTurn = (entry: TurnFacts, pack?: DataPack): boolean => {
  if (entry.type === 'component') return entry.componentId === undefined || !inWindow(pack, entry.componentId);
  if (entry.type === 'secondary') return [...(entry.spends ?? []), ...(entry.uses ?? [])].some(id => actsAsAction(pack, id));
  return entry.type === 'tactical' || entry.type === 'strategic' || entry.type === 'pass';
};
