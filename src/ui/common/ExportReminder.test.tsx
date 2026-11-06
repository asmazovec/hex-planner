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

test('the button of an open game says a file is due, exports, and then stops saying so', async () => {
  persistence(true);
  const exported = vi.fn(() => {
    localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
    window.dispatchEvent(new Event(EXPORTED_EVENT));
  });
  render(<ExportReminder game={sampleGame()} onExport={exported} />);
  const button = await screen.findByRole('button', { name: /^Export\. / });
  expect(button).toHaveClass('nav-export-due');
  await userEvent.click(button);
  expect(exported).toHaveBeenCalled();
  expect(button).not.toHaveClass('nav-export-due');
  expect(button).toHaveAccessibleName('Export');
  expect(Number(localStorage.getItem(LAST_EXPORT_KEY))).toBeGreaterThan(0);
});

test('after a recent export the button is plain, and with no game there is none', async () => {
  persistence(true);
  localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()));
  render(<ExportReminder game={sampleGame()} onExport={() => {}} />);
  await act(async () => {});
  expect(screen.getByRole('button', { name: 'Export' })).not.toHaveClass('nav-export-due');
  cleanup();
  localStorage.clear();
  render(<ExportReminder game={null} onExport={() => {}} />);
  await act(async () => {});
  expect(screen.queryByRole('button')).toBeNull();
});

test('with persistent storage and no copy yet, the text says there is none', async () => {
  persistence(true);
  render(<ExportReminder game={sampleGame()} onExport={() => {}} />);
  expect(await screen.findByRole('button', { name: /no file copy/ })).toBeVisible();
  expect(screen.queryByRole('button', { name: /week old/ })).toBeNull();
});

test('with persistent storage and an old copy, the text says it is over a week old', async () => {
  persistence(true);
  localStorage.setItem(LAST_EXPORT_KEY, String(Date.now() - 8 * DAY));
  render(<ExportReminder game={sampleGame()} onExport={() => {}} />);
  expect(await screen.findByRole('button', { name: /week old/ })).toBeVisible();
});
