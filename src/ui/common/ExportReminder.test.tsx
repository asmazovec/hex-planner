import 'fake-indexeddb/auto';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { setLanguage } from '../../i18n';
import { sampleGame } from '../../storage/fixture';
import { EXPORTED_EVENT, LAST_EXPORT_KEY } from './download';
import { ExportReminder, shouldRemindExport } from './ExportReminder';

const DAY = 24 * 60 * 60 * 1000;
const now = 10 * 365 * DAY;

const persistence = (ok: boolean) => Object.defineProperty(navigator, 'storage', { value: { persist: async () => ok }, configurable: true });

beforeEach(() => { setLanguage('en'); localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('reminds when storage is not persistent and nothing was exported lately', () => {
  expect(shouldRemindExport({ persisted: false, lastExportAt: null, now })).toBe(true);
  expect(shouldRemindExport({ persisted: false, lastExportAt: now - 2 * DAY, now })).toBe(true);
});

test('reminds when the last export is seven days old or there was none', () => {
  expect(shouldRemindExport({ persisted: true, lastExportAt: null, now })).toBe(true);
  expect(shouldRemindExport({ persisted: true, lastExportAt: now - 7 * DAY, now })).toBe(true);
  expect(shouldRemindExport({ persisted: true, lastExportAt: now - 6 * DAY, now })).toBe(false);
});

test('an export just now hides the reminder in both cases', () => {
  expect(shouldRemindExport({ persisted: false, lastExportAt: now, now })).toBe(false);
  expect(shouldRemindExport({ persisted: true, lastExportAt: now, now })).toBe(false);
});

test('the banner shows for an open game, exports on the button and then goes away', async () => {
  persistence(true);
  const exported = vi.fn(() => {
    localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
    window.dispatchEvent(new Event(EXPORTED_EVENT));
  });
  render(<ExportReminder game={sampleGame()} onExport={exported} />);
  const button = await screen.findByRole('button', { name: 'Export' });
  await userEvent.click(button);
  expect(exported).toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Export' })).toBeNull();
  expect(Number(localStorage.getItem(LAST_EXPORT_KEY))).toBeGreaterThan(0);
});

test('the banner stays hidden after a recent export and with no game', async () => {
  persistence(true);
  localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
  render(<ExportReminder game={sampleGame()} onExport={() => {}} />);
  await act(async () => {});
  expect(screen.queryByRole('status')).toBeNull();
  cleanup();
  localStorage.clear();
  render(<ExportReminder game={null} onExport={() => {}} />);
  await act(async () => {});
  expect(screen.queryByRole('status')).toBeNull();
});
