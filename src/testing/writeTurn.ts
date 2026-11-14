import type { DataPack } from '../domain/types';
import type { Game } from './old/domain/types';
import type { Table } from '../game/types';
import { writeSaved, type TurnWrite } from '../state/turnBridge';
import { savedFor } from './legacySave';

/** The writer of a turn of the open plan, asked over an old game (a view of the saved game the store holds). */
export const writeTurn = (...[, game, turnId]: [table: Table, game: Game, turnId: string, pack: DataPack]): TurnWrite | undefined => writeSaved(savedFor(game), turnId);
