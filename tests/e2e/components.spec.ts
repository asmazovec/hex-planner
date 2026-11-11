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

test('the fan of tabs rides on the map-side edge of the open sheet, a change of the group moves no tab, and a card opens its details in place', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto(LINK.replace('Relics', 'Fan'));
  await page.getByRole('button', { name: 'Plan & map' }).click();
  const tabs = page.locator('.tab-fan > button');
  const boxes = () => tabs.evaluateAll(all => all.map(tab => { const box = tab.getBoundingClientRect(); return [Math.round(box.left), Math.round(box.top), Math.round(box.right)]; }));
  /** The tabs once they have come to rest: no transition nor animation of the page still runs. */
  const settled = async () => {
    await page.waitForTimeout(50);
    await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running'));
    return boxes();
  };
  const stack = (await settled())[0];
  await openDrawer(page);
  const open = await settled();
  const sheet = (await page.locator('.drawer-under').boundingBox())!;
  // Every tab hangs on the outer edge of the sheet, over its blue line, one under another; the open group is first, at the height of the stack.
  for (const [, , right] of open) expect(Math.abs(right - (sheet.x + 2))).toBeLessThanOrEqual(1);
  expect(open[0][1]).toBe(stack[1]);
  expect(open[0][0]).toBeLessThan(stack[0] - 300);
  expect(open.map(box => box[1])).toEqual([...open.map(box => box[1])].sort((a, b) => a - b));
  // The sheet reaches the panel of the plan: no strip is kept for tabs at its base.
  const map = (await page.locator('.plan-map').boundingBox())!;
  expect(Math.round(sheet.x + sheet.width)).toBe(Math.round(map.x + map.width));

  // Another group, and another: the same tabs at the same places.
  for (const name of ['Cards', 'Relics', 'Technologies']) {
    await groupTab(page, new RegExp(`^${name}`)).click();
    await expect(groupTab(page, new RegExp(`^${name}`))).toHaveAttribute('aria-pressed', 'true');
    expect(await boxes()).toEqual(open);
  }

  // A card opens its details inside its own frame, and its head stays under the finger.
  const card = drawer(page).getByTestId('component-technology:amd');
  const head = card.getByRole('button', { name: /^Antimass Deflectors/ });
  await expect(head.getByRole('img', { name: 'Propulsion' })).toBeVisible();
  const before = (await head.boundingBox())!;
  const folded = (await card.boundingBox())!;
  await head.click();
  const text = card.locator('.component-text');
  await expect(text).toBeVisible();
  expect(await head.boundingBox()).toEqual(before);
  const frame = (await card.boundingBox())!;
  const details = (await text.boundingBox())!;
  expect(frame.height).toBeGreaterThan(folded.height);
  expect(details.y).toBeGreaterThanOrEqual(before.y + before.height - 1);
  expect(details.x).toBeGreaterThanOrEqual(frame.x);
  expect(details.y + details.height).toBeLessThanOrEqual(frame.y + frame.height);
  expect(details.x + details.width).toBeLessThanOrEqual(frame.x + frame.width);
  await head.click();
  await expect(text).toHaveCount(0);
  expect(await head.boundingBox()).toEqual(before);

  // A press at the point of the open tab folds the fan and closes the sheet; the stack is back where it was.
  const [left, top] = open[0];
  await page.mouse.click(left + 17, top + 60);
  await expect(drawer(page)).toHaveCount(0);
  expect((await settled())[0]).toEqual(stack);
});
