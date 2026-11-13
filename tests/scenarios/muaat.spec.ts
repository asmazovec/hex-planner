import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * One long game of the Embers of Muaat, played through the interface. Six players, Prophecy of Kings and Thunder's
 * Edge. Findings are kept as `// BUG:` comments where the step asserts the behaviour actually seen.
 */

/** Seat 1 is the Muaat home (tile 4); seats 2..6 hold Sol, Naaz-Rokha, Hacan, Deepwrought, Letnev. */
const MAP = '80 26 64 65 67 59 110 44 27 69 75 72 36 37 38 31 32 42 4 43 62 1 22 23 57 19 20 16 21 24 95 28 29 10 30 33';
const OUT = 'test-results/scenarios/muaat';

const errors: string[] = [];
const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const stage = (page: Page) => page.locator('.stage-dialog');
const summary = (page: Page, name: string) => page.locator('.summary-bar').getByRole('group', { name, exact: true });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });
const waived = (scope: Locator, code: string) => scope.locator(`li.warning-waived[data-code="${code}"]`);
const standing = (scope: Locator, code: string) => scope.locator(`li[data-code="${code}"]:not(.warning-waived)`);

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

/** For writing the scenario: print what is on the screen and stop when STOP names this point. */
async function look(page: Page, name: string, scope = '.plan-panel'): Promise<void> {
  if (process.env.STOP !== name && process.env.LOOK !== name) return;
  await shot(page, `look-${name}`);
  const buttons = await page.locator(`${scope} button, ${scope} [role=button]`).evaluateAll(all => all.filter(b => (b as HTMLElement).offsetParent !== null).map(b => (b.getAttribute('aria-label') || (b as HTMLElement).innerText || '').trim().replace(/\s*\n\s*/g, ' | ')));
  console.log(`--- LOOK ${name}\nBUTTONS: ${JSON.stringify(buttons)}\nTEXT: ${(await page.locator(scope).first().innerText()).replace(/\n+/g, ' / ')}`);
  if (process.env.STOP === name) throw new Error(`STOP at ${name}`);
}

async function total(page: Page, name: string, expected: number, mode = 'forecast'): Promise<void> {
  await expect(summary(page, name), `${name} (${mode})`).toHaveText(new RegExp(`(?<!\\d)${expected}$`));
}

/** The map glides after a tap on the active system; wait until the element stops before aiming at it. */
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

async function tapTile(page: Page, n: number): Promise<void> {
  await centreWhenStill(tile(page, n));
  await tile(page, n).click();
}

async function dragRoute(page: Page, hexes: number[]): Promise<void> {
  const points = [];
  for (const n of hexes) points.push(await centreWhenStill(tile(page, n)));
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.mouse.up();
}

async function addAction(page: Page, type: string): Promise<void> {
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.locator('.action-list').getByRole('button', { name: type, exact: true }).click();
}

async function choose(page: Page, query: string, name: string): Promise<void> {
  await picker(page).getByRole('searchbox', { name: 'Search components' }).fill(query);
  await picker(page).getByRole('button', { name: `Choose ${name}` }).click();
  await expect(picker(page)).toHaveCount(0);
}

async function done(page: Page): Promise<void> {
  await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
}

/** The stack opens on the group it was left on: a press on the open group's tab would fold it. */
/** Whose action the next entry is: the row of names above "Add action". */
async function actFor(page: Page, who: string): Promise<void> {
  await panel(page).getByRole('group', { name: 'Whose action' }).getByRole('button', { name: who, exact: true }).click();
}

async function take(page: Page, unit: string, times = 1): Promise<void> {
  for (let i = 0; i < times; i += 1) await panel(page).getByRole('button', { name: `Take one ${unit}` }).first().click();
}

/** Folds whichever group of the components stack is open. */
async function closeDrawerAny(page: Page): Promise<void> {
  await page.getByRole('group', { name: 'Drawers' }).locator('button[aria-pressed=true]').first().click();
  await expect(drawer(page)).toHaveCount(0);
  await shot(page, 'after-close');
  console.log('SCRIM', await page.getByTestId('drawer-scrim').count());
}

