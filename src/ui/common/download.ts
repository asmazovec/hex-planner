import type { Game } from '../../domain/types';
import { exportGame } from '../../storage/transfer';

export const LAST_EXPORT_KEY = 'ti4.lastExportAt';
export const EXPORTED_EVENT = 'ti4:exported';

/** Remembers when a file copy was made, so the reminder can stay quiet for a while. */
function markExported(): void {
  try { localStorage.setItem(LAST_EXPORT_KEY, String(Date.now())); } catch { /* the reminder returns on the next visit */ }
  window.dispatchEvent(new Event(EXPORTED_EVENT));
}

/** Saves the game as a JSON file through a Blob. */
export function downloadGame(game: Game): void {
  const url = URL.createObjectURL(new Blob([exportGame(game)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `ti4-${game.id}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking at once can cancel the download in some browsers, Safari among them.
  markExported();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
