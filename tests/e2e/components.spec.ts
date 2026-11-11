import { expect, test, type Page } from '@playwright/test';

const MAP = '78 40 42 67 69 34 39 27 26 65 79 47 32 30 29 73 41 21 0 20 62 0 19 64 0 44 36 0 38 61 0 76 24 0 37 50';
const LINK = `/?name=Relics&map=${MAP.split(' ').join('+')}&factions=sol,arborec,hacan,letnev,saar,muaat&me=1&exp=pok`;

const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const relics = (page: Page) => drawer(page).getByRole('group', { name: 'Relics' });
/** A tab of the fan the stack of the components opens into. */
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });

/** The drawer of the plan screen, opened by its tab. */
async function openDrawer(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Components/ }).click();
  await expect(drawer(page)).toBeVisible();
}

test('a relic found with a typo is added in the components drawer and is still there after a reload', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto(LINK);
  await expect(page.getByRole('textbox', { name: 'Game name' })).toHaveValue('Relics');
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await openDrawer(page);

  // What the game starts with is listed, and nothing is held of the relics yet.
  await expect(drawer(page).getByRole('group', { name: 'Researched technologies' })).toContainText('Neural Motivator');
  await groupTab(page, 'Relics').click();
  await expect(relics(page)).toHaveText(/none$/);

  await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('stelar convertr');
  const results = drawer(page).getByRole('group', { name: 'Search results' });
  await results.getByRole('button', { name: 'Add Stellar Converter' }).click();
  await expect(results.getByRole('button', { name: 'Remove Stellar Converter' })).toBeVisible();

  // The cross of the field brings the group back, the relic in it, and its tab counts it.
  await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
  await expect(relics(page)).toContainText('Stellar Converter');
  await expect(groupTab(page, 'Relics · 1')).toHaveAttribute('aria-pressed', 'true');

  // The printed text opens in place and the drawer stays inside the screen.
  await relics(page).getByRole('button', { name: /^Stellar Converter/ }).click();
  await expect(relics(page)).toContainText('ACTION');
  const box = (await drawer(page).boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(1180);

  // A page loaded again opens the game of the address on the screen it was left on: the plan, its drawer closed.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Plan & map' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('textbox', { name: 'Game name' })).toHaveCount(0);
  // Sol begins with two technologies, its agent, five generic promissory notes and its own; the relic is one more.
  await expect(page.getByRole('button', { name: 'Components · 10' })).toBeVisible();
  // The stack opens on the group it was left on.
  await openDrawer(page);
  await expect(relics(page)).toContainText('Stellar Converter');
});

test('in Russian one search line finds a component by its kind and faction, by its colour, and by words of its text with a typo', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'ru'));
  await page.goto(LINK);
  await page.getByRole('button', { name: 'План и карта' }).click();
  await page.getByRole('button', { name: /^Компоненты/ }).click();
  const panel = page.getByRole('dialog', { name: 'Компоненты' });
  const search = panel.getByRole('searchbox', { name: 'Поиск компонентов' });
  await expect(search).toHaveAttribute('placeholder', 'Название, тип, фракция, текст');
  const cards = panel.getByRole('group', { name: 'Найдено' }).locator('.component-card');

  // The kind and the faction, the faction typed as it sounds: the one agent of Hacan.
  await search.fill('агент хакан');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Carth of Golden Sands');
  // The colour of a technology, «е» for «ё».
  await search.fill('зеленая технология');
  await expect(cards.first()).toContainText('Технология');
  await expect(panel.getByRole('group', { name: 'Найдено' })).toContainText('Neural Motivator');
  // Words of the Russian text in another order and with typos.
  await search.fill('астеройдов поля передвигатся');
  await expect(cards.first()).toContainText('Antimass Deflectors');
  // Nothing matches every word.
  await search.fill('агент хакан ъъъъъъ');
  await expect(panel).toContainText('Ничего не найдено.');
});

test('the numbers of a unit card stand in one line, at either level and in either language', async ({ page }) => {
  for (const lang of ['ru', 'en']) {
    await page.addInitScript(value => localStorage.setItem('ti4.lang', value), lang);
    await page.goto(LINK.replace('Relics', `Units-${lang}`));
    await page.locator('.app-rail button').nth(1).click();
    await page.locator('.tab-fan > button').first().click();
    const cards = page.locator('.components-panel .upgrade-card');
    await expect(cards.first()).toBeVisible();
    for (const card of await cards.all()) if (await card.isEnabled()) await card.click();
    // Four numbers per card, all on the line of the first.
    const lines = await page.locator('.components-panel .ship-stat-line').evaluateAll(all => all.map(line => [...line.children].map(cell => Math.round(cell.getBoundingClientRect().top))));
    expect(lines.length).toBeGreaterThan(5);
    for (const tops of lines) expect(tops, lang).toEqual([tops[0], tops[0], tops[0], tops[0]]);
    // Nothing of a card reaches past the sheet.
    const sheet = (await page.locator('.components-panel').boundingBox())!;
    for (const box of await cards.evaluateAll(all => all.map(card => card.getBoundingClientRect().right))) expect(box).toBeLessThanOrEqual(sheet.x + sheet.width);
  }
});