async function openGroup(page: Page, group: RegExp): Promise<void> {
  await page.getByRole('button', { name: /^Components/ }).click();
  await expect(drawer(page)).toBeVisible();
  const tab = groupTab(page, group);
  if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-pressed', 'true');
}
const openFaction = (page: Page) => openGroup(page, /^Faction/);

async function closeDrawer(page: Page, open: RegExp): Promise<void> {
  await groupTab(page, open).click();
  await expect(drawer(page)).toHaveCount(0);
}

async function setupGame(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');
  await page.getByRole('button', { name: 'My faction', exact: true }).click();
  await page.getByRole('button', { name: 'The Embers of Muaat' }).click();
  for (const rival of ['The Federation of Sol', 'The Naaz-Rokha Alliance', 'The Emirates of Hacan', 'The Deepwrought Scholarate', 'The Barony of Letnev']) {
    await page.getByText('Choose a faction').first().click();
    await page.getByRole('button', { name: rival }).click();
  }
  await page.getByRole('textbox', { name: 'Game name' }).fill('Muaat');
  await page.getByRole('button', { name: 'Paste a Milty string' }).click();
  await page.getByLabel('Milty Draft map string').fill(MAP);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('30 tiles placed.')).toBeVisible();
  await expect(page.getByText('Home systems placed: 6.')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await expect(tile(page, 4)).toBeVisible();
}

let page: Page;
test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true });
  page = await context.newPage();
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
});

test.afterEach(() => {
  expect(errors, 'console errors').toEqual([]);
});

