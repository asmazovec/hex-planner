import { expect, test, type Page } from '@playwright/test';

/**
 * What leads to a warning is told apart before it is pressed: on the map a system whose choice would warn has a dashed
 * edge, in a draft of units a button whose press would warn is dashed and dimmed. Both still take the press, and the
 * warning then stands in its block. The look is read by shape (a dashed line), whatever the accent colour is.
 */

/** Seat 1 holds tile 58, the home of the Argent Flight; 110 lies between it and 66. */
const MAP = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';
const LINK = `/?name=Options&map=${MAP.split(' ').join('+')}&factions=argent,sol,hacan,letnev,saar,muaat&me=1&exp=pok,te`;
const SHOTS = process.env.SHOTS;
const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const dashOf = (page: Page, n: number) => tile(page, n).locator('.hex').evaluate(el => getComputedStyle(el).strokeDasharray);
const codes = (page: Page) => page.locator('.plan-panel .warning-list li').evaluateAll(items => items.map(li => li.getAttribute('data-code')));

async function open(page: Page) {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto(LINK);
  await page.getByRole('button', { name: 'Plan & map' }).click();
}
async function addTactical(page: Page) {
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.locator('.action-list').getByRole('button', { name: 'Tactical action', exact: true }).click();
}

test('the map: a system that already holds the token is dashed while the active system is chosen, and still takes the tap', async ({ page }) => {
  await open(page);
  await addTactical(page);
  // Nothing is marked yet: no system would warn.
  expect(await dashOf(page, 110)).toBe('none');
  await tile(page, 110).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await addTactical(page);
  await expect(tile(page, 110)).toHaveClass(/tile-warned/);
  expect(await dashOf(page, 110)).not.toBe('none');
  expect(await dashOf(page, 22)).toBe('none');
  await expect(tile(page, 110).locator('title')).toContainText('already holds');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/options-map-system.png` });
  await tile(page, 110).click();
  expect(await codes(page)).toContain('systemHasToken');
});

test('the map: the source under the token is dashed, a clean source is lit; a route marks what it cannot enter', async ({ page }) => {
  await open(page);
  // The first action stands on the home system, so its ships are under a command token.
  await addTactical(page);
  await tile(page, 58).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await addTactical(page);
  await tile(page, 110).click();
  await page.getByRole('button', { name: 'Add source' }).click();
  await expect(tile(page, 58)).toHaveClass(/tile-warned/);
  expect(await dashOf(page, 58)).not.toBe('none');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/options-map-source.png` });
  await tile(page, 58).click();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/options-map-route.png` });
  await tile(page, 110).click();
  expect(await codes(page)).toContain('sourceActivated');
});

test('a draft of units: a button whose press would warn is dashed, still takes the press, and the warning stands in its block', async ({ page }) => {
  await open(page);
  await addTactical(page);
  await tile(page, 110).click();
  await page.getByRole('button', { name: 'Add source' }).click();
  await tile(page, 58).click();
  await tile(page, 110).click();
  const picker = page.locator('.unit-picker');
  const take = (unit: string) => picker.getByRole('button', { name: `Take one ${unit}`, exact: true }).first();
  const border = (unit: string) => take(unit).evaluate(el => getComputedStyle(el).borderTopStyle);
  // With no ship taken, what rides on board has nothing to carry it; a ship itself is clean.
  expect(await border('Infantry')).toBe('dashed');
  expect(await border('Carrier')).toBe('solid');
  await expect(take('Infantry')).toHaveAttribute('title', /capacity|carry|board/i);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/options-draft-before.png` });
  // The marked button stays where it was and takes the press.
  const before = await take('Infantry').boundingBox();
  await take('Infantry').click();
  expect(await take('Infantry').boundingBox()).toEqual(before);
  expect(await codes(page)).toContain('capacityGroup');
  await take('Carrier').click();
  expect(await codes(page)).not.toContain('capacityGroup');
  expect(await border('Infantry')).toBe('solid');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/options-draft-after.png` });
});
