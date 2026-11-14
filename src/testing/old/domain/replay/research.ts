import type { DataPack, Game, GameState } from '../../../../domain/types';
import { componentById } from '../../../../domain/components';
import { researchTokensOf } from '../../../../domain/replay/research';

/** The tokens the technologies of an entry give instead of being researched, for the card's free tokens. */
export const researchTokensGiven = (pack: DataPack, game: Pick<Game, 'faction'>, state: GameState, shared: GameState, ids: readonly string[] | undefined): number =>
  (ids ?? []).filter(id => componentById(pack, id)?.kind === 'technology')
    .reduce((sum, id) => sum + researchTokensOf(pack, game, state, shared, id), 0);