test('round 1', async () => {
  await test.step('the game from the first screen', async () => {
    await setupGame(page);
    await total(page, 'Resources', 4);
    await total(page, 'Influence', 1);
    await total(page, 'Tactic', 3);
    await total(page, 'Fleet', 3);
    await total(page, 'Strategy', 2);
    await shot(page, '01-start');
    await look(page, 'start');
  });

  await test.step('leaders and the faction group of the components drawer', async () => {
    await page.getByRole('button', { name: /^Components/ }).click();
    await expect(drawer(page)).toBeVisible();
    await groupTab(page, /^Faction/).click();
    await look(page, 'faction', '[role=dialog][aria-label=Components]');
    // Only the agent is open from the start; the commander and the hero are locked until the plan unlocks them.
    await groupTab(page, /^Faction/).click();
    await expect(drawer(page)).toHaveCount(0);
  });

  await test.step('R1: tactical action into Horizon', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 110);
    await dragRoute(page, [4, 110]);
    await take(page, 'War Sun');
    await take(page, 'Infantry', 4);
    await take(page, 'Fighter', 2);
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 6 of 6' })).toBeVisible();
    await look(page, 'tact1');
    await page.getByRole('button', { name: 'Fly' }).click();
    const landOn = async (planet: string, n: number) => {
      const group = panel(page).getByRole('group', { name: planet });
      for (let i = 0; i < n; i += 1) await group.getByRole('button', { name: 'Land one Infantry' }).click();
    };
    await landOn('Horizon', 1);
    await landOn("El'Nath", 1);
    await landOn('Luthien VI', 2);
    await look(page, 'tact1b');
    await done(page);
    await total(page, 'Tactic', 2);
    // Planets taken stand exhausted until the next round, so they add nothing to what can be spent now.
    await total(page, 'Resources', 4);
    await total(page, 'Influence', 1);
    await shot(page, '02-horizon-taken');
  });

  await test.step('R1: strategy card Technology', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'dimensional splicer', 'Dimensional Splicer');
    await total(page, 'Strategy', 2);
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'prototype war sun', 'Prototype War Sun II');
    await expect(panel(page).getByText('The prerequisites of Prototype War Sun II are not met: 2 missing (warfare ×1, cybernetic ×1).')).toBeVisible();
    await expect(panel(page).getByText('Not enough resources: need 6, paid 4, short by 2.')).toBeVisible();
    await shot(page, '03-tech-warnings');
    await panel(page).getByRole('button', { name: 'Remove Prototype War Sun II' }).click();
    await expect(panel(page).getByText(/prerequisites of/)).toHaveCount(0);
    await expect(panel(page).getByText(/Not enough resources/)).toHaveCount(0);
    await done(page);
  });

  await test.step('R1: Star Forge as a component action', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'star forge', 'Star Forge');
    const HORIZON = "El'Nath / Horizon / Luthien VI";
    await panel(page).getByRole('button', { name: HORIZON, exact: true }).click();
    await panel(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    await total(page, 'Strategy', 1);
    await total(page, 'Trade goods', 0);
    await page.locator('.summary-bar').screenshot({ path: OUT + '/summary-forge.png' });
    await done(page);
  });

  await test.step('R1: the commander unlocked in the drawer gives a trade good for the token already spent', async () => {
    await openFaction(page);
    const unlock = drawer(page).getByTestId('component-leader:muaatcommander').locator('.segment > button').nth(1);
    await unlock.click();
    await closeDrawer(page, /^Faction/);
    await total(page, 'Trade goods', 1);
  });

  await test.step('R1: Trade as the secondary of another player', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '5 Trade' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Trade · secondary ability' })).toBeVisible();
    await total(page, 'Commodities', 4);
    await total(page, 'Strategy', 0);
    // Star Forge and this secondary each spent a token: two trade goods from the commander.
    await total(page, 'Trade goods', 2);
    await done(page);
  });

  await test.step('R1: tactical action in the home system, production', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 4);
    await total(page, 'Tactic', 1);
    await look(page, 'home1');
    await panel(page).getByRole('button', { name: /Open the shop/ }).click();
    await stage(page).getByRole('button', { name: 'Carrier', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Mech', exact: true }).click();
    await expect(stage(page).getByText('Bought: 2')).toBeVisible();
    await look(page, 'shop', '.stage-dialog');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await total(page, 'Resources', 0);
    await total(page, 'Trade goods', 1);
    await total(page, 'Fleet', 3);
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sol' }).click();
    const give = panel(page).getByRole('group', { name: 'Give' });
    const get = panel(page).getByRole('group', { name: 'Get' });
    await give.getByRole('button', { name: 'Add one Commodities' }).click();
    await give.getByRole('button', { name: 'Add one Commodities' }).click();
    await give.getByRole('button', { name: '+ Component' }).click();
    await picker(page).getByRole('button', { name: 'Choose Fires of the Gashlai' }).click();
    await get.getByRole('button', { name: 'Add one Trade goods' }).click();
    await get.getByRole('button', { name: '+ Component' }).click();
    await picker(page).getByRole('button', { name: 'Choose Military Support' }).click();
    await shot(page, '04-deal-sol');
    await panel(page).getByRole('button', { name: 'Back', exact: true }).click();
    await expect(panel(page).getByRole('button', { name: /^[+] Transaction with Sol:/ })).toContainText('Fires of the Gashlai');
    await expect(panel(page).getByRole('button', { name: /^[+] Transaction with Sol:/ })).toContainText('Military Support');
    await total(page, 'Trade goods', 2);
    await total(page, 'Commodities', 2);
    await done(page);
  });

  await test.step('R1: Sol plays the Fires of the Gashlai it was given', async () => {
    await actFor(page, 'Sol');
    await addAction(page, 'Component action');
    await choose(page, 'fires of the', 'Fires of the Gashlai');
    // 'Remove 1 token from the Muaat player's fleet pool': my pool goes from 3 to 2.
    await total(page, 'Fleet', 2);
    await done(page);
    await actFor(page, 'Mine');
  });

  await test.step('R1: the holdings after the deal: the note is back with me, Sol has the war sun technology', async () => {
    await openGroup(page, /^Cards/);
    await expect(drawer(page).getByTestId('component-promissory:fires@me')).toBeVisible();
    await expect(drawer(page)).toContainText('Military Support');
    await drawer(page).getByRole('button', { name: 'Sol', exact: true }).click();
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('war sun');
    // The war sun technology came by the plan, so its card has no button to take it away; Fires is not Sol's any more.
    await expect(drawer(page).getByRole('button', { name: 'Remove War Sun' })).toHaveCount(0);
    await expect(drawer(page).getByRole('button', { name: 'Add Fires of the Gashlai' })).toBeVisible();
    await shot(page, '05-sol-holdings');
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await closeDrawerAny(page);
  });

  await test.step('R1: the carrier into the supernova without the reactor: the warning stands', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 43);
    await dragRoute(page, [4, 43]);
    await take(page, 'Carrier');
    await take(page, 'Mech');
    await page.getByRole('button', { name: 'Fly' }).click();
    // Both warnings are right: the home system was activated by the production action of this round, and Magmus Reactor is not researched yet.
    await expect(standing(panel(page), 'sourceActivated').first()).toBeVisible();
    await expect(standing(panel(page), 'routeBlocked').first()).toBeVisible();
    await expect(waived(panel(page), 'routeBlocked')).toHaveCount(0);
    await shot(page, '06-supernova-warned');
    await done(page);
  });

  await test.step('R1: pass', async () => {
    await addAction(page, 'Pass');
    const took = panel(page).getByRole('group', { name: 'Taken and discarded' });
    for (const [query, name] of [['mining initiative', 'Mining Initiative'], ['economic initiative', 'Economic Initiative'], ['war effort', 'War Effort']]) {
      await took.getByRole('button', { name: '+ Took' }).click();
      await choose(page, query, name);
    }
    await expect(took).toContainText('War Effort');
    await done(page);
    await look(page, 'pass1');
  });

  await test.step('R1: status phase entry', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const status = panel(page).locator('.entry-editor, .status-editor').first();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Strategy' }).click();
    await panel(page).getByRole('button', { name: 'Add one Muaat' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'engineer a marvel', 'Engineer a Marvel');
    await panel(page).getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    await total(page, 'VP', 1);
    await total(page, 'Tactic', 1);
    await total(page, 'Strategy', 1);
    void status;
    await shot(page, '07-round1-end');
  });
});

