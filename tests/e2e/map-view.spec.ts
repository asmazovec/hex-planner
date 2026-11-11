import { expect, test, type Page } from '@playwright/test';

const MAP = '78 40 42 67 69 34 39 27 26 65 79 47 32 30 29 73 41 21 0 20 62 0 19 64 0 44 36 0 38 61 0 76 24 0 37 50';
const LINK = `/?name=Steady&map=${MAP.split(' ').join('+')}&factions=sol,arborec,hacan,letnev,saar,muaat&me=1&exp=pok,te`;

interface Shot { viewBox: number[]; transform: string; tile: { x: number; y: number; width: number; height: number } }

/** What the map shows: its frame, the view inside it and where Mecatol Rex stands on screen. */
const shot = (page: Page): Promise<Shot> => page.evaluate(() => {
  const svg = document.querySelector('svg.hexmap')!;
  const box = document.querySelector('svg.hexmap [data-slot="0,0"]')!.getBoundingClientRect();
  return {
    viewBox: svg.getAttribute('viewBox')!.split(' ').map(Number),
    transform: svg.querySelector(':scope > g')!.getAttribute('transform')!,
    tile: { x: box.x, y: box.y, width: box.width, height: box.height },
  };
});

/** The view is the one the map opened on, to a pixel; asked again until the drawers have come to rest. */
async function expectSame(page: Page, first: Shot, step: string): Promise<void> {
  await expect.poll(async () => {
    const now = await shot(page);
    return Math.max(...(['x', 'y', 'width', 'height'] as const).map(side => Math.abs(now.tile[side] - first.tile[side])));
  }, { message: step }).toBeLessThanOrEqual(1);
  // Long enough for a drawer to slide and for the camera to follow, if anything had sent it anywhere.
  await page.waitForTimeout(900);
  const now = await shot(page);
  for (const side of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(now.tile[side] - first.tile[side]), `${step}: ${side} of Mecatol Rex`).toBeLessThanOrEqual(1);
  now.viewBox.forEach((value, i) => expect(Math.abs(value - first.viewBox[i]), `${step}: viewBox`).toBeLessThanOrEqual(1));
  expect(now.transform, step).toBe(first.transform);
}

const tabs = (page: Page) => page.getByRole('group', { name: 'Drawers' });

async function openPlan(page: Page): Promise<Shot> {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto(LINK);
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await expect(page.locator('svg.hexmap [data-slot="0,0"]')).toBeVisible();
  await page.waitForTimeout(900);
  const first = await shot(page);
  // The map opens whole in its area.
  const area = (await page.locator('.hexmap-wrap').boundingBox())!;
  const edges = await page.evaluate(() => [...document.querySelectorAll('svg.hexmap [data-slot]')].map(tile => {
    const box = tile.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  }));
  expect(Math.min(...edges.map(e => e.left))).toBeGreaterThanOrEqual(area.x);
  expect(Math.max(...edges.map(e => e.right))).toBeLessThanOrEqual(area.x + area.width);
  expect(Math.min(...edges.map(e => e.top))).toBeGreaterThanOrEqual(area.y);
  expect(Math.max(...edges.map(e => e.bottom))).toBeLessThanOrEqual(area.y + area.height);
  return first;
}

test('the fan of the components opens, changes its group and folds without moving the map', async ({ page }) => {
  const first = await openPlan(page);
  await tabs(page).getByRole('button', { name: /^Components/ }).click();
  await expect(page.getByRole('dialog', { name: 'Components' })).toBeVisible();
  await expectSame(page, first, 'the fan is open');
  await tabs(page).getByRole('button', { name: /^Faction/ }).click();
  await expectSame(page, first, 'another group');
  await tabs(page).getByRole('button', { name: /^Relics/ }).click();
  await expectSame(page, first, 'a third group');
  await tabs(page).getByRole('button', { name: /^Relics/ }).click();
  await expect(page.getByRole('dialog', { name: 'Components' })).toHaveCount(0);
  await expectSame(page, first, 'the fan is folded');
});

test("the drawer of Thunder's Edge and the left drawers open and close without moving the map", async ({ page }) => {
  const first = await openPlan(page);
  const te = tabs(page).getByRole('button', { name: /slices|Thunder/i });
  await te.click();
  await expectSame(page, first, "Thunder's Edge is open");
  await te.click();
  await expectSame(page, first, "Thunder's Edge is closed");
  for (const name of ['Players', 'Legend']) {
    await tabs(page).getByRole('button', { name }).click();
    await expectSame(page, first, `${name} is open`);
    await tabs(page).getByRole('button', { name }).click();
    await expectSame(page, first, `${name} is closed`);
  }
});

test('a view the player has set stays through the fan of the components', async ({ page }) => {
  await openPlan(page);
  const area = (await page.locator('.hexmap-wrap').boundingBox())!;
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(900);
  const mine = await shot(page);
  await tabs(page).getByRole('button', { name: /^Components/ }).click();
  await expectSame(page, mine, 'the fan is open');
  await tabs(page).getByRole('button', { name: /^Faction/ }).click();
  await expectSame(page, mine, 'another group');
  await tabs(page).getByRole('button', { name: /^Faction/ }).click();
  await expectSame(page, mine, 'the fan is folded');
});
