import type { Game } from '../../domain/types';
import { exportGame } from '../../storage/transfer';

/** Saves the game as a JSON file through a Blob. */
export function downloadGame(game: Game): void {
  const url = URL.createObjectURL(new Blob([exportGame(game)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `ti4-${game.id}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