test('round 2', async () => {
  await test.step('R2: a new round, the planets are ready again', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 2', exact: true })).toBeVisible();
    await total(page, 'Resources', 10);
    await total(page, 'Influence', 4);
    await total(page, 'Tactic', 1);
    await total(page, 'Fleet', 2);
    await total(page, 'Strategy', 1);
    await total(page, 'Trade goods', 2);
    await total(page, 'Commodities', 2);
    await shot(page, '08-round2-start');
  });

  await test.step('R2: the hero is unlocked in the drawer, Hacan has a cruiser in the supernova', async () => {
    await openFaction(page);
    await drawer(page).getByTestId('component-leader:muaathero').locator('.segment > button').nth(1).click();
    await closeDrawerAny(page);
    await tile(page, 43).click();
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Hacan' }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await tapTile(page, 62);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Hacan' }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await look(page, 'setups2');
  });

  await test.step('R2: Technology again, Magmus Reactor paid with planets', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'sarween tools', 'Sarween Tools');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'magmus reactor', 'Magmus Reactor');
    await expect(panel(page).getByText('Cost 6, paid 6')).toBeVisible();
    await done(page);
    await total(page, 'Resources', 4);
    await total(page, 'Influence', 3);
  });

  await test.step('R2: the war sun into the supernova with Magmus Reactor, production 5 there, the hero names the move', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 43);
    await dragRoute(page, [110, 43]);
    await take(page, 'War Sun');
    await take(page, 'Fighter', 4);
    await page.getByRole('button', { name: 'Fly' }).click();
    await expect(waived(panel(page), 'routeBlocked').first()).toContainText('Allowed by: Magmus Reactor');
    await expect(standing(panel(page), 'routeBlocked')).toHaveCount(0);
    await shot(page, '09-mr-waiver');
    await panel(page).getByRole('button', { name: /Open the shop/ }).click();
    for (let i = 0; i < 6; i += 1) await stage(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(panel(page).getByText('Production 5, and 6 units are built: each fighter and infantry counts.')).toBeVisible();
    await shot(page, '10-production-over');
    // Take two back in the shop: five units fit the production of the supernova.
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    for (let i = 0; i < 2; i += 1) await stage(page).getByRole('button', { name: 'Give back Fighter' }).first().click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'adjudicator', "Adjudicator Ba'al");
    await expect(standing(panel(page), 'productionBlockaded')).toHaveCount(1);
    await done(page);
    // 'Destroy all other players' units in that system': the Hacan cruiser is gone from the supernova, the one in Sem-Lore stays.
    await expect(tile(page, 43).locator('[data-unit=cruiser]')).toHaveCount(0);
    await expect(tile(page, 62).locator('[data-unit=cruiser]')).toHaveCount(1);
    // Technology 6 from the planets, the fighters 2 (Horizon 1 and a trade good).
    await total(page, 'Resources', 3);
    await total(page, 'Influence', 1);
    await total(page, 'Trade goods', 1);
    await total(page, 'Tactic', 0);
    await total(page, 'Fleet', 2);
    // BUG: the hero destroyed the Hacan cruiser (LRR hero text: after the move), yet the production of the same action still warns that the supernova holds other players' ships.
    await expect(standing(panel(page), 'productionBlockaded')).toHaveCount(1);
    await shot(page, '11-hero-blockade-warning');
  });

  await test.step('R2: the agent Umbat, used twice', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'umbat', 'Umbat');
    // BUG: Umbat says "choose a player": the Muaat may choose themselves, but the row offers the five opponents only.
    await expect(panel(page).getByRole('button', { name: 'Muaat', exact: true })).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Hacan', exact: true }).click();
    await shot(page, '12-umbat');
    await expect(panel(page).getByText(/exhausted/i)).toHaveCount(0);
    await done(page);
    await addAction(page, 'Component action');
    await choose(page, 'umbat', 'Umbat');
    await expect(panel(page).locator('li[data-code=componentExhausted]')).toHaveCount(1);
    await done(page);
  });

  await test.step('R2: Star Forge twice, the second time the strategy pool is empty; the mech brings an infantry', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'star forge', 'Star Forge');
    await panel(page).getByRole('button', { name: '43', exact: true }).click();
    await panel(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    await total(page, 'Strategy', 0);
    await total(page, 'Trade goods', 2);
    await expect(panel(page).locator('li[data-code=shortStrategy]')).toHaveCount(0);
    await expect(tile(page, 43).locator('[data-unit=infantry]')).toHaveCount(1);
    await done(page);
    await addAction(page, 'Component action');
    await choose(page, 'star forge', 'Star Forge');
    await panel(page).getByRole('button', { name: '43', exact: true }).click();
    await panel(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    // Strategy 2 -> -1 over the plan: the pool is empty at the second use and the warning says so; the commander still pays a trade good for a token spent.
    await expect(panel(page).getByText('Not enough strategy tokens: 0 left.')).toBeVisible();
    await done(page);
  });

  await test.step('R2: Mining Initiative from the hand', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('button', { name: 'Luthien VI', exact: true }).click();
    // The resource value of Luthien VI is 3.
    await total(page, 'Trade goods', 6);
    await done(page);
  });

  await test.step('R2: the promissory note of Sol, played from my hand', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'military support', 'Military Support');
    await panel(page).getByRole('button', { name: 'Luthien VI', exact: true }).click();
    await done(page);
  });

  await test.step('R2: a pass with a deal in which a neighbour gives a note and gets mine back', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Hacan' }).click();
    // My units stand in the supernova next to Sem-Lore, where Hacan has a cruiser: they are neighbours.
    await expect(panel(page).getByText('A transaction is only with a neighbour')).toHaveCount(0);
    const give = panel(page).getByRole('group', { name: 'Give' });
    const get = panel(page).getByRole('group', { name: 'Get' });
    await give.getByRole('button', { name: 'Add one Trade goods' }).click();
    await give.getByRole('button', { name: '+ Component' }).click();
    await picker(page).getByRole('button', { name: 'Choose Political Secret' }).click();
    await get.getByRole('button', { name: '+ Component' }).click();
    await picker(page).getByRole('button', { name: 'Choose Trade Convoys' }).click();
    await shot(page, '13-deal-hacan');
    await panel(page).getByRole('button', { name: 'Back', exact: true }).click();
    await expect(panel(page).getByRole('button', { name: /^[+] Transaction with Hacan:/ })).toContainText('Trade Convoys');
    await total(page, 'Trade goods', 5);
    await done(page);
  });

  await test.step('R2: status entry, two tactic tokens', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await total(page, 'Tactic', 2);
    await shot(page, '14-round2-end');
  });
});

