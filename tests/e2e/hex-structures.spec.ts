import { expect, test, type Page } from '@playwright/test';

/**
 * A structure built on the big hex stands on its planet there, as a bought unit does: built by hand in «Create», and by
 * the Construction card, on a planet of the player and on one nobody controls (the plan warns, 24.2, and what was
 * entered is still placed).
 */

/** Seat 1 holds tile 58, the home of the Argent Flight; 22 holds Tequ'ran and Torkan, nobody's. */
const MAP = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';
const LINK = `/?name=Structures&map=${MAP.split(' ').join('+')}&factions=argent,sol,hacan,letnev,saar,muaat&me=1&exp=pok`;
const SHOTS = process.env.SHOTS;
const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const open = async (page: Page) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto(LINK);
  await page.getByRole('button', { name: 'Plan & map' }).click();
};
/** A structure of player one drawn on the hex of the stage. */
const drawn = (page: Page, kind: 'pds' | 'spacedock') => page.locator(`.stage-hex [data-stack^="p1|${kind}|"]`);

for (const system of [58, 22]) {
  test(`built by hand in Create on tile ${system}, a PDS and a space dock stand on the hex`, async ({ page }) => {
    await open(page);
    await tile(page, system).click();
    const stage = page.locator('.stage-dialog');
    await stage.getByRole('button', { name: 'Create', exact: true }).click();
    await stage.getByRole('button', { name: /^PDS/ }).first().click();
        await expect(drawn(page, 'pds').first()).toBeVisible();
    if (system === 22) {
      await stage.getByRole('button', { name: /^Space dock/ }).first().click();
      await expect(drawn(page, 'spacedock').first()).toBeVisible();
    }
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/structures-hand-${system}.png` });
  });

  test(`built by the Construction card on tile ${system}, a PDS and a space dock stand on the hex`, async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Add action' }).click();
    await page.locator('.action-list').getByRole('button', { name: 'Strategy', exact: true }).click();
    await page.getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: /Construction/ }).click();
    await page.getByRole('group', { name: 'Card mode' }).getByRole('button', { name: /^Primary/ }).click();
    await page.locator('.strategy-editor button.option', { hasText: 'Construction' }).first().click();
    await tile(page, system).click();
    const stage = page.locator('.stage-dialog');
    await stage.getByRole('button', { name: /^PDS/ }).first().click();
    await expect(drawn(page, 'pds').first()).toBeVisible();
    if (system === 22) {
      await stage.getByRole('button', { name: /^Space dock/ }).first().click();
      await expect(drawn(page, 'spacedock').first()).toBeVisible();
    }
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/structures-card-${system}.png` });
  });
}
