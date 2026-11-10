import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('a corrupt save is listed with its message, can be exported and deleted, and the other saves still open', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');
  const row = (name: string) => page.locator('.saved-list li', { has: page.locator('strong', { hasText: name }) });

  await test.step('a good game is saved', async () => {
    await page.getByRole('button', { name: 'My faction', exact: true }).click();
    await page.getByRole('button', { name: 'The Federation of Sol' }).click();
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'New game' }).click();
    await expect(row('The Federation of Sol')).toBeVisible();
  });

  await test.step('a corrupt save is written into the browser database', async () => {
    await page.evaluate(() => new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('ti4-planner', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('games', { keyPath: 'id' });
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction('games', 'readwrite');
        tx.objectStore('games').put({
          id: 'broken', name: 'Damaged', faction: 'sol', playerCount: 4, updatedAt: Date.now() + 1000,
          game: { id: 'broken', format: 'ti4-planner/2', schemaVersion: 1, plans: 'not a list' },
        });
        tx.oncomplete = () => { open.result.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    }));
    await page.reload();
  });

  await test.step('it is listed with the message and nothing else breaks', async () => {
    await expect(row('Damaged').getByText('The save could not be loaded')).toBeVisible();
    await expect(row('Damaged').getByRole('button', { name: 'Open' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible();
  });

  await test.step('its raw data goes to a file', async () => {
    const download = page.waitForEvent('download');
    await row('Damaged').getByRole('button', { name: 'Export data' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('ti4-broken-raw.json');
    const saved = JSON.parse(readFileSync(await file.path(), 'utf8'));
    expect(saved).toMatchObject({ id: 'broken', name: 'Damaged', game: { plans: 'not a list' } });
  });

  await test.step('the good game still opens', async () => {
    await row('The Federation of Sol').getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(page.locator('main')).toHaveAttribute('data-screen', 'plan');
    await page.getByRole('button', { name: 'Game', exact: true }).click();
  });

  await test.step('the corrupt save goes only after the confirmation, and stays gone after a reload', async () => {
    await row('Damaged').getByRole('button', { name: 'Delete game' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(row('Damaged')).toBeVisible();
    await row('Damaged').getByRole('button', { name: 'Delete game' }).click();
    await page.getByRole('button', { name: 'Delete for good' }).click();
    await expect(row('Damaged')).toHaveCount(0);
    await page.reload();
    await expect(row('The Federation of Sol')).toBeVisible();
    await expect(row('Damaged')).toHaveCount(0);
  });
});
