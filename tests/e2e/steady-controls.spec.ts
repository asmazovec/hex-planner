import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * A control that is pressed again and again must not move from the press: the finger stays where it is and the next
 * press lands on the same control. Every repeatable control of the app is pressed here at one fixed point.
 * A new repeatable control is added to this file.
 */

/** Seat 1 holds tile 58, the home of the Argent Flight; 110 lies between it and 66. */
const MAP = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';
const LINK = `/?name=Steady&map=${MAP.split(' ').join('+')}&factions=argent,sol,hacan,letnev,saar,muaat&me=1&exp=pok,te`;
const HOME = 'Avar / Valk / Ylir';
const HORIZON = "El'Nath / Horizon / Luthien VI";

/** What a finger can press. */
const CONTROL = 'button, [role="button"], [role="tab"], label.icon-button, summary';
/** A control may tremble by this much, in pixels; more is a control that ran away. */
const TOLERANCE = 1;

interface Point { x: number; y: number }

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const stage = (page: Page) => page.locator('.stage-dialog');
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });

/** The layout has settled: two frames have passed, and no transition or animation that ends is still running. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolve => {
    const start = performance.now();
    const frame = (left: number) => requestAnimationFrame(() => {
      const moving = document.getAnimations().some(a => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime));
      if (left > 0) frame(left - 1);
      else if (moving && performance.now() - start < 2000) frame(0);
      else resolve();
    });
    frame(1);
  }));
}

/** The name of the control under a point, as a screen reader says it; null where no control lies. */
async function controlAt(page: Page, point: Point): Promise<string | null> {
  return page.evaluate(([at, selector]) => {
    const hit = document.elementFromPoint(at.x, at.y)?.closest(selector);
    if (!hit) return null;
    return hit.getAttribute('aria-label') ?? hit.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }, [point, CONTROL] as const);
}

async function centreOf(page: Page, control: Locator): Promise<{ point: Point; box: { x: number; y: number; width: number; height: number } }> {
  await control.scrollIntoViewIfNeeded();
  await settle(page);
  const box = await control.boundingBox();
  if (!box) throw new Error('The control is not on the screen.');
  return { point: { x: box.x + box.width / 2, y: box.y + box.height / 2 }, box };
}

/**
 * Presses a control `times` times at one and the same point, the centre of where it first stood. After every press the
 * same control must still lie under that point, and it must not have moved by more than a pixel. A control that only
 * grew or shrank at one edge has not moved: its other edge is where it was.
 */
async function pressRepeatedly(page: Page, control: Locator, times: number): Promise<void> {
  const { point, box } = await centreOf(page, control);
  const name = (await controlAt(page, point)) ?? 'a control';
  for (let press = 1; press <= times; press += 1) {
    await page.mouse.click(point.x, point.y);
    await settle(page);
    const under = (await controlAt(page, point)) ?? 'no control';
    if (await control.count() !== 1) {
      throw new Error(`«${name}» is gone after press ${press} of ${times}; under the finger now: «${under}».`);
    }
    const now = await control.evaluate((el, [at, selector]) => {
      const rect = el.getBoundingClientRect();
      return { same: document.elementFromPoint(at.x, at.y)?.closest(selector) === el, x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom };
    }, [point, CONTROL] as const);
    const least = (a: number, b: number) => (Math.abs(a) < Math.abs(b) ? a : b);
    const dx = least(now.x - box.x, now.right - (box.x + box.width));
    const dy = least(now.y - box.y, now.bottom - (box.y + box.height));
    const moved = `«${name}» moved by ${dx.toFixed(1)} px across and ${dy.toFixed(1)} px down after press ${press} of ${times}; under the finger now: «${under}».`;
    expect(Math.max(Math.abs(dx), Math.abs(dy)), moved).toBeLessThanOrEqual(TOLERANCE);
    expect(now.same, moved).toBe(true);
  }
}

/**
 * Presses at one point until the control there is used up or removed, `times` times in all. What comes under the finger
 * after each press must be nothing, or a control whose name matches `allowed`: the same action on the next item.
 */
async function pressUntilGone(page: Page, control: Locator, times: number, allowed: RegExp): Promise<void> {
  const { point } = await centreOf(page, control);
  const name = (await controlAt(page, point)) ?? 'a control';
  for (let press = 1; press <= times; press += 1) {
    await page.mouse.click(point.x, point.y);
    await settle(page);
    const under = await controlAt(page, point);
    expect(under === null || allowed.test(under), `After press ${press} of ${times} on «${name}» another action lies under the finger: «${under}».`).toBe(true);
  }
}

async function openGame(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto(LINK);
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await expect(tile(page, 66)).toBeVisible();
}

async function addAction(page: Page, type: string): Promise<void> {
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.locator('.action-list').getByRole('button', { name: type, exact: true }).click();
}

/** A pass in the plan: it opens as every action does, and «Done» returns to the list. */
async function addPass(page: Page): Promise<void> {
  await addAction(page, 'Pass');
  await panel(page).getByRole('button', { name: 'Done' }).click();
}

