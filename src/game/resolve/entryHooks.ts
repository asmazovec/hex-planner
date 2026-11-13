/**
 * The hooks that follow an entry or a planet gained, run on the kernel's runner (`hooks.ts`): the components the entry
 * gained or let go (`gained`, `lost`), the checks the components in force add (`restrict`), and what a planet taken
 * brings (`onGainControl`). Nothing here knows a component by name.
 */
import { componentById } from '../../domain/components';
import { breakthroughOf } from '../../domain/effects/breakthrough';
import { choicesFor } from '../../domain/effects/choices';
import { effectOf, orderOf } from '../../domain/effects/registry';
import { playedBy } from '../../domain/effects/waivers';
import { anyInForce, inForce } from '../abilities/registry';
import type { HookPayloads } from '../abilities/types';
import type { Ctx } from './context';
import { hook } from './hooks';

/** The hooks of the components the entry gained or lost, and the checks the components in force add after it. */
export function gainHooks(ctx: Ctx): void {
  const { entry, table, board, pack, player } = ctx;
  const known = (ids: string[] | undefined): string[] => (ids ?? []).filter(id => componentById(pack, id) !== undefined);
  // The breakthrough of another faction is not gained by the owner: nothing it says when gained runs.
  const faction = table.players.find(p => p.id === player)?.faction ?? '';
  const gainable = (id: string): boolean => !id.startsWith('breakthrough:') || id === breakthroughOf(pack, faction);
  for (const id of known(entry.gains).filter(gainable)) if (effectOf(pack, id)?.on?.gained) hook(ctx, 'gained', [player], {}, { only: [id], choices: choicesFor(entry, id) });
  for (const id of known(entry.spends)) if (effectOf(pack, id)?.on?.lost) hook(ctx, 'lost', [player], {}, { only: [id], choices: choicesFor(entry, id) });
  const restricts = (id: string): boolean => effectOf(pack, id)?.on?.restrict !== undefined;
  const touched = Object.values(board.planets).some(p => p.attached.length > 0);
  if (!touched && !anyInForce(table, board, pack, e => e.on?.restrict !== undefined, [])) return;
  const forced = inForce(table, board, pack, player).filter(restricts);
  // A card attached to a planet (an exploration card) is in force for that planet, whoever the entry's owner is.
  const attached = new Set(Object.values(board.planets).flatMap(p => p.attached));
  const ids = [...forced, ...[...attached].filter(id => !forced.includes(id) && restricts(id))];
  for (const id of ids) hook(ctx, 'restrict', [player], {}, { only: [id], choices: choicesFor(entry, id) });
}

/** The components hooked on a planet gained, once it is the player's: the passive ones in force, and the play ones the entry names. */
export function controlHooks(ctx: Ctx, payload: HookPayloads['onGainControl']): void {
  const { table, board, pack, player, entry } = ctx;
  const has = (id: string): boolean => effectOf(pack, id)?.on?.onGainControl !== undefined;
  const named = [...playedBy(entry), ...(entry.gains ?? [])].filter(id => effectOf(pack, id)?.tier === 'play' && has(id));
  if (named.length === 0 && !anyInForce(table, board, pack, e => e.on?.onGainControl !== undefined)) return;
  const ids = [...new Set([...inForce(table, board, pack, player).filter(id => effectOf(pack, id)?.tier === 'passive' && has(id)), ...named])];
  ids.sort((a, b) => orderOf(pack, a) - orderOf(pack, b));
  hook(ctx, 'onGainControl', [player], payload, { only: ids, choices: (entry as { choices?: Record<string, string | number> }).choices ?? {} });
}
