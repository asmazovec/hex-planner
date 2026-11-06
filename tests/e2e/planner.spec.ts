import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

/** The map string of the user's draft: seat 1 holds tile 58, the home of the Argent Flight. */
const MAP_STRING = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const entry = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const actions = (page: Page) => page.getByRole('region', { name: 'Actions' }).getByRole('listitem');

/** The map glides after a tap on the active system; wait until the element stops before a drag aims at it. */
async function centreWhenStill(target: Locator): Promise<{ x: number; y: number }> {
  let last = '';
  await expect.poll(async () => {
    const now = JSON.stringify(await target.boundingBox());
    const still = now === last;
    last = now;
    return still;
  }, { intervals: [150] }).toBe(true);
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** One pointer drags a route hex by hex, as a finger does. */
async function dragRoute(page: Page, hexes: number[]): Promise<void> {
  const points = [];
  for (const n of hexes) points.push(await centreWhenStill(tile(page, n)));
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.mouse.up();
}

test('a game from the first screen to an exported file, and back offline', async ({ page, context }, testInfo) => {
  await page.addInitScript(() => {
    // Set once: the language survives the reloads below, the test changes it at the end.
    if (localStorage.getItem('ti4.lang') === null) localStorage.setItem('ti4.lang', 'en');
  });
  await page.goto('/');
  const summary = (name: string) => page.getByRole('group', { name, exact: true });

  await test.step('the precache is small and leaves the prototype pages out', async () => {
    const sw = await (await page.request.get('/sw.js')).text();
    expect(sw).not.toMatch(/approved|docs\//);
    expect(sw.match(/url:"/g)?.length ?? 0).toBeLessThan(20);
  });

  await test.step("start a game with Prophecy of Kings and Thunder's Edge", async () => {
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
    await page.getByLabel('My faction').selectOption({ label: 'The Argent Flight' });
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
  });

  await test.step('paste the map string', async () => {
    await page.getByRole('button', { name: 'Paste map' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP_STRING);
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('30 tiles placed.')).toBeVisible();
    await expect(page.getByText('Home systems placed: 6.')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    // The map starts in the builder; leave it.
    await page.getByRole('button', { name: 'Build map' }).click();
    await expect(tile(page, 66)).toBeVisible();
  });

  await test.step('set an infantry on Horizon to pick up later', async () => {
    await tile(page, 110).click();
    await page.getByRole('button', { name: 'Infantry' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(entry(page, 'Setup · 110')).toBeVisible();
  });

  await test.step('plan a tactical action with a route and a pickup', async () => {
    await page.getByRole('button', { name: 'Add action' }).click();
    await page.getByRole('button', { name: 'Tactical action' }).click();
    await tile(page, 66).click();
    await expect(page.getByText('Active system: 66')).toBeVisible();
    await dragRoute(page, [58, 110, 66]);
    await expect(page.getByText('Flight 58 → 66')).toBeVisible();
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await page.getByRole('group', { name: 'Horizon' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await expect(page.getByRole('heading', { name: 'Cargo on board: 1 of 4' })).toBeVisible();
    await page.getByRole('button', { name: 'Fly' }).click();
    await page.getByRole('button', { name: 'Add one Infantry' }).click();
    await page.getByRole('button', { name: 'Done editing' }).click();
    await expect(entry(page, 'Tactical action · 66')).toBeVisible();
  });

  await test.step('tap the entry to read it, the pencil to edit it', async () => {
    await entry(page, 'Tactical action · 66').click();
    await expect(page.getByText('Fly 58 → 110 → 66')).toBeVisible();
    await expect(page.getByText('Pick up on the way in 110')).toBeVisible();
    await expect(page.getByText("Land on Hope's End")).toBeVisible();
    await page.getByRole('button', { name: 'Edit: Tactical action · 66' }).click();
    await expect(page.getByRole('group', { name: "Landing on Hope's End" })).toBeVisible();
    await page.getByRole('button', { name: 'Remove one Infantry' }).click();
    await page.getByRole('button', { name: 'Add one Infantry' }).click();
    await page.getByRole('button', { name: 'Done editing' }).click();
    await page.getByRole('listitem', { name: 'Tactical action · 66' }).getByRole('checkbox', { name: 'Done' }).check();
    await expect(summary('Tactic')).toContainText('2');
  });

  await test.step('add a status entry with points', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await page.getByRole('button', { name: 'Tactic: 0' }).click();
    await page.getByRole('button', { name: 'Add one Argent' }).click();
    await expect(summary('VP')).toContainText('1');
  });

  await test.step('open the stage and buy a unit', async () => {
    await tile(page, 58).click();
    await page.getByRole('button', { name: 'Build', exact: true }).click();
    await page.getByRole('button', { name: 'Destroyer', exact: true }).click();
    await expect(page.getByText('Bought: 1')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
  });

  await test.step('play a strategy card', async () => {
    // First tap makes the card the backup, the second the main one.
    await page.getByRole('button', { name: '5 Trade' }).click();
    await page.getByRole('button', { name: '5 Trade' }).click();
    await page.getByRole('button', { name: 'Add action' }).click();
    await page.getByRole('button', { name: 'Strategic action' }).click();
    await expect(page.getByRole('button', { name: '5 Trade' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(summary('Trade goods')).toContainText('3');
  });

  // Setup, tactical action, purchase and strategy card in the action phase, one status entry.
  const entryCount = await actions(page).count();
  expect(entryCount).toBe(4);

  await test.step('reload with the service worker offline', async () => {
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    // The first reload lets the worker take control of the page.
    await page.reload();
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
    await context.setOffline(true);
    // Prove the network is down: only the worker's cache can answer the reload.
    expect(await page.evaluate(() => fetch('/not-cached.txt').then(() => 'online', () => 'offline'))).toBe('offline');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Players' })).toBeVisible();
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 66)).toBeVisible();
    await expect(actions(page)).toHaveCount(entryCount);
    await expect(page.getByRole('img', { name: 'Carrier ×1' }).first()).toBeVisible();
    await context.setOffline(false);
  });

  await test.step('export the game and import it back', async () => {
    await page.getByRole('button', { name: 'Game' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export to file' }).click();
    const file = testInfo.outputPath('game.json');
    await (await download).saveAs(file);
    const exported = JSON.parse(readFileSync(file, 'utf8')) as { faction: string; plans: { rounds: { entries: unknown[] }[] }[] };
    expect(exported.faction).toBe('argent');
    expect(exported.plans[0].rounds[0].entries).toHaveLength(entryCount + 1);

    await page.locator('input[type=file]').setInputFiles({ name: 'game.json', mimeType: 'application/json', buffer: readFileSync(file) });
    await expect(page.getByRole('button', { name: 'Open' })).toHaveCount(2);
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(actions(page)).toHaveCount(entryCount);
  });

  await test.step('a language choice sticks across a reload', async () => {
    await page.getByRole('button', { name: 'Game' }).click();
    await page.getByRole('radio', { name: 'Русский' }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Партия' })).toBeVisible();
  });
});

test('a faction whose home is not on the pasted map starts at its seat and can send a route', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');
  await page.getByLabel('My faction').selectOption({ label: 'The Federation of Sol' });
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await page.getByRole('button', { name: 'Paste map' }).click();
  await page.getByLabel('Milty Draft map string').fill(MAP_STRING);
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Build map' }).click();

  // The seat keeps its number and holds the start units although tile 58 is another faction's home.
  await expect(tile(page, 58).getByRole('img', { name: 'Seat 1' })).toBeVisible();
  await expect(tile(page, 58).getByRole('img', { name: 'Carrier ×2' })).toBeVisible();

  await page.getByRole('button', { name: 'Add action' }).click();
  await page.getByRole('button', { name: 'Tactical action' }).click();
  await tile(page, 66).click();
  await dragRoute(page, [58, 110, 66]);
  await expect(page.getByText('Flight 58 → 66')).toBeVisible();

  await page.getByRole('button', { name: 'Game' }).click();
  await expect(page.getByText('Seat 1 holds the home system of The Argent Flight, and your faction is The Federation of Sol.')).toBeVisible();
});
