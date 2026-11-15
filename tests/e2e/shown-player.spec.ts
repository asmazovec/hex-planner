import { expect, test, type Page } from '@playwright/test';

/**
 * The shown player of the plan screen at 1180×820: the switch and the totals pinned at the top of the plan panel, with
 * eight players too; the list, the totals and the accent colour following the switch.
 * With `SHOTS=<folder>` the screens are saved there.
 */

const EIGHT = '/?name=Eight&factions=argent,sol,hacan,letnev,saar,muaat,naalu,yssaril&me=1&exp=pok';
const SHOTS = process.env.SHOTS;
/** The colours of the players in the theme, by their number. */
const COLOURS = ['#7fb2ff', '#e8c56a', '#ea7f76', '#74d09a', '#b89bf5', '#f0a463', '#62cdd3', '#d98bc2'];

const pinned = (page: Page) => page.locator('.plan-pinned');
const whose = (page: Page) => page.getByRole('group', { name: 'Shown player' });
const accent = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());

async function open(page: Page, link: string): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto(link);
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await expect(pinned(page)).toBeVisible();
}

test('with eight players the switch stands on one line and the totals in two, inside the panel, and both stay while the panel scrolls', async ({ page }) => {
  await open(page, EIGHT);
  const buttons = whose(page).getByRole('button');
  await expect(buttons).toHaveCount(8);
  const boxes = await buttons.evaluateAll(list => list.map(el => { const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, clipped: el.scrollWidth > el.clientWidth + 1 }; }));
  const panel = (await page.locator('.plan-panel').boundingBox())!;
  expect(new Set(boxes.map(b => Math.round(b.top))).size).toBe(1);
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(panel.x);
    expect(box.right).toBeLessThanOrEqual(panel.x + panel.width);
    // A tag of three letters is not cut by its cell.
    expect(box.clipped).toBe(false);
  }
  const cells = await page.locator('.plan-pinned .summary-cell').evaluateAll(list => list.map(el => { const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, clipped: el.scrollWidth > el.clientWidth + 1 }; }));
  expect(cells).toHaveLength(8);
  expect(new Set(cells.map(c => Math.round(c.top))).size).toBe(2);
  for (const cell of cells) {
    expect(cell.left).toBeGreaterThanOrEqual(panel.x);
    expect(cell.right).toBeLessThanOrEqual(panel.x + panel.width);
    expect(cell.clipped).toBe(false);
  }
  // The panel is as wide as it was: nothing in the pinned head pushes it out.
  expect(await page.locator('.plan-panel').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/shown-eight.png` });

  // The list scrolls under the pinned head: scrolled to its end, the head is where it was.
  // The status entry opens its fields in the list: now the list is longer than the panel.
  await page.locator('section.phase > button', { hasText: 'Tokens and points' }).click();
  const before = (await pinned(page).boundingBox())!;
  const scroll = page.locator('.plan-scroll');
  expect(await scroll.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
  expect(await scroll.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  const after = (await pinned(page).boundingBox())!;
  expect(after).toEqual(before);
  await expect(whose(page)).toBeInViewport();
  // In an editor too: the head stays over it.
  await scroll.evaluate(el => { el.scrollTop = 0; });
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.locator('.action-list').getByRole('button', { name: 'Component action', exact: true }).click();
  await page.getByRole('button', { name: 'Close' }).click();
  expect((await pinned(page).boundingBox())!).toEqual(before);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/shown-editor.png` });
});

test('the accent is the colour of the shown player, text on its fills reads, and without a game it is the blue of the theme', async ({ page }) => {
  await open(page, EIGHT);
  expect(await accent(page)).toBe(COLOURS[0]);
  const names = ['Argent', 'Sol', 'Hacan', 'Letnev', 'Saar', 'Muaat', 'Naalu', 'Yssaril'];
  for (const [index, name] of names.entries()) {
    await whose(page).getByRole('button', { name, exact: true }).click();
    await expect(whose(page).getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(await accent(page)).toBe(COLOURS[index]);
    // The solid button of the panel: its ink against its fill, as the page paints them.
    const contrast = await page.locator('.map-mode button[aria-pressed="true"]').first().evaluate(() => {
      const probe = document.createElement('button');
      probe.className = 'primary';
      probe.textContent = 'x';
      document.body.append(probe);
      const style = getComputedStyle(probe);
      const lum = (rgb: string) => {
        const [r, g, b] = rgb.match(/\d+/g)!.slice(0, 3).map(v => { const c = Number(v) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const [a, b] = [lum(style.color), lum(style.backgroundColor)].sort((x, y) => y - x);
      probe.remove();
      return (a + 0.05) / (b + 0.05);
    });
    expect(contrast, name).toBeGreaterThanOrEqual(4.5);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/accent-${index + 1}-${name}.png` });
  }
  // The menu outside the plan screen wears it too, and a closed game gives the theme its blue back.
  await page.getByRole('button', { name: 'Game', exact: true }).click();
  expect(await accent(page)).toBe(COLOURS[7]);
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await expect.poll(() => accent(page)).toBe(COLOURS[0]);
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--accent'))).toBe('');
});
