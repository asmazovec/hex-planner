import type { DataPack } from '../../../../../domain/types';
import type { Game } from '../../types';
import type { GameState } from '../../types';
import { type CardEntry, type CardMapPick, cardTargetsOver } from '../../../../../domain/replay/cards/targets';

/**
 * `before` is the state just before the card, `latest` the state the map shows (the planets mine and the docks there).
 */
export function cardTargets(game: Game, pack: DataPack, entry: CardEntry, pick: CardMapPick, before: GameState, latest: GameState): string[] {
  return cardTargetsOver({
    map: game, expansions: game.expansions, tokens: before.tokensOnMap,
    fits: (planetId, kind) => (kind === 'dock' ? latest.docks.includes(planetId) : latest.control[planetId] === 'me'),
  }, pack, entry, pick);
}
