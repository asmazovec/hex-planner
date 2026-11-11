import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The draft of units (`UnitDraft`) fits where it stands at 1180×820: every cell lies inside its panel, the panel does
 * not scroll sideways, the buttons of a row stand on one line, and the tray stands either beside them on that line or
 * under them in the same columns. A faction with every unit type is taken: Prophecy of Kings and Thunder's Edge are on.
 * With `UNIT_DRAFT_SHOTS=<name>` the screens are saved to docs/phase3/unit-draft/<name>-*.png.
 */

/** Seat 1 holds tile 58, the home of the Argent Flight; 110 lies between it and 66. */
const MAP = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';
const LINK = `/?name=Draft&map=${MAP.split(' ').join('+')}&factions=argent,sol,hacan,letnev,saar,muaat&me=1&exp=pok,te`;
const SHOTS = process.env.UNIT_DRAFT_SHOTS;

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const stage = (page: Page) => page.locator('.stage-dialog');
const stagePanel = (page: Page) => page.locator('.stage-panel');

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS) await page.screenshot({ path: `docs/phase3/unit-draft/${SHOTS}-${name}.png` });
}

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

async function addTactical(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.locator('.action-list').getByRole('button', { name: 'Tactical action', exact: true }).click();
}

/** What is wrong with the drafts inside a box, in words; nothing when every one of them fits and stands in lines. */
async function untidy(box: Locator): Promise<string[]> {
  return box.evaluate(el => {
    const said: string[] = [];
    const near = (a: number, b: number) => Math.abs(a - b) <= 1;
    const style = getComputedStyle(el);
    const outer = el.getBoundingClientRect();
    const inner = {
      left: outer.left + parseFloat(style.paddingLeft) - 1, right: outer.left + el.clientWidth - parseFloat(style.paddingRight) + 1,
    };
    if (el.scrollWidth > el.clientWidth) said.push(`the panel scrolls sideways: ${el.scrollWidth} > ${el.clientWidth}`);
    const rows = [...el.querySelectorAll<HTMLElement>('.draft-row')];
    if (rows.length === 0) said.push('no draft in the panel');
    for (const row of rows) {
      const name = row.getAttribute('aria-label') ?? '?';
      const rect = row.getBoundingClientRect();
      const stock = [...row.querySelectorAll<HTMLElement>('.draft-take')].map(c => c.getBoundingClientRect());
      const tray = [...row.querySelectorAll<HTMLElement>('.draft-tray > *')].map(c => c.getBoundingClientRect());
      for (const cell of [...stock, ...tray, ...[...row.querySelectorAll('.draft-place')].map(c => c.getBoundingClientRect())]) {
        if (cell.left < inner.left || cell.right > inner.right) said.push(`${name}: a cell leaves the panel (${Math.round(cell.left)}..${Math.round(cell.right)})`);
        if (cell.left < rect.left - 1 || cell.right > rect.right + 1) said.push(`${name}: a cell leaves its row`);
      }
      if (stock.some(c => c.width < 44 || c.height < 44)) said.push(`${name}: a button is smaller than 44 px`);
      if (!stock.every(c => near(c.top, stock[0].top))) said.push(`${name}: the buttons wrap to another line`);
      if (!tray.every(c => near(c.top, tray[0].top))) said.push(`${name}: the tray wraps to another line`);
      if (stock.length !== tray.length) said.push(`${name}: ${stock.length} buttons, ${tray.length} places of the tray`);
      const beside = near(tray[0].top, stock[0].top);
      const under = tray[0].top >= stock[0].bottom && tray.every((c, i) => stock[i] && near(c.left, stock[i].left) && near(c.width, stock[i].width));
      if (!beside && !under) said.push(`${name}: the tray is neither beside the buttons nor under them in their columns`);
    }
    return said;
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto(LINK);
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await expect(tile(page, 66)).toBeVisible();
});

test('the shop of the big hex fits its panel with every unit type, empty and with everything bought', async ({ page }) => {
  await tile(page, 58).click();
  await stage(page).getByRole('button', { name: 'Create', exact: true }).click();
  await expect(stagePanel(page).locator('.draft-row').first()).toBeVisible();
  // A flagship, a war sun and mechs are all there.
  for (const unit of ['Flagship', 'War Sun', 'Mech, Avar']) await expect(stage(page).getByRole('button', { name: unit, exact: true })).toBeVisible();
  await shot(page, 'shop-empty');
  expect(await untidy(stagePanel(page))).toEqual([]);
  // The hex stays usable beside a wider panel.
  const hex = await stage(page).getByRole('group', { name: 'Big hex' }).boundingBox();
  expect(hex!.width).toBeGreaterThanOrEqual(440);
  const dialog = await stage(page).boundingBox();
  expect(dialog!.x).toBeGreaterThanOrEqual(0);
  expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(1180);

  const takes = stagePanel(page).locator('.draft-take');
  const before = await takes.evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return `${Math.round(r.x)},${Math.round(r.y + el.closest('.stage-panel')!.scrollTop)}`; }));
  // A second space dock on a planet is blocked for a reason of its own: such a button is passed by.
  for (let i = 0; i < await takes.count(); i += 1) for (let n = 0; n < 3; n += 1) if (await takes.nth(i).isEnabled()) await takes.nth(i).click();
  // Warnings and a full tray move no button.
  const after = await takes.evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return `${Math.round(r.x)},${Math.round(r.y + el.closest('.stage-panel')!.scrollTop)}`; }));
  expect(after).toEqual(before);
  await stagePanel(page).evaluate(el => el.scrollTo(0, 0));
  await shot(page, 'shop-full');
  expect(await untidy(stagePanel(page))).toEqual([]);
});