test('round 3', async () => {
  await test.step('R3: a new round; Technology gives the war sun upgrade and a unit upgrade; the breakthrough is taken', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 3', exact: true })).toBeVisible();
    await total(page, 'Resources', 10);
    await total(page, 'Tactic', 2);
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'prototype war sun', 'Prototype War Sun II');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'destroyer ii', 'Destroyer II');
    await expect(panel(page).locator('li[data-code=prerequisitesMissing]')).toHaveCount(0);
    await expect(panel(page).getByText('Cost 6, paid 6')).toBeVisible();
    const took = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await took.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'quantumcore', 'The Quantumcore');
    await total(page, 'Resources', 4);
    await done(page);
    await openFaction(page);
    // BUG: the Quantumcore gives the breakthrough (it shows here), but the card's own effect does not run: Avernus never comes under my control (Resources stay 4, planets +2 expected).
    await expect(drawer(page).getByTestId('component-breakthrough:muaatbt')).toBeVisible();
    await closeDrawerAny(page);
  });

  await test.step('R3: Hacan fighters wait at Mecatol Rex; the war sun takes the way through the supernova with the upgrade', async () => {
    await tapTile(page, 112);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Hacan' }).click();
    await stage(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 112);
    await dragRoute(page, [43, 110, 80, 112]);
    await expect(waived(panel(page), 'routeBlocked').first()).toContainText('Allowed by: Gashlai Physiology');
    await expect(panel(page).locator('li[data-code=speedShort]')).toHaveCount(0);
    await take(page, 'War Sun');
    await take(page, 'Fighter', 3);
    const luthien = panel(page).getByRole('group', { name: 'Luthien VI' });
    await luthien.getByRole('button', { name: 'Take one Infantry' }).click();
    await luthien.getByRole('button', { name: 'Take one Infantry' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 5 of 6' })).toBeVisible();
    await shot(page, '15-flight-mecatol');
    await page.getByRole('button', { name: 'Fly' }).click();
    // The fighters and the mech left behind in the supernova are more than the carrier holds: a true warning of the plan.
    await expect(panel(page).getByText('System Supernova (43) is over capacity: 12 of 4.').first()).toBeVisible();
    const land = panel(page).getByRole('group', { name: 'Landing on Mecatol Rex' }).getByRole('button', { name: 'Land one Infantry' });
    await land.click();
    await land.click();
    await panel(page).getByRole('button', { name: /Start a battle/ }).click();
    await stage(page).getByRole('button', { name: 'Fighter ×3' }).click();
    await stage(page).getByRole('button', { name: 'Fighter ×2 (The Emirates of Hacan)' }).click();
    await look(page, 'battle2', '.stage-dialog');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(panel(page).getByText('Losses: Fighter 1').first()).toBeVisible();
    // The custodians token cannot be paid in the plan: the warning stays, and the first landing gives the point.
    await expect(panel(page).locator('li[data-code=custodians]')).toHaveCount(1);
    await expect(panel(page).locator('li[data-code=shortInfluence]')).toHaveCount(1);
    await done(page);
    await total(page, 'VP', 2);
    await tile(page, 112).locator('[data-unit=warsun]').waitFor();
    console.log('FIGHTERS112', JSON.stringify(await tile(page, 112).locator('[data-unit]').evaluateAll(all => all.map(u => [u.getAttribute('data-unit'), u.getAttribute('aria-label'), u.textContent]))));
  });

  await test.step('R3: the hero again: purged, so the warning says it is not held', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'adjudicator', "Adjudicator Ba'al");
    await expect(panel(page).locator('li[data-code=componentNotHeld]')).toHaveCount(1);
    const took = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await took.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'dynamis core', 'Dynamis Core');
    await done(page);
  });

  await test.step('R3: the relic played: trade goods equal to the commodity value, 4 and 2 more from the relic itself', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'dynamis core', 'Dynamis Core');
    await total(page, 'Trade goods', 11);
    await done(page);
  });

  await test.step('R3: War Effort and Industrial Initiative as component actions', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'war effort', 'War Effort');
    await panel(page).getByRole('button', { name: 'Mecatol Rex', exact: true }).click();
    await expect(tile(page, 112).locator('[data-unit=cruiser]')).toHaveCount(1);
    await done(page);
    await addAction(page, 'Component action');
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    // No industrial planet is mine: a legal play that gains nothing.
    await total(page, 'Trade goods', 11);
    await expect(panel(page).locator('li[data-code]')).toHaveCount(0);
    await done(page);
  });

  await test.step('R3: the home system: the flagship and two destroyers', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 4);
    await panel(page).getByRole('button', { name: /Open the shop/ }).click();
    // Prototype War Sun II: the war sun costs 10 now, not 12.
    await stage(page).getByRole('button', { name: 'War Sun', exact: true }).click();
    await expect(stage(page).getByText('Bought: 1')).toBeVisible();
    await expect(stage(page).locator('.stage-meters').first()).toContainText('10 / 15');
    await stage(page).getByRole('button', { name: 'Give back War Sun' }).first().click();
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(panel(page).getByText('System Muaat is over the fleet pool: 3 ships, 2 tokens.').first()).toBeVisible();
    await panel(page).getByRole('button', { name: /^Excess ships/ }).click();
    await stage(page).getByRole('button', { name: 'Remove one Destroyer' }).first().click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(panel(page).getByText(/over the fleet pool/)).toHaveCount(0);
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'economic initiative', 'Economic Initiative');
    await done(page);
  });

  await test.step('R3: a pass: the agent is ready again, two more technologies of other colours, a deal that brings my own note back', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'umbat', 'Umbat');
    // Exhausted in round 2, readied in its status phase.
    await expect(panel(page).locator('li[data-code=componentExhausted]')).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Letnev', exact: true }).click();
    await done(page);
    await addAction(page, 'Pass');
    const gained = panel(page).getByRole('group', { name: 'Taken and discarded' });
    for (const [query, name] of [['antimass', 'Antimass Deflectors'], ['neural motivator', 'Neural Motivator']]) {
      await gained.getByRole('button', { name: '+ Took' }).click();
      await choose(page, query, name);
    }
    await expect(gained).toContainText('Neural Motivator');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Hacan' }).click();
    await panel(page).getByRole('group', { name: 'Get' }).getByRole('button', { name: '+ Component' }).click();
    // The first of the list is my own note, the one I gave away: it comes back.
    await picker(page).getByRole('button', { name: 'Choose Political Secret' }).first().click();
    await expect(panel(page).locator('li[data-code]')).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Back', exact: true }).click();
    await expect(panel(page).getByRole('button', { name: /^[+] Transaction with Hacan:/ })).toContainText('get Political Secret');
    await done(page);
  });

  await test.step('R3: status, two public objectives (one more than the phase allows), points', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Muaat' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'develop weaponry', 'Develop Weaponry');
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'achieve supremacy', 'Achieve Supremacy');
    await expect(panel(page).getByText('At most one objective of each kind can be scored in a status phase, and here are 2 (public).')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Strategy' }).click();
    await total(page, 'VP', 3);
  });

  await test.step('R3: the agenda phase with Mecatol Rex held: a law', async () => {
    const agendas = page.getByRole('region', { name: 'Agenda' });
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'anti-intellectual', 'Anti-Intellectual Revolution');
    await panel(page).getByRole('button', { name: 'For', exact: true }).click();
    await done(page);
    await openGroup(page, /^Objectives & laws/);
    await expect(drawer(page).getByRole('group', { name: 'Laws' })).toContainText('Anti-Intellectual Revolution');
    await expect(drawer(page).getByRole('group', { name: 'Objectives' })).toContainText('Develop Weaponry');
    await shot(page, '16-laws-objectives');
    await closeDrawerAny(page);
  });

  await test.step('the plan as a whole: the entries of mine, the Now view, the final numbers', async () => {
    let mine = 0;
    for (const n of [1, 2, 3]) {
      await page.getByRole('button', { name: `Round ${n}`, exact: true }).click();
      mine += await panel(page).locator('.entry:not(.entry-rival)').count();
    }
    console.log('ENTRIES', mine, 'all', await panel(page).locator('.entry').count());
    await shot(page, '17-round3-end');
    await page.getByRole('button', { name: 'Now', exact: true }).click();
    await shot(page, '18-now-view');
    await page.getByRole('button', { name: 'Forecast', exact: true }).click();
    await look(page, 'end');
  });
});
