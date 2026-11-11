import { expect, test, type Page } from '@playwright/test';

/**
 * A warning forbids nothing: what is taken beyond a limit is still what the action does. Cargo taken beyond the ships'
 * capacity and beyond what stands at the source rides on board, is counted by every number of the flight, arrives and
 * can be landed; the warnings are the only consequence.
 */

const MAP = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';
const LINK = `/?name=OverLimit&map=${MAP.split(' ').join('+')}&factions=argent,sol,hacan,letnev,saar,muaat&me=1&exp=pok,te`;
const HOME = 'Avar / Valk / Ylir';

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');

/** A tap on a system of the map once the map stands still: it glides after a tap on the active system. */
async function tapTile(page: Page, n: number): Promise<void> {
  let last = '';
  await expect.poll(async () => {
    const now = JSON.stringify(await tile(page, n).boundingBox());
    const still = now === last;
    last = now;
    return still;
  }, { intervals: [150] }).toBe(true);
  await tile(page, n).click();
}

test('cargo taken beyond the capacity and beyond the stock rides on board, counts in the flight and its result, and lands', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto(LINK);
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.locator('.action-list').getByRole('button', { name: 'Tactical action', exact: true }).click();
  await tapTile(page, 66);
  await expect(page.getByText("Active system: Hope's End")).toBeVisible();
  await tapTile(page, 58);
  await tapTile(page, 110);
  await tapTile(page, 66);
  await expect(page.getByText(`Flight ${HOME} → Hope's End`)).toBeVisible();

  // One carrier holds four; the Argent Flight starts with five infantry. All five and two more that are not there.
  const ships = panel(page).locator('.unit-picker');
  await ships.getByRole('button', { name: 'Take one Carrier' }).first().click();
  const infantry = ships.getByRole('button', { name: 'Take one Infantry' }).first();
  const stock = Number((await infantry.locator('i').innerText()).replace(/\D/g, ''));
  expect(stock).toBe(5);
  const taken = stock + 2;
  for (let i = 0; i < taken; i += 1) await infantry.click();
  await expect(infantry.locator('.draft-over')).toHaveText('+2');
  await expect(ships.getByRole('button', { name: 'Return one Infantry' })).toContainText(`×${taken}`);
  // Everything taken is cargo on board, and both limits only warn.
  await expect(ships.getByText(`Cargo on board: ${taken} of 4`)).toBeVisible();
  await expect(ships.getByText(new RegExp(`^Group from .* is over capacity: ${taken} of 4`))).toBeVisible();
  await expect(ships.getByText(/is missing 2 × Infantry/)).toBeVisible();
  await page.getByRole('button', { name: 'Fly' }).click();

  // The line of the source counts the same cargo, and the warnings stand in the editor.
  await expect(panel(page).getByRole('button', { name: new RegExp(`^${HOME} via .*cargo ${taken}`) })).toBeVisible();
  await expect(panel(page).getByText(new RegExp(`^Group from .* is over capacity: ${taken} of 4`))).toBeVisible();

  // All of it arrived, so all of it lands with no warning of the landing.
  const landing = panel(page).getByRole('group', { name: "Landing on Hope's End" });
  const land = landing.getByRole('button', { name: 'Land one Infantry' });
  for (let i = 0; i < taken; i += 1) await land.click();
  await expect(landing.getByRole('button', { name: 'Give back Infantry' })).toContainText(`×${taken}`);
  await expect(land.locator('.draft-over')).toHaveCount(0);
  await expect(panel(page).getByText(/Landing needs/)).toHaveCount(0);

  // The plan reads the same numbers, and the map of the forecast holds what landed.
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: /^Tactical action · Hope's End/ }).click();
  await expect(panel(page).getByText(`Cargo ${taken} of 4`, { exact: false })).toBeVisible();
  await expect(panel(page).getByText("Land on Hope's End")).toBeVisible();
  await expect(panel(page).getByText(/Landing needs/)).toHaveCount(0);
  // With the details closed the flight no longer replays, and the tiles hold the end of the round.
  await page.getByRole('button', { name: /^Tactical action · Hope's End/ }).click();
  await expect(panel(page).getByText("Land on Hope's End")).toHaveCount(0);
  await expect(tile(page, 66).locator('[data-unit="infantry"]')).toContainText(String(taken));
  await expect(tile(page, 58).locator('[data-unit="infantry"]')).toHaveCount(0);
});
