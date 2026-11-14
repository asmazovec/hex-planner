import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SavedGame } from '../../game/save';
import { requestPersistence } from '../../storage/db';
import { RowIcon } from '../primitives/Icon';
import { EXPORTED_EVENT } from './download';
import { lastExport } from './preferences';

const DAY = 24 * 60 * 60 * 1000;
/** With persistent storage the browser keeps the games, so a week between exports is fine. Without it a day is. */
const MAX_AGE = { persisted: 7 * DAY, volatile: DAY };

export function shouldRemindExport(input: { persisted: boolean; lastExportAt: number | null; now: number }): boolean {
  if (input.lastExportAt === null) return true;
  return input.now - input.lastExportAt >= (input.persisted ? MAX_AGE.persisted : MAX_AGE.volatile);
}

/** The export button of the menu. It asks the browser to keep the data, and is marked when a new file is due, with the reason in its name. */
export function ExportReminder({ game, onExport }: { game: SavedGame | null; onExport: () => void }) {
  const { t } = useTranslation();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [lastExportAt, setLastExportAt] = useState(lastExport.read);
  /** The time the app was opened: a long session does not need a fresher reading. */
  const [now] = useState(Date.now);
  const hasGame = game !== null;

  useEffect(() => {
    if (!hasGame) return;
    let live = true;
    void requestPersistence().then(ok => live && setPersisted(ok));
    return () => { live = false; };
  }, [hasGame]);

  useEffect(() => {
    const update = () => setLastExportAt(lastExport.read());
    window.addEventListener(EXPORTED_EVENT, update);
    return () => window.removeEventListener(EXPORTED_EVENT, update);
  }, []);

  if (!hasGame) return null;
  const due = persisted !== null && shouldRemindExport({ persisted, lastExportAt, now });
  const reason = !persisted ? 'banner.exportVolatile' : lastExportAt === null ? 'banner.exportNever' : 'banner.exportStale';
  const label = due ? `${t('banner.export')}. ${t(reason)}` : t('banner.export');

  return (
    <button type="button" className={`hex-button nav-export${due ? ' nav-export-due' : ''}`} aria-label={label} title={label} onClick={onExport}>
      <RowIcon name="export" />
    </button>
  );
}