test('the production of a tactical action fits the panel of the big hex', async ({ page }) => {
  await addTactical(page);
  await tapTile(page, 58);
  await panel(page).getByRole('button', { name: /^Production/ }).click();
  await expect(stagePanel(page).locator('.draft-row').first()).toBeVisible();
  for (const unit of ['Destroyer', 'Fighter', 'Carrier', 'War Sun', 'Flagship']) await stage(page).getByRole('button', { name: unit, exact: true }).click();
  await shot(page, 'production');
  expect(await untidy(stagePanel(page))).toEqual([]);
});

test('the ships removed beyond the fleet pool fit the panel of the big hex', async ({ page }) => {
  await tile(page, 58).click();
  await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
  for (const unit of ['Cruiser', 'Cruiser', 'Dreadnought', 'Flagship', 'War Sun', 'Fighter']) await stage(page).getByRole('button', { name: unit, exact: true }).click();
  await stage(page).getByRole('button', { name: 'Close' }).click();
  await addTactical(page);
  await tapTile(page, 66);
  await tapTile(page, 58);
  await tapTile(page, 110);
  await tapTile(page, 66);
  const ships = panel(page).locator('.unit-picker');
  for (const unit of ['Carrier', 'Destroyer', 'Destroyer', 'Cruiser', 'Cruiser', 'Dreadnought', 'Flagship', 'War Sun']) await ships.getByRole('button', { name: `Take one ${unit}` }).first().click();
  // The flight itself, in the panel of the plan.
  await shot(page, 'flight');
  expect(await untidy(ships)).toEqual([]);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await panel(page).getByRole('button', { name: /^Excess ships/ }).click();
  await expect(stagePanel(page).locator('.draft-row').first()).toBeVisible();
  await stage(page).getByRole('button', { name: 'Remove one Cruiser' }).click();
  await shot(page, 'fleet');
  expect(await untidy(stagePanel(page))).toEqual([]);
});

test('the landing on three planets fits the panel of the plan', async ({ page }) => {
  await tile(page, 58).click();
  await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
  for (const unit of ['Mech', 'Mech', 'Infantry']) await stage(page).getByRole('button', { name: unit, exact: true }).click();
  await stage(page).getByRole('button', { name: 'Close' }).click();
  await addTactical(page);
  await tapTile(page, 110);
  await tapTile(page, 58);
  await tapTile(page, 110);
  const ships = panel(page).locator('.unit-picker');
  await ships.getByRole('button', { name: 'Take one Carrier' }).first().click();
  for (const unit of ['Infantry', 'Mech']) await ships.getByRole('button', { name: `Take one ${unit}` }).first().click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  const landing = panel(page).locator('.landing');
  await expect(landing.locator('.draft-row')).toHaveCount(3);
  await landing.getByRole('button', { name: 'Land one Mech' }).first().click();
  await shot(page, 'landing');
  expect(await untidy(landing)).toEqual([]);
});