/** A component action open in its editor: the choice of the component it begins with is closed. */
async function addComponentAction(page: Page): Promise<void> {
  await addAction(page, 'Component action');
  await expect(page.getByRole('dialog', { name: 'Choose a component' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Choose a component' })).toHaveCount(0);
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

/** A tactical action on Hope's End with one route from home through Horizon; the flight step is left open. */
async function startFlight(page: Page): Promise<void> {
  await addAction(page, 'Tactical action');
  await tapTile(page, 66);
  await expect(page.getByText("Active system: Hope's End")).toBeVisible();
  await tapTile(page, 58);
  await tapTile(page, 110);
  await tapTile(page, 66);
  await expect(page.getByText(`Flight ${HOME} → Hope's End`)).toBeVisible();
}

/** How many a button of a draft offers, or a chip of its tray holds: the number written on it. */
async function countOn(control: Locator): Promise<number> {
  return Number((await control.locator('i').innerText()).replace(/\D/g, ''));
}

/** Where every control of a set stands inside a box, by its name: a scroll of the panel moves none of them. */
async function placesIn(box: Locator, controls: Locator): Promise<Record<string, string>> {
  const origin = await box.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y }; });
  const all = await controls.evaluateAll((els, from) => els.map((el, n) => {
    const r = el.getBoundingClientRect();
    return [`${n} ${el.getAttribute('aria-label')}`, `${Math.round(r.x - from.x)},${Math.round(r.y - from.y)}`] as const;
  }), origin);
  return Object.fromEntries(all);
}

/** Two mechs and two infantry on one planet of the home system, placed by hand. */
async function placeGarrison(page: Page): Promise<void> {
  await tile(page, 58).click();
  await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
  for (const unit of ['Mech', 'Mech', 'Infantry', 'Infantry']) await stage(page).getByRole('button', { name: unit, exact: true }).click();
  await stage(page).getByRole('button', { name: 'Close' }).click();
}

/** The place of the flight's cargo where the garrison stands: the only one with mechs. */
const garrison = (page: Page) => panel(page).locator('.unit-picker').getByRole('group')
  .filter({ has: page.getByRole('button', { name: 'Take one Mech' }) }).first();

test.beforeEach(async ({ page }) => {
  await openGame(page);
});

test('the steppers of the status tokens and of the points stay under the finger', async ({ page }) => {
  await page.getByRole('button', { name: 'Tokens and points' }).click();
  const tokens = page.getByRole('group', { name: 'Token distribution' });
  for (const pool of ['Tactic', 'Fleet', 'Strategy']) {
    // Past the two tokens of the round the plan warns.
    await pressRepeatedly(page, tokens.getByRole('button', { name: `Add one ${pool}` }), 4);
    await pressRepeatedly(page, tokens.getByRole('button', { name: `Remove one ${pool}` }), 4);
  }
  const mine = page.getByRole('group', { name: 'Argent', exact: true });
  await pressRepeatedly(page, mine.getByRole('button', { name: 'Add one Argent' }), 11);
  await pressRepeatedly(page, mine.getByRole('button', { name: 'Remove one Argent' }), 11);
});

test('an objective scored in the status phase, and what it cost, stay under the finger', async ({ page }) => {
  await page.getByRole('button', { name: 'Tokens and points' }).click();
  const scored = page.getByRole('group', { name: 'Objectives scored' });
  await scored.getByRole('button', { name: 'Score an objective' }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose a component' });
  await dialog.getByRole('searchbox', { name: 'Search components' }).fill('Centralize Galactic Trade');
  await dialog.getByRole('button', { name: 'Choose Centralize Galactic Trade' }).click();
  // The cost of an objective scored by spending: its steppers are pressed up and down at one point.
  const cost = page.getByRole('group', { name: 'What scoring cost' });
  for (const field of ['Tactic', 'Strategy', 'trade good']) {
    await pressRepeatedly(page, cost.getByRole('button', { name: `Add one ${field}` }), 4);
    await pressRepeatedly(page, cost.getByRole('button', { name: `Remove one ${field}` }), 4);
  }
});

test('the outcome of an agenda is chosen and taken back at one point', async ({ page }) => {
  await page.getByRole('button', { name: '+ Agenda' }).click();
  await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose a component' });
  await dialog.getByRole('searchbox', { name: 'Search components' }).fill('Executive Sanctions');
  await dialog.getByRole('button', { name: 'Choose Executive Sanctions' }).click();
  const outcome = panel(page).getByRole('group', { name: 'Outcome' }).last();
  await pressRepeatedly(page, outcome.getByRole('button', { name: 'For', exact: true }), 4);
  await pressRepeatedly(page, outcome.getByRole('button', { name: 'Against', exact: true }), 4);
});

test('the steppers of a manual adjustment stay under the finger, below zero too', async ({ page }) => {
  await addAction(page, 'Manual adjustment');
  for (const field of ['Trade goods', 'Tactic', 'Fleet', 'Strategy', 'VP']) {
    const stepper = panel(page).getByRole('group', { name: field, exact: true });
    await pressRepeatedly(page, stepper.getByRole('button', { name: `Add one ${field}` }), 3);
    // Below what the player has the plan warns.
    await pressRepeatedly(page, stepper.getByRole('button', { name: `Remove one ${field}` }), 14);
    await pressRepeatedly(page, stepper.getByRole('button', { name: `Add one ${field}` }), 11);
  }
});

test('a card of the strategy editor, its sides and the tokens of Leadership stay under the finger', async ({ page }) => {
  await addAction(page, 'Strategy');
  const cards = panel(page).getByRole('group', { name: 'Card', exact: true });
  await pressRepeatedly(page, cards.getByRole('button', { name: '1 Leadership' }), 3);
  await pressRepeatedly(page, panel(page).locator('.card-ability-secondary'), 2);
  await pressRepeatedly(page, panel(page).locator('.card-ability-primary'), 2);
  const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
  for (const pool of ['Tactic', 'Fleet', 'Strategy']) {
    // The fourth token is bought: the payment and its warnings appear.
    await pressRepeatedly(page, tokens.getByRole('button', { name: `Add one ${pool}` }), 6);
    await pressRepeatedly(page, tokens.getByRole('button', { name: `Remove one ${pool}` }), 6);
  }
});

test('the upgrades of Technology and the free secondaries of Trade stay under the finger', async ({ page }) => {
  await addAction(page, 'Strategy');
  const cards = panel(page).getByRole('group', { name: 'Card', exact: true });
  await cards.getByRole('button', { name: '7 Technology' }).click();
  const upgrades = panel(page).locator('.entry-upgrades button:not(:disabled)');
  const kinds = await upgrades.evaluateAll(buttons => buttons.map(b => b.getAttribute('aria-label') ?? ''));
  expect(kinds.length).toBeGreaterThan(2);
  for (const kind of kinds) await pressRepeatedly(page, panel(page).locator('.entry-upgrades').getByRole('button', { name: kind, exact: true }), 4);

  await cards.getByRole('button', { name: '5 Trade' }).click();
  await panel(page).locator('.card-ability-primary').click();
  const free = panel(page).getByRole('group', { name: 'Who uses the secondary for free' }).getByRole('button');
  await expect(free).toHaveCount(5);
  for (let i = 0; i < 5; i += 1) await pressRepeatedly(page, free.nth(i), 4);
});

test('a strategy card of the round goes through its taps under the finger', async ({ page }) => {
  const cell = (n: number) => page.locator('.plan-cards .card-cell').nth(n);
  // Details, backup, main, cleared, and round again.
  await pressRepeatedly(page, cell(0), 8);
  await pressRepeatedly(page, cell(5), 8);
  // A main card in the upper row, and a card of the lower row takes its place.
  await cell(1).click();
  await cell(1).click();
  await cell(1).click();
  await page.locator('.plan-cards .phase-title').click();
  await pressRepeatedly(page, cell(6), 8);
});

test('the ships and the cargo of a flight are taken and returned under the finger', async ({ page }) => {
  await startFlight(page);
  const ships = panel(page).locator('.unit-picker');
  for (const unit of ['Destroyer', 'Carrier', 'Fighter']) {
    const take = ships.getByRole('button', { name: `Take one ${unit}` }).first();
    const all = await countOn(take);
    // Down to the last one: the button stays where it is, in the look of "beyond the stock", and still takes a tap.
    await pressRepeatedly(page, take, all);
    await expect(take).toHaveClass(/draft-take-over/);
    await expect(take).toBeEnabled();
  }
  // One destroyer more than stands there: nothing forbids it, the button counts it and the flight warns under the buttons.
  const destroyer = ships.getByRole('button', { name: 'Take one Destroyer' }).first();
  await pressRepeatedly(page, destroyer, 1);
  await expect(destroyer.locator('.draft-over')).toHaveText('+1');
  await expect(ships.getByText(/is missing 1 × Destroyer/)).toBeVisible();
  const back = ships.getByRole('button', { name: 'Return one Destroyer' }).first();
  await pressRepeatedly(page, back, await countOn(back) - 1);
  // The last one returned leaves an empty place of the tray: nothing else comes under the finger.
  await pressUntilGone(page, back, 2, /^Return one Destroyer$/);

  // The cargo of the start system, down to the last one and more than the one carrier can hold: the plan warns.
  const start = ships.locator('.stop').first();
  for (const unit of ['Fighter', 'Infantry']) {
    const take = start.getByRole('button', { name: `Take one ${unit}` });
    await pressRepeatedly(page, take, await countOn(take));
  }
  const loaded = start.getByRole('button', { name: 'Return one Fighter' });
  await pressRepeatedly(page, loaded, await countOn(loaded) - 1);
  await pressUntilGone(page, loaded, 2, /^Return one Fighter$/);
});

test('the landing of a flight is set and taken back under the finger', async ({ page }) => {
  await startFlight(page);
  const ships = panel(page).locator('.unit-picker');
  await ships.getByRole('button', { name: 'Take one Carrier' }).first().click();
  const infantry = ships.getByRole('button', { name: 'Take one Infantry' }).first();
  const all = await countOn(infantry);
  for (let i = 0; i < all; i += 1) await infantry.click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();

  const landing = panel(page).getByRole('group', { name: "Landing on Hope's End" });
  // One more than arrived: the button changes its look with the last one and still lands, and the plan warns.
  await pressRepeatedly(page, landing.getByRole('button', { name: 'Land one Infantry' }), all + 1);
  await expect(landing.getByRole('button', { name: 'Land one Infantry' })).toBeEnabled();
  await expect(landing.getByRole('button', { name: 'Land one Infantry' })).toHaveClass(/draft-take-over/);
  await expect(landing.getByRole('button', { name: 'Land one Infantry' }).locator('.draft-over')).toHaveText('+1');
  await expect(landing.getByRole('button', { name: 'Give back Infantry' })).toContainText(`×${all + 1}`);
  await expect(panel(page).getByText(`Landing needs ${all + 1} × Infantry, but only ${all} arrived.`)).toBeVisible();
  await pressRepeatedly(page, landing.getByRole('button', { name: 'Give back Infantry' }), all);
  await pressUntilGone(page, landing.getByRole('button', { name: 'Give back Infantry' }), 3, /^Give back Infantry$/);
});

test('a kind landed to the last one changes its look to "beyond the stock" on every planet at once, still takes a tap and does not move', async ({ page }) => {
  // Horizon lies next to home and has three planets.
  await addAction(page, 'Tactical action');
  await tapTile(page, 110);
  await tapTile(page, 58);
  await tapTile(page, 110);
  const ships = panel(page).locator('.unit-picker');
  await ships.getByRole('button', { name: 'Take one Carrier' }).first().click();
  const infantry = ships.getByRole('button', { name: 'Take one Infantry' }).first();
  const all = await countOn(infantry);
  expect(all).toBeGreaterThan(2);
  await pressRepeatedly(page, infantry, all);
  await page.getByRole('button', { name: 'Back', exact: true }).click();

  const on = (planet: string) => panel(page).getByRole('group', { name: `Landing on ${planet}` });
  const land = (planet: string) => on(planet).getByRole('button', { name: 'Land one Infantry' });
  for (const planet of ['Horizon', "El'Nath", 'Luthien VI']) await expect(land(planet)).toContainText(String(all));
  await land("El'Nath").click();
  await pressRepeatedly(page, land('Horizon'), all - 1);
  const landing = panel(page).locator('.landing');
  const places = () => placesIn(landing, landing.getByRole('button', { name: 'Land one Infantry' }));
  const before = await places();
  for (const planet of ['Horizon', "El'Nath", 'Luthien VI']) {
    await expect(land(planet)).toHaveClass(/draft-take-over/);
    await expect(land(planet)).toBeEnabled();
    await expect(land(planet).locator('.draft-over')).toHaveCount(0);
  }
  // Two more than arrived on a third planet: every row counts them, the plan warns below, and no button has moved.
  await pressRepeatedly(page, land('Luthien VI'), 2);
  for (const planet of ['Horizon', "El'Nath", 'Luthien VI']) await expect(land(planet).locator('.draft-over')).toHaveText('+2');
  await expect(panel(page).getByText(`Landing needs ${all + 2} × Infantry, but only ${all} arrived.`)).toBeVisible();
  expect(await places()).toEqual(before);
  await pressUntilGone(page, on('Luthien VI').getByRole('button', { name: 'Give back Infantry' }), 3, /^Give back Infantry$/);
  // One given back on a planet lights the kind again on all of them, and no button has moved.
  await on("El'Nath").getByRole('button', { name: 'Give back Infantry' }).click();
  for (const planet of ['Horizon', "El'Nath", 'Luthien VI']) await expect(land(planet)).not.toHaveClass(/draft-take-over/);
  expect(await places()).toEqual(before);
  await pressRepeatedly(page, land('Luthien VI'), 1);
  await pressUntilGone(page, on('Horizon').getByRole('button', { name: 'Give back Infantry' }), all + 1, /^Give back Infantry$/);
});

test('the last unit of a kind returned from a flight leaves the other kinds as they are', async ({ page }) => {
  await placeGarrison(page);
  await startFlight(page);
  const ships = panel(page).locator('.unit-picker');
  for (const unit of ['Destroyer', 'Destroyer', 'Carrier']) await ships.getByRole('button', { name: `Take one ${unit}` }).first().click();
  // Four presses where two destroyers are returned: the last two must find nothing to return.
  await pressUntilGone(page, ships.getByRole('button', { name: 'Return one Destroyer' }), 4, /^Return one Destroyer$/);
  await expect(ships.getByRole('button', { name: 'Return one Destroyer' })).toHaveCount(0);
  await expect(ships.getByRole('button', { name: 'Return one Carrier' })).toHaveCount(1);

  const avar = garrison(page);
  for (const unit of ['Infantry', 'Infantry', 'Mech', 'Mech']) await avar.getByRole('button', { name: `Take one ${unit}` }).click();
  await expect(avar.getByRole('button', { name: 'Return one Mech' })).toContainText('2');
  await pressUntilGone(page, avar.getByRole('button', { name: 'Return one Infantry' }), 4, /^Return one Infantry$/);
  await expect(avar.getByRole('button', { name: 'Return one Infantry' })).toHaveCount(0);
  await expect(avar.getByRole('button', { name: 'Return one Mech' })).toContainText('2');
});

test('the last unit of a kind taken back from a landing leaves the other kinds as they are', async ({ page }) => {
  await placeGarrison(page);
  await startFlight(page);
  const ships = panel(page).locator('.unit-picker');
  await ships.getByRole('button', { name: 'Take one Carrier' }).first().click();
  const avar = garrison(page);
  for (const unit of ['Infantry', 'Infantry', 'Mech', 'Mech']) await avar.getByRole('button', { name: `Take one ${unit}` }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();

  const landing = panel(page).getByRole('group', { name: "Landing on Hope's End" });
  for (const unit of ['Infantry', 'Infantry', 'Mech', 'Mech']) await landing.getByRole('button', { name: `Land one ${unit}` }).click();
  await expect(landing.getByRole('button', { name: 'Give back Mech' })).toContainText('2');
  await pressUntilGone(page, landing.getByRole('button', { name: 'Give back Infantry' }), 4, /^Give back Infantry$/);
  await expect(landing.getByRole('button', { name: 'Give back Infantry' })).toHaveCount(0);
  await expect(landing.getByRole('button', { name: 'Give back Mech' })).toContainText('2');
  // And the other way round: whichever kind stands first, the one after it must not come under the finger.
  for (let i = 0; i < 2; i += 1) await landing.getByRole('button', { name: 'Land one Infantry' }).click();
  await pressUntilGone(page, landing.getByRole('button', { name: 'Give back Mech' }), 4, /^Give back Mech$/);
  await expect(landing.getByRole('button', { name: 'Give back Mech' })).toHaveCount(0);
  await expect(landing.getByRole('button', { name: 'Give back Infantry' })).toContainText('2');
});

test('taking the units of a flight moves no tile of the flight', async ({ page }) => {
  await placeGarrison(page);
  await startFlight(page);
  const ships = panel(page).locator('.unit-picker');
  const takes = ships.getByRole('button', { name: /^Take one / });
  const before = await placesIn(ships, takes);
  expect(Object.keys(before).length).toBeGreaterThan(4);
  // The first ship fills the row of those that fly, the carrier brings the places on board, the cargo fills them and more.
  for (const unit of ['Destroyer', 'Carrier']) {
    await ships.getByRole('button', { name: `Take one ${unit}` }).first().click();
    await settle(page);
    expect(await placesIn(ships, takes), `after the first ${unit}`).toEqual(before);
  }
  const avar = garrison(page);
  for (const unit of ['Infantry', 'Mech', 'Infantry', 'Mech']) {
    await avar.getByRole('button', { name: `Take one ${unit}` }).click();
    await settle(page);
    expect(await placesIn(ships, takes), `after one more ${unit}`).toEqual(before);
  }
});

test('the losses of a battle are tapped on the hex and given back under the finger', async ({ page }) => {
  await startFlight(page);
  const ships = panel(page).locator('.unit-picker');
  for (const unit of ['Carrier', 'Fighter', 'Fighter', 'Destroyer', 'Destroyer']) await ships.getByRole('button', { name: `Take one ${unit}` }).first().click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await panel(page).getByRole('button', { name: /^Battle/ }).click();

  const hex = stage(page).getByRole('group', { name: 'Big hex' });
  // The first loss leaves one more of the kind in its place.
  await pressRepeatedly(page, hex.getByRole('button', { name: /^Fighter/ }), 1);
  await pressRepeatedly(page, hex.getByRole('button', { name: /^Destroyer/ }), 1);
  // Giving back: one of two stays to be given back next.
  await hex.getByRole('button', { name: /^Fighter/ }).click();
  const back = stage(page).getByRole('button', { name: 'Give back Fighter' });
  await expect(back.locator('i')).toHaveText('2');
  await pressRepeatedly(page, back, 1);
  await pressUntilGone(page, back, 2, /^Give back /);
});

test('ships beyond the fleet pool are removed tap after tap, and the count of those still to remove stays where it is', async ({ page }) => {
  // Four cruisers more at home: with the carrier and the destroyers, seven ships fly against a fleet pool of three.
  await tile(page, 58).click();
  await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
  for (let i = 0; i < 4; i += 1) await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
  await stage(page).getByRole('button', { name: 'Close' }).click();
  await startFlight(page);
  const ships = panel(page).locator('.unit-picker');
  for (const unit of ['Carrier', 'Destroyer', 'Destroyer', 'Cruiser', 'Cruiser', 'Cruiser', 'Cruiser']) await ships.getByRole('button', { name: `Take one ${unit}` }).first().click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();

  // The row of the editor says it without the hex.
  const excess = panel(page).getByRole('button', { name: /^Excess ships/ });
  await expect(excess).toContainText('Still to remove: 4');
  await excess.click();
  const counter = stage(page).getByRole('group', { name: 'Ships / fleet pool' });
  const left = counter.locator('.fleet-left b');
  await expect(counter).toContainText('7 / 3');
  await expect(left).toHaveText('4');
  const place = async () => JSON.stringify(await left.boundingBox());
  const before = await place();

  // A token of the hex, three times at one point: the count goes down, the token and the count stay.
  const hex = stage(page).getByRole('group', { name: 'Big hex' });
  await pressRepeatedly(page, hex.getByRole('button', { name: /^Cruiser/ }), 3);
  await expect(left).toHaveText('1');
  await expect(counter).toContainText('4 / 3');
  expect(await place()).toBe(before);
  // The same from the panel, down to a fleet within the pool, and back.
  await pressRepeatedly(page, stage(page).getByRole('button', { name: 'Remove one Destroyer' }), 1);
  await expect(left).toHaveText('0');
  await expect(counter).toContainText('The fleet is within the fleet pool');
  expect(await place()).toBe(before);
  await pressRepeatedly(page, stage(page).getByRole('button', { name: 'Give back Cruiser' }), 2);
  await expect(left).toHaveText('2');
  expect(await place()).toBe(before);
  await stage(page).getByRole('button', { name: 'Close' }).click();
  await expect(excess).toContainText('Still to remove: 2');
});

test('the shop of the big hex buys and places one unit after another under the finger', async ({ page }) => {
  await tile(page, 58).click();
  await stage(page).getByRole('button', { name: 'Create', exact: true }).click();
  // Five of each, three war suns more than the two the reinforcements hold: the button changes its look and buys on.
  for (const unit of ['Destroyer', 'Infantry, Valk', 'Dreadnought', 'War Sun']) {
    await pressRepeatedly(page, stage(page).getByRole('button', { name: unit, exact: true }), 5);
  }
  const warSun = stage(page).getByRole('button', { name: 'War Sun', exact: true });
  await expect(warSun).toBeEnabled();
  await expect(warSun).toHaveClass(/draft-take-over/);
  await expect(warSun.locator('.draft-over')).toHaveText('+3');
  await expect(stage(page).getByText('Bought: 20')).toBeVisible();
  // The figures of a kind are one stock for every planet: the last mech bought on one changes the button on the others.
  await pressRepeatedly(page, stage(page).getByRole('button', { name: 'Mech, Avar', exact: true }), 4);
  for (const planet of ['Avar', 'Valk', 'Ylir']) {
    await expect(stage(page).getByRole('button', { name: `Mech, ${planet}`, exact: true })).toHaveClass(/draft-take-over/);
    await expect(stage(page).getByRole('button', { name: `Mech, ${planet}`, exact: true })).toBeEnabled();
  }
  // What was bought is given back where it stands in the tray, kind after kind, and no other kind is touched.
  const bought = (unit: string) => stage(page).getByRole('button', { name: `Give back ${unit}`, exact: true });
  await pressRepeatedly(page, bought('Destroyer'), 4);
  await pressUntilGone(page, bought('Destroyer'), 3, /^Give back Destroyer$/);
  await pressUntilGone(page, bought('Infantry, Valk'), 7, /^Give back Infantry, Valk$/);
  await expect(bought('Dreadnought')).toContainText('×5');
  await expect(bought('War Sun')).toContainText('×5');
  await expect(bought('Mech, Avar')).toContainText('×4');
  await expect(stage(page).getByText('Bought: 14')).toBeVisible();

  await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
  for (const unit of ['Fighter', 'Infantry', 'Cruiser']) {
    await pressRepeatedly(page, stage(page).getByRole('button', { name: unit, exact: true }), 4);
  }
  // A tap on a token takes one off; more of the kind stay in its place.
  const hex = stage(page).getByRole('group', { name: 'Big hex' });
  await pressRepeatedly(page, hex.getByRole('button', { name: /^Cruiser/ }), 3);
});

test('the production of a tactical action and its payment by planets stay under the finger', async ({ page }) => {
  await addAction(page, 'Tactical action');
  await tapTile(page, 58);
  await panel(page).getByRole('button', { name: /^Production/ }).click();
  for (const unit of ['Destroyer', 'Fighter', 'Carrier']) {
    await pressRepeatedly(page, stage(page).getByRole('button', { name: unit, exact: true }), 3);
  }
  await stage(page).getByRole('button', { name: 'Close' }).click();

  const payment = panel(page).getByRole('group', { name: 'Payment' });
  // By hand, automatically, and by hand again.
  await pressRepeatedly(page, payment.locator('.panel-head button'), 3);
  const planets = payment.getByRole('group', { name: 'Planets to pay with' }).getByRole('button');
  const count = await planets.count();
  expect(count).toBeGreaterThan(1);
  // Every planet off and on: paid in full, short, and with a surplus.
  for (let i = 0; i < count; i += 1) await pressRepeatedly(page, planets.nth(i), 4);
  for (let i = 0; i < count; i += 1) await pressRepeatedly(page, planets.nth(i), 3);
  await pressRepeatedly(page, payment.getByRole('button', { name: 'Add one trade good' }), 11);
  await pressRepeatedly(page, payment.getByRole('button', { name: 'Remove one trade good' }), 11);
});

test('a transaction counts its goods under the finger', async ({ page }) => {
  await addComponentAction(page);
  await panel(page).getByRole('button', { name: '+ Transaction' }).click();
  for (const side of ['Give', 'Get']) {
    const group = panel(page).getByRole('group', { name: side, exact: true });
    for (const goods of ['Trade goods', 'Commodities']) {
      // More than the player has: the plan warns.
      await pressRepeatedly(page, group.getByRole('button', { name: `Add one ${goods}` }), 11);
      await pressRepeatedly(page, group.getByRole('button', { name: `Remove one ${goods}` }), 11);
    }
    // Each side begins with the promissory notes of its colour: there is something to choose a component from.
    await expect(group.getByRole('button', { name: '+ Component' })).toBeEnabled();
  }
});

test('rounds are added, removed and undone one after another under the finger', async ({ page }) => {
  await pressRepeatedly(page, page.getByRole('button', { name: 'Add round' }), 8);
  await pressRepeatedly(page, page.locator('.plan-round-remove'), 4);
  await pressRepeatedly(page, page.getByRole('button', { name: 'Undo' }), 6);
});

test('a plan is copied again and again under the finger', async ({ page }) => {
  await pressRepeatedly(page, page.getByRole('button', { name: 'Copy', exact: true }), 6);
});

// «Add action» stands at the foot of the list of actions, so every action added above it moves it down by one row: 22.9 px
// for a pass, more for an action with its lines. Holding it still means putting the button above the list, or the newest
// action first: a change of the plan panel that the owner has not asked for.
test.fixme('an action is added again and again under the finger', async ({ page }) => {
  const add = page.getByRole('button', { name: 'Add action' });
  const { point, box } = await centreOf(page, add);
  for (let press = 1; press <= 4; press += 1) {
    await page.mouse.click(point.x, point.y);
    await page.locator('.action-list').getByRole('button', { name: 'Pass', exact: true }).click();
    await settle(page);
    const now = (await add.boundingBox())!;
    const moved = `«Add action» moved by ${(now.x - box.x).toFixed(1)} px across and ${(now.y - box.y).toFixed(1)} px down after action ${press} of 4; under the finger now: «${await controlAt(page, point)}».`;
    expect(Math.max(Math.abs(now.x - box.x), Math.abs(now.y - box.y)), moved).toBeLessThanOrEqual(TOLERANCE);
  }
});

test('an entry is marked done and back under the finger', async ({ page }) => {
  for (let i = 0; i < 3; i += 1) await addPass(page);
  await pressRepeatedly(page, page.locator('.entry').nth(1).locator('.entry-check'), 6);
});

test('deleting entries of the plan brings only the next cross under the finger', async ({ page }) => {
  for (let i = 0; i < 4; i += 1) await addPass(page);
  await expect(page.locator('.entry')).toHaveCount(4);
  await pressUntilGone(page, page.locator('.entry').first().getByRole('button', { name: 'Delete' }), 5, /^Delete$/);
  await expect(page.locator('.entry')).toHaveCount(0);
});

test('removing the sources of a tactical action brings only the next cross under the finger', async ({ page }) => {
  await startFlight(page);
  // A source stays in the action only with something taken: a ship from home, and for the second one cargo on its way.
  await panel(page).getByRole('button', { name: 'Take one Carrier' }).first().click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Add source' }).click();
  await tapTile(page, 110);
  await tapTile(page, 58);
  await tapTile(page, 66);
  await expect(page.getByText(`Flight ${HORIZON} → Hope's End`)).toBeVisible();
  await panel(page).getByRole('button', { name: 'Take one Infantry' }).first().click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  const crosses = panel(page).getByRole('button', { name: /^Remove source / });
  await expect(crosses).toHaveCount(2);
  await pressUntilGone(page, crosses.first(), 3, /^Remove source /);
  await expect(crosses).toHaveCount(0);
});

test('a tap in the plan panel folds the open entry and still lands on its target', async ({ page }) => {
  await startFlight(page);
  await panel(page).getByRole('button', { name: 'Take one Carrier' }).first().click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  // The steps of the action stand under its row and push the rest of the panel down.
  await page.getByRole('button', { name: "Tactical action · Hope's End", exact: true }).click();
  await expect(page.locator('.entry-steps')).toBeVisible();
  const { point } = await centreOf(page, page.getByRole('button', { name: 'Tokens and points' }));
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('.entry-steps')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Token distribution' })).toBeVisible();
});

/** The tabs of the components: the first is the folded stack, and the tab of the open group once it is fanned out. */
const fan = (page: Page) => page.locator('.tab-fan > button');
const fanTab = (page: Page, name: RegExp) => page.locator('.tab-fan').getByRole('button', { name });

test('the stack of the component tabs opens at one point and folds at one point, the tab riding out on its sheet, on the group it was left on', async ({ page }) => {
  const stack = fan(page).first();
  const { point } = await centreOf(page, stack);
  // The fan rides out on the edge of its sheet, as the tab of any drawer: the tab of the open group lies at the height
  // of the stack, moved out by the sheet. So the finger knows two points, and each press finds its control at its own.
  await page.mouse.click(point.x, point.y);
  await settle(page);
  const { point: out, box } = await centreOf(page, stack);
  expect(Math.round(out.y)).toBe(Math.round(point.y));
  const sheet = (await page.locator('.drawer-under').boundingBox())!;
  expect(Math.abs(box.x + box.width - (sheet.x + 2))).toBeLessThanOrEqual(1);
  expect(await controlAt(page, out)).toMatch(/^Technologies/);
  for (let round = 1; round <= 4; round += 1) {
    await page.mouse.click(out.x, out.y);
    await settle(page);
    expect(await controlAt(page, point), `fold ${round}`).toMatch(/^Components/);
    await expect(drawer(page)).toHaveCount(0);
    await page.mouse.click(point.x, point.y);
    await settle(page);
    expect(await controlAt(page, out), `open ${round}`).toMatch(/^Technologies/);
    await expect(drawer(page)).toHaveCount(1);
  }

  // Another group: the tabs of the fan stay where they are, and its own tab folds the fan.
  const places = () => fan(page).evaluateAll(tabs => tabs.map(tab => { const box = tab.getBoundingClientRect(); return [box.x, box.y, box.width, box.height].map(Math.round).join(' '); }));
  const before = await places();
  for (const group of [/^Relics/, /^Cards/, /^Objectives/]) {
    await fanTab(page, group).click();
    await settle(page);
    await expect(fanTab(page, group)).toHaveAttribute('aria-pressed', 'true');
    expect(await places()).toEqual(before);
  }
  // Five tabs stand inside the height of the map.
  const map = (await page.locator('.plan-map').boundingBox())!;
  const last = (await fan(page).last().boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(map.y + map.height);
  await fanTab(page, /^Objectives/).click();
  await expect(drawer(page)).toHaveCount(0);

  // Left on Objectives: the stack opens on them, their tab first, at the point the open tab always has, and folds there.
  await page.mouse.click(point.x, point.y);
  await settle(page);
  expect(await controlAt(page, out)).toMatch(/^Objectives/);
  await expect(drawer(page).getByRole('group', { name: 'Objectives' })).toBeVisible();
  await page.mouse.click(out.x, out.y);
  await settle(page);
  expect(await controlAt(page, point)).toMatch(/^Components/);
  await expect(drawer(page)).toHaveCount(0);
});

test('the states of a leader are chosen, and a unit changes its level, under the finger', async ({ page }) => {
  await page.getByRole('button', { name: /^Components/ }).click();
  await fanTab(page, /^Faction/).click();
  const leaders = drawer(page).getByRole('group', { name: 'Leaders' }).locator('[data-testid^="component-leader:"]');
  const ids = await leaders.evaluateAll(cards => cards.map(card => card.getAttribute('data-testid') ?? ''));
  expect(ids.length).toBeGreaterThan(1);
  // Every state of every leader, from the last to the first and back: the segments stand still whatever is chosen.
  for (const id of ids) {
    const states = drawer(page).getByTestId(id).locator('.segment > button');
    const count = await states.count();
    expect(count).toBeGreaterThan(1);
    for (let i = count - 1; i >= 0; i -= 1) await pressRepeatedly(page, states.nth(i), 2);
    for (let i = 0; i < count; i += 1) await pressRepeatedly(page, states.nth(i), 2);
  }

  await fanTab(page, /^Technologies/).click();
  const levels = await drawer(page).locator('.upgrade-card:not(:disabled)').evaluateAll(cards => cards.map(card => card.getAttribute('data-testid') ?? ''));
  expect(levels.length).toBeGreaterThan(2);
  for (const id of levels) await pressRepeatedly(page, drawer(page).getByTestId(id), 4);
});

test('components are added from the search, and a hand is counted, under the finger', async ({ page }) => {
  await page.getByRole('button', { name: /^Components/ }).click();
  const search = drawer(page).getByRole('searchbox', { name: 'Search components' });
  const results = drawer(page).getByRole('group', { name: 'Search results' });

  // Several components one after another: what was added must not bring the control of another card under the finger.
  await search.fill('the');
  for (let added = 1; added <= 4; added += 1) {
    const add = results.getByRole('button', { name: /^Add / }).nth(3);
    const card = await add.evaluate(el => el.closest('[data-testid]')?.getAttribute('data-testid') ?? '');
    const { point } = await centreOf(page, add);
    const name = await controlAt(page, point);
    await page.mouse.click(point.x, point.y);
    await settle(page);
    const under = await page.evaluate(([at, selector]) => {
      const hit = document.elementFromPoint(at.x, at.y)?.closest(selector);
      return hit ? { card: hit.closest('[data-testid]')?.getAttribute('data-testid') ?? '', name: hit.getAttribute('aria-label') ?? hit.textContent ?? '' } : null;
    }, [point, CONTROL] as const);
    expect(under === null || under.card === card, `After «${name}» (component ${added} of 4) the control of another card lies under the finger: «${under?.name}».`).toBe(true);
  }

  await search.fill('sabotage');
  await results.getByRole('button', { name: 'Add Sabotage' }).click();
  await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
  await fanTab(page, /^Cards/).click();
  const hand = drawer(page).getByRole('group', { name: 'Action cards' });
  await pressRepeatedly(page, hand.getByRole('button', { name: 'Add one In hand' }).first(), 3);
  await pressRepeatedly(page, hand.getByRole('button', { name: 'Remove one In hand' }).first(), 3);
});

test('the components used with a turn are added by a button that stays where it is, and their crosses bring only the next cross', async ({ page }) => {
  await addAction(page, 'Pass');
  const used = panel(page).getByRole('group', { name: 'Used' });
  const add = used.getByRole('button', { name: '+ Used' });
  const { box } = await centreOf(page, add);
  for (const name of ['Zeal', 'Raid Formation', 'Aerie Sentinel']) {
    await add.click();
    const dialog = page.getByRole('dialog', { name: 'Choose a component' });
    await dialog.getByRole('searchbox', { name: 'Search components' }).fill(name);
    await dialog.getByRole('button', { name: `Choose ${name}` }).click();
    await settle(page);
    // Each card comes under the button: the button itself has not moved.
    const now = (await add.boundingBox())!;
    expect(Math.max(Math.abs(now.x - box.x), Math.abs(now.y - box.y)), `«+ Used» moved after ${name}`).toBeLessThanOrEqual(TOLERANCE);
  }
  await expect(used.locator('[data-testid^="component-"]')).toHaveCount(3);
  await pressUntilGone(page, used.getByRole('button', { name: /^Remove / }).first(), 4, /^Remove /);
  await expect(used.locator('[data-testid^="component-"]')).toHaveCount(0);
});

test('the energy settings of the game screen switch under the finger', async ({ page }) => {
  await page.getByRole('button', { name: 'Game', exact: true }).click();
  const chips = page.locator('.energy-settings .chip');
  const count = await chips.count();
  expect(count).toBe(5);
  // The items first, maximum saving last: it locks the others.
  for (let i = count - 1; i >= 0; i -= 1) await pressRepeatedly(page, chips.nth(i), 4);
});

test('the parts of the expedition and the seat of the Fracture switch under the finger', async ({ page }) => {
  await page.locator('.drawer-rail-right > button').click();
  const expedition = page.getByRole('group', { name: 'Expedition', exact: true });
  const parts = expedition.locator('.slice');
  await expect(parts).toHaveCount(6);
  // Taken by another player and given back; the last row first, so that a row above it changes while it is pressed.
  for (let i = 5; i >= 0; i -= 1) await pressRepeatedly(page, parts.nth(i), 3);
  for (let i = 0; i < 6; i += 1) await pressRepeatedly(page, parts.nth(i), 3);

  const fracture = page.getByRole('group', { name: 'Fracture', exact: true });
  await pressRepeatedly(page, fracture.locator('.panel-head button'), 4);
  const seats = fracture.locator('.row').first().getByRole('button');
  const count = await seats.count();
  expect(count).toBeGreaterThan(1);
  for (let i = 0; i < count; i += 1) await pressRepeatedly(page, seats.nth(i), 4);
});

test('a part of the expedition is chosen in a turn under the finger', async ({ page }) => {
  await addComponentAction(page);
  await panel(page).getByRole('button', { name: '+ Expedition' }).click();
  const parts = panel(page).locator('.slice');
  await expect(parts).toHaveCount(6);
  // Chosen and cleared: its payment and its warnings come and go.
  for (let i = 0; i < 6; i += 1) await pressRepeatedly(page, parts.nth(i), 4);
});

test('the holder of a planet is chosen on the big hex under the finger', async ({ page }) => {
  await tile(page, 110).click();
  for (const planet of ['Horizon', "El'Nath", 'Luthien VI']) {
    const holders = stage(page).getByRole('group', { name: planet, exact: true }).locator('.player-choice button');
    const count = await holders.count();
    expect(count).toBeGreaterThan(2);
    for (let i = 0; i < count; i += 1) await pressRepeatedly(page, holders.nth(i), 2);
  }
});
