import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Game } from '../../domain/types';
import { requestPersistence } from '../../storage/db';
import { Banner } from './Banner';
import { EXPORTED_EVENT, LAST_EXPORT_KEY } from './download';

const DAY = 24 * 60 * 60 * 1000;
/** With persistent storage the browser keeps the games, so a week between exports is fine. Without it a day is. */
const MAX_AGE = { persisted: 7 * DAY, volatile: DAY };

export function shouldRemindExport(input: { persisted: boolean; lastExportAt: number | null; now: number }): boolean {
  if (input.lastExportAt === null) return true;
  return input.now - input.lastExportAt >= (input.persisted ? MAX_AGE.persisted : MAX_AGE.volatile);
}

function readLastExport(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_EXPORT_KEY));
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Asks the browser to keep the data, and reminds the player to save a file while that is not certain. */
export function ExportReminder({ game, onExport }: { game: Game | null; onExport: () => void }) {
  const { t } = useTranslation();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [lastExportAt, setLastExportAt] = useState(readLastExport);
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
    const update = () => setLastExportAt(readLastExport());
    window.addEventListener(EXPORTED_EVENT, update);
    return () => window.removeEventListener(EXPORTED_EVENT, update);
  }, []);

  if (!hasGame || persisted === null) return null;
  if (!shouldRemindExport({ persisted, lastExportAt, now })) return null;

  return (
    <Banner
      kind="info"
      message={t(!persisted ? 'banner.exportVolatile' : lastExportAt === null ? 'banner.exportNever' : 'banner.exportStale')}
      action={{ label: t('banner.export'), onClick: onExport }}
    />
  );
}
