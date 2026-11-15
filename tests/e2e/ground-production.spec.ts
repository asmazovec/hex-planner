import { expect, test, type Page } from '@playwright/test';

/**
 * Ground forces produced by a tactical action stand as pictures in the tray of the planet's row they were bought in, as
 * ships do in the row of the space area: on a planet of the player, and on one the player does not control, where the
 * replay does not place them (67.4.1) and the hex shows them in the space area.
 */

/** Seat 1 holds tile 58, the home of the Argent Flight; 110 holds El'Nath, Horizon and Luthien VI, nobody's. */
const MAP = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';
const LINK = `/?name=Ground&map=${MAP.split(' ').join('+')}&factions=argent,sol,hacan,letnev,saar,muaat&me=1&exp=pok,te`;
const SHOTS = process.env.SHOTS;
const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });

for (const [system, planet] of [[58, 'Avar'], [110, 'Horizon']] as const) {
  test(`infantry and mechs bought on ${planet} are drawn in the tray of its row`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
    await page.goto(LINK);
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await page.getByRole('button', { name: 'Add action' }).click();
    await page.locator('.action-list').getByRole('button', { name: 'Tactical action', exact: true }).click();
    await tile(page, system).click();
    await page.getByRole('button', { name: /^Production/ }).click();
    const row = page.locator('.stage-dialog').getByRole('group', { name: planet, exact: true });
    const tray = row.getByRole('group', { name: 'Bought' });
    for (const unit of ['Infantry', 'Mech']) {
      await row.getByRole('button', { name: `${unit}, ${planet}`, exact: true }).click();
      const chip = tray.getByRole('button', { name: `Give back ${unit}, ${planet}`, exact: true });
      await expect(chip).toBeVisible();
      await expect(chip).toContainText('×1');
      const picture = await chip.locator('svg').first().boundingBox();
      expect(picture && picture.width > 20 && picture.height > 20).toBe(true);
    }
    const space = page.locator('.stage-dialog').getByRole('group', { name: 'Space', exact: true });
    await space.getByRole('button', { name: 'Carrier', exact: true }).click();
    await expect(space.getByRole('group', { name: 'Bought' }).getByRole('button', { name: 'Give back Carrier', exact: true })).toContainText('×1');
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/ground-${planet}.png` });
    // Taken back from the row it was bought in.
    await tray.getByRole('button', { name: `Give back Mech, ${planet}`, exact: true }).click();
    await expect(tray.getByRole('button', { name: `Give back Mech, ${planet}`, exact: true })).toHaveCount(0);
  });
}
