import type { SavedGame } from '../../game/save';
import { exportGame } from '../../storage/transfer';
import { lastExport } from './preferences';

export const EXPORTED_EVENT = 'ti4:exported';

/** Remembers when a file copy was made, so the reminder can stay quiet for a while. */
function markExported(): void {
  lastExport.write(Date.now());
  window.dispatchEvent(new Event(EXPORTED_EVENT));
}

function saveFile(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking at once can cancel the download in some browsers, Safari among them.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Saves the game as a JSON file through a Blob. */
export function downloadGame(saved: SavedGame): void {
  saveFile(`ti4-${saved.id}.json`, exportGame(saved));
  markExported();
}

/** A save that does not open, as it lies in storage: not a copy of a game, so the backup reminder stays as it was. */
export function downloadRaw(id: string, data: unknown): void {
  saveFile(`ti4-${id}-raw.json`, JSON.stringify(data, null, 2) ?? 'null');
}
