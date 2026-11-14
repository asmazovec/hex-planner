import { type GameState, type Warning } from '../../../domain/types';

export type Projection = { state: GameState; warningsByEntry: Record<string, Warning[]> };
