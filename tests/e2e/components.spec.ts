import { expect, test, type Page } from '@playwright/test';

const MAP = '78 40 42 67 69 34 39 27 26 65 79 47 32 30 29 73 41 21 0 20 62 0 19 64 0 44 36 0 38 61 0 76 24 0 37 50';
const LINK = `/?name=Relics&map=${MAP.split(' ').join('+')}&factions=sol,arborec,hacan,letnev,saar,muaat&me=1&exp=pok`;

const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const relics = (page: Page) => drawer(page).getByRole('group', { name: 'Relics' });

/** The plan screen with the drawer open; after a reload the game of the address is open again. */
async function openDrawer(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await page.getByRole('button', { name: /^Components/ }).click();
  await expect(drawer(page)).toBeVisible();
}

test('a relic found with a typo is added in the components drawer and is still there after a reload', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto(LINK);
  await expect(page.getByRole('textbox', { name: 'Game name' })).toHaveValue('Relics');
  await openDrawer(page);

  // What the game starts with is listed, and nothing is held of the relics yet.
  await expect(drawer(page).getByRole('group', { name: 'Technologies' })).toContainText('Neural Motivator');
  await expect(relics(page)).toHaveText(/none$/);

  await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('stelar convertr');
  const results = drawer(page).getByRole('group', { name: 'Search results' });
  await results.getByRole('button', { name: 'Add Stellar Converter' }).click();
  await expect(results.getByRole('button', { name: 'Remove Stellar Converter' })).toBeVisible();

  // The cross of the field brings the sections back, the relic among them, and the tab counts it.
  await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
  await expect(relics(page)).toContainText('Stellar Converter');
  await expect(page.getByRole('button', { name: 'Components · 3' })).toBeVisible();

  // The printed text opens in place and the drawer stays inside the screen.
  await relics(page).getByRole('button', { name: /^Stellar Converter/ }).click();
  await expect(relics(page)).toContainText('ACTION');
  const box = (await drawer(page).boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(1180);

  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Game name' })).toHaveValue('Relics');
  await openDrawer(page);
  await expect(relics(page)).toContainText('Stellar Converter');
});
