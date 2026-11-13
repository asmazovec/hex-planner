import { mkdirSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * One long game as the Barony of Letnev, eight players, Prophecy of Kings and Thunder's Edge on.
 * Seats: 1 Letnev (me), 2 Sol, 3 Hacan, 4 Argent Flight, 5 Nekro Virus, 6 Last Bastion, 7 Mahact, 8 Xxcha.
 * The map is a standard 4-ring map; Letnev home (tile 10) is at the top, Mecatol Rex (112) is four hexes south of it:
 * 10 -> 44 (asteroids) -> 36 (Arnor / Lor) -> 61 (Ang) -> 112.  27 (New Albion / Starpoint) and 72 (Lisis / Velnor) touch home.
 */
const MAP = '61 40 20 21 22 19 36 33 39 23 24 28 29 30 31 32 34 38 44 79 35 37 42 43 45 46 50 59 60 62 63 64 65 66 67 41 10 27 25 1 68 69 16 70 71 58 73 74 8 75 76 92 77 78 52 80 81 14 26 72';
const RIVALS = ['Sol', 'Hacan', 'Argent', 'Nekro', 'Bastion', 'Mahact', 'Xxcha'];
const SHOTS = 'test-results/scenarios/letnev';
const LOG = `${SHOTS}/notes.log`;
mkdirSync(SHOTS, { recursive: true });
writeFileSync(LOG, '');
const note = (s: string) => appendFileSync(LOG, `${s}\n`);

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });
const stage = (page: Page) => page.locator('.stage-dialog');
/** The entries of the plan itself. */
const entries = (page: Page) => page.getByRole('region', { name: 'Actions' }).locator('.entry');

const waivedLine = (scope: Locator, code: string) => scope.locator(`li.warning-waived[data-code="${code}"]`);
const standingLine = (scope: Locator, code: string) => scope.locator(`li[data-code="${code}"]:not(.warning-waived)`);

/** The summary number: the forecast after the arrow when there is one, else the only number. Waits for the closing animation of an arrow. */
async function sum(page: Page, name: string): Promise<number> {
  await expect(page.locator('.summary-bar .summary-forecast-leaving')).toHaveCount(0);
  const text = await page.locator(`.summary-cell[aria-label="${name}"]`).innerText();
  const m = text.match(/(-?\d+)\s*$/);
  if (!m) throw new Error(`no number in summary ${name}: ${text}`);
  return Number(m[1]);
}
/** The number the summary shows without the forecast: the first one. */
async function sumNow(page: Page, name: string): Promise<number> {
  await expect(page.locator('.summary-bar .summary-forecast-leaving')).toHaveCount(0);
  const text = await page.locator(`.summary-cell[aria-label="${name}"]`).innerText();
  const m = text.match(/(-?\d+)/);
  if (!m) throw new Error(`no number in summary ${name}: ${text}`);
  return Number(m[1]);
}
async function sumsNow(page: Page, names: string[]) {
  const out: Record<string, number> = {};
  for (const n of names) out[n] = await sumNow(page, n);
  return out;
}
async function mode(page: Page, which: 'Forecast' | 'Now') {
  await page.getByRole('button', { name: which, exact: true }).click();
}
async function sums(page: Page, names: string[]) {
  const out: Record<string, number> = {};
  for (const n of names) out[n] = await sum(page, n);
  return out;
}
const ALL = ['Resources', 'Influence', 'Trade goods', 'Commodities', 'Tactic', 'Fleet', 'Strategy', 'VP'];

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

async function waitStill(target: Locator): Promise<{ x: number; y: number }> {
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
async function dragRoute(page: Page, hexes: number[]) {
  const points = [];
  for (const n of hexes) points.push(await waitStill(tile(page, n)));
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.mouse.up();
}

async function choose(page: Page, query: string, name: string, id?: string) {
  const d = picker(page);
  await d.getByRole('searchbox', { name: 'Search components' }).fill(query);
  const scope = id ? d.getByTestId(`component-${id}`) : d;
  await scope.getByRole('button', { name: `Choose ${name}`, exact: true }).click();
  await expect(picker(page)).toHaveCount(0);
}

async function addAction(page: Page, type: string) {
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.locator('.action-list').getByRole('button', { name: type, exact: true }).click();
}
const done = (page: Page) => panel(page).getByRole('button', { name: 'Done', exact: true }).click();

/** Strategy cards: the first tap shows the card, the second makes it the backup, the third the main one. */
async function chooseCard(page: Page, card: string, taps = 3) {
  for (let i = 0; i < taps; i++) await page.getByRole('button', { name: card }).click();
}

async function createGame(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '＋ Add opponent' }).click();
  await page.getByRole('button', { name: '＋ Add opponent' }).click();
  await page.getByRole('button', { name: 'My faction', exact: true }).click();
  await page.getByRole('button', { name: 'The Barony of Letnev' }).click();
  for (let i = 0; i < RIVALS.length; i++) {
    await page.getByRole('button', { name: 'Opponent', exact: true }).nth(i).click();
    await page.getByRole('button', { name: new RegExp(RIVALS[i]) }).first().click();
  }
  await page.getByRole('textbox', { name: 'Game name' }).fill('Letnev long game');
  await page.getByRole('button', { name: 'Paste a Milty string' }).click();
  await page.getByLabel('Milty Draft map string').fill(MAP);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText(/tiles placed/)).toBeVisible();
  note(await page.locator('body').innerText().then(t => t.split('\n').filter(l => /placed|Home systems|Map layout/i.test(l)).join(' ; ')));
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await expect(tile(page, 10)).toBeVisible();
}

test.describe.configure({ mode: 'serial' });
test.use({ actionTimeout: 15_000, navigationTimeout: 30_000 });

test('Letnev: a long game, five rounds', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  const noErrors = () => expect(errors, errors.join('\n')).toEqual([]);

  await test.step('create the game on the first screen', async () => {
    await createGame(page);
    await noErrors();
    note(`start sums ${JSON.stringify(await sums(page, ALL))}`);
    await shot(page, '01-start');
  });

  await test.step('R1 strategy: Technology, two researches, second paid by planets', async () => {
    await chooseCard(page, '7 Technology');
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'sarween', 'Sarween Tools');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'magen', 'Magen Defense Grid', 'technology:md_base');
    note(await panel(page).innerText());
    await shot(page, '02-tech');
    await done(page);
    note(`after tech ${JSON.stringify(await sums(page, ALL))}`);
    await noErrors();
  });

  await test.step('R1 A2 tactical: take New Albion / Starpoint', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 27).click();
    await expect(page.getByText('Active system: New Albion / Starpoint')).toBeVisible();
    await dragRoute(page, [10, 27]);
    for (const u of ['Dreadnought', 'Carrier', 'Fighter', 'Infantry', 'Infantry', 'Infantry']) await panel(page).getByRole('button', { name: `Take one ${u}`, exact: true }).first().click();
    note('A2 flight: ' + await panel(page).innerText());
    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    note('A2 after fly: ' + await panel(page).innerText());
    const na = panel(page).getByRole('group', { name: 'Landing on New Albion' });
    const sp = panel(page).getByRole('group', { name: 'Landing on Starpoint' });
    await na.getByRole('button', { name: 'Land one Infantry' }).click();
    await na.getByRole('button', { name: 'Land one Infantry' }).click();
    await sp.getByRole('button', { name: 'Land one Infantry' }).click();
    note('A2 landed: ' + await panel(page).innerText());
    await shot(page, '03-a2');
    await done(page);
    await expect(entries(page)).toHaveCount(2);
    note(`after A2 forecast ${JSON.stringify(await sums(page, ALL))}`);
    await mode(page, 'Now');
    note(`after A2 now ${JSON.stringify(await sums(page, ALL))}`);
    note('now pressed: ' + await page.getByRole('button', { name: 'Now', exact: true }).getAttribute('aria-pressed') + ' ' + await page.locator('.summary-cell').first().innerText());
    await shot(page, '04-now');
    await mode(page, 'Forecast');
  });

  await test.step('R1 A3 tactical at home: produce with nothing left to pay with', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 10).click();
    await expect(page.getByText('Active system: Arc Prime / Wren Terra')).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const s = stage(page);
    await s.getByRole('button', { name: 'Cruiser', exact: true }).click();
    await s.getByRole('button', { name: 'Cruiser', exact: true }).click();
    await s.getByRole('button', { name: 'Fighter', exact: true }).click();
    note('A3 stage: ' + (await s.innerText()).replace(/\n/g, ' '));
    await s.getByRole('button', { name: 'Close' }).click();
    note('A3 panel: ' + await panel(page).innerText());
    await shot(page, '05-a3');
    await done(page);
    note(`after A3 forecast ${JSON.stringify(await sums(page, ALL))}`);
    // Sarween Tools reduces the 5 of the purchase by 1; nothing is left to pay with, so the entry is short by 4.
    await expect(entries(page)).toHaveCount(3);
    await expect(page.getByRole('region', { name: 'Actions' }).getByText(/Not enough resources: need 4, paid 0/)).toBeVisible();
  });

  await test.step('twist: drop the paid second research of round 1 and the purchase no longer warns', async () => {
    const technology = page.getByRole('button', { name: 'Edit: Strategy: Technology' });
    await entries(page).filter({ hasText: 'Strategy: Technology' }).click();
    await technology.click();
    await expect(panel(page).getByRole('button', { name: 'Remove Magen Defense Grid' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove Magen Defense Grid' }).click();
    note('A1 edited: ' + (await panel(page).innerText()).split('\n').slice(0, 40).join(' '));
    await done(page);
    note(`after twist forecast ${JSON.stringify(await sums(page, ALL))}`);
    await shot(page, '06-twist');
    await entries(page).nth(2).click();
    await page.getByRole('button', { name: /^Edit: Tactical action/ }).last().click();
    note('A3 after twist: ' + (await panel(page).innerText()).split('\n').join(' | '));
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    note('A3 manual: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(-900));
    await panel(page).getByRole('button', { name: 'Pick automatically' }).click();
    note('A3 auto: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(-500));
    // BUG (F1): the automatic payment ignores the -1 of Sarween Tools: header says "Cost 5", the check wants 4, and the
    // payment takes both planets (6) where Arc Prime (4) is enough.
    await expect(panel(page).getByText('Cost 5, paid 6')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    await panel(page).getByRole('button', { name: /^Wren Terra 2/ }).click();
    note('A3 manual 2: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(-500));
    await done(page);
    note(`after repay forecast ${JSON.stringify(await sums(page, ALL))}`);
    await expect(page.getByRole('region', { name: 'Actions' }).getByText(/Not enough resources/)).toHaveCount(0);
    await page.waitForTimeout(800);
    note('summary raw: ' + (await page.locator('.summary-bar').innerText()).replace(/\n/g, ' '));
    note('planet labels: ' + await page.locator('[aria-label^="Wren Terra"], [aria-label^="Arc Prime"], [aria-label^="New Albion"], [aria-label^="Starpoint"]').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).join(' ; ')));
    expect(await sums(page, ['Resources', 'Influence'])).toEqual({ Resources: 2, Influence: 1 });
    await shot(page, '06b-a3');
  });

  await test.step('R1 A4 secondary of Diplomacy readies Arc Prime', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '2 Diplomacy' }).click();
    await panel(page).getByRole('button', { name: /^Arc Prime/ }).click();
    await panel(page).getByRole('button', { name: /^Starpoint/ }).click();
    await shot(page, '07-diplomacy');
    await done(page);
    expect(await sums(page, ALL)).toMatchObject({ Resources: 9, Influence: 2, Strategy: 1, Tactic: 1 });
  });

  await test.step('R1 pass, status: two tokens, an action card drawn and one taken', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await page.getByRole('button', { name: 'Add one Tactic' }).click();
    await page.getByRole('button', { name: 'Add one Fleet' }).click();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'mining initiative', 'Mining Initiative');
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'refit troops', 'Refit Troops');
    note('status: ' + (await panel(page).innerText()).split('\n').join(' | '));
    await shot(page, '08-status');
    expect(await sums(page, ALL)).toMatchObject({ Tactic: 2, Fleet: 4, Strategy: 1 });
    await noErrors();
  });

  await test.step('R2 starts: planets are ready again, Trade primary', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 2', exact: true })).toBeVisible();
    note(`R2 start ${JSON.stringify(await sums(page, ALL))}`);
    await chooseCard(page, '5 Trade');
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Who uses the secondary for free' }).getByRole('button', { name: 'Sol', exact: true }).click();
    await shot(page, '09-trade');
    await done(page);
    expect(await sums(page, ALL)).toMatchObject({ 'Trade goods': 3, Commodities: 2, Strategy: 1 });
  });

  await test.step('R2 B2 secondary of Technology: Magen Defense Grid for 4 resources and a strategy token', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'magen', 'Magen Defense Grid', 'technology:md_base');
    note('B2: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(0, 1200));
    await shot(page, '10-tech-secondary');
    await done(page);
    note(`after B2 ${JSON.stringify(await sums(page, ALL))}`);
    expect(await sums(page, ALL)).toMatchObject({ Resources: 6, Influence: 3, Strategy: 0 });
  });

  await test.step('R2 B3 tactical: two groups cross the asteroid field to Arnor / Lor and land', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 36).click();
    await expect(page.getByText('Active system: Arnor / Lor')).toBeVisible();
    await dragRoute(page, [27, 44, 36]);
    for (const u of ['Dreadnought', 'Carrier', 'Fighter']) await panel(page).getByRole('button', { name: `Take one ${u}`, exact: true }).first().click();
    await panel(page).getByRole('group', { name: 'New Albion' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'New Albion' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Starpoint' }).getByRole('button', { name: 'Take one Infantry' }).click();
    // The second group starts in the home system: tap Back to the action, then add the cruisers by a second stroke.
    await panel(page).getByRole('button', { name: 'Back', exact: true }).click();
    await dragRoute(page, [10, 44, 36]);
    for (const u of ['Cruiser', 'Cruiser']) await panel(page).getByRole('button', { name: `Take one ${u}`, exact: true }).first().click();
    note('B3 picker: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(0, 2500));
    await shot(page, '11-b3');
    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    note('B3 action: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(0, 2500));
    await shot(page, '12-b3-action');
    // Dreadnought and carrier have speed 1 for a route of 2: the warnings stand (nothing forbids the flight).
    await expect(standingLine(panel(page), 'speedShort')).toHaveCount(2);
    // The asteroid field is allowed by Antimass Deflectors, which Letnev starts with: listed, struck through.
    await expect(waivedLine(panel(page), 'routeBlocked')).toHaveCount(2);
    await expect(waivedLine(panel(page), 'routeBlocked').first()).toContainText('Allowed by: Antimass Deflectors');
    await expect(standingLine(panel(page), 'routeBlocked')).toHaveCount(0);
    const arnor = panel(page).getByRole('group', { name: 'Landing on Arnor' });
    const lor = panel(page).getByRole('group', { name: 'Landing on Lor' });
    await arnor.getByRole('button', { name: 'Land one Infantry' }).click();
    await arnor.getByRole('button', { name: 'Land one Infantry' }).click();
    await lor.getByRole('button', { name: 'Land one Infantry' }).click();
    await done(page);
    await expect(page.getByRole('region', { name: 'Actions' }).locator('li.warning-waived[data-code="routeBlocked"]').first()).toBeAttached();
    note(`after B3 ${JSON.stringify(await sums(page, ALL))}`);
    expect(await sums(page, ALL)).toMatchObject({ Tactic: 1, Resources: 6, Influence: 3 });
  });

  await test.step('R2 B4 component action: Mining Initiative', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('button', { name: 'Starpoint', exact: true }).click();
    await shot(page, '13-mining');
    await done(page);
    // Starpoint is 3/1: three trade goods.
    expect(await sums(page, ALL)).toMatchObject({ 'Trade goods': 6, Resources: 6 });
  });

  await test.step('R2 B5 component action: Refit Troops turns one infantry on Arnor into a mech', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'refit troops', 'Refit Troops');
    await panel(page).getByRole('button', { name: 'Replace one Infantry on Arnor', exact: true }).click();
    await panel(page).getByRole('button', { name: 'Replace one Infantry on Lor', exact: true }).click();
    await shot(page, '14-refit');
    await done(page);
    await tile(page, 36).click();
    note('36 stage: ' + await stage(page).getByRole('img').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).join(' | ')));
    await shot(page, '15-arnor-stage');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  await test.step('R2 B6 tactical at home: a dreadnought and a mech, paid by a planet and trade goods', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 10).click();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const s = stage(page);
    await s.getByRole('button', { name: 'Dreadnought', exact: true }).click();
    await s.getByRole('button', { name: 'Mech, Arc Prime', exact: true }).click();
    note('B6 stage: ' + (await s.innerText()).replace(/\n/g, ' '));
    await s.getByRole('button', { name: 'Close' }).click();
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    await panel(page).getByRole('button', { name: /^New Albion 1/ }).click();
    await panel(page).getByRole('button', { name: /^Wren Terra 2/ }).click();
    note('B6 trade good buttons: ' + await panel(page).getByRole('button').evaluateAll(a => a.map(x => x.getAttribute('aria-label') || x.textContent).filter(x => /trade/i.test(x ?? '')).join(' | ')));
    await panel(page).getByRole('button', { name: /^Add one trade good/i }).click();
    await panel(page).getByRole('button', { name: /^Add one trade good/i }).click();
    note('B6 payment: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(-700));
    await shot(page, '16-b6');
    await done(page);
    note(`after B6 ${JSON.stringify(await sums(page, ALL))}`);
  });

  await test.step('faction drawer: look at every faction component', async () => {
    await page.getByRole('button', { name: /^Components/ }).click();
    await expect(drawer(page)).toBeVisible();
    await groupTab(page, /^Faction/).click();
    note('faction drawer: ' + (await drawer(page).innerText()).split('\n').join(' | ').slice(0, 3500));
    note('faction ids: ' + await drawer(page).locator('[data-testid^="component-"]').evaluateAll(a => a.map(x => x.getAttribute('data-testid')).join(' ')));
    await shot(page, '17-faction-drawer');
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('gravleash');
    note('gravleash search: ' + (await drawer(page).innerText()).split('\n').join(' | ').slice(-600));
    note('gravleash buttons: ' + await drawer(page).getByRole('button').evaluateAll(a => a.map(x => x.getAttribute('aria-label') || x.textContent).join(' | ')).then(s => s.slice(-400)));
    await shot(page, '18-breakthrough');
    const list = page.getByRole('region', { name: 'Actions' });
    const speedLines = list.locator('li[data-code="speedShort"]:not(.warning-waived)');
    const before = await speedLines.count();
    await drawer(page).getByRole('button', { name: 'Add Gravleash Maneuvers' }).click();
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await expect(drawer(page).getByTestId('component-breakthrough:letnevbt')).toBeVisible();
    // Gravleash lends the speed of the fastest ship *starting in the same system*: dreadnought and carrier start together at 27 and stay short.
    note(`speed warnings before/after Gravleash: ${before}/${await speedLines.count()}`);
    expect(await speedLines.count()).toBe(before);
    // The commander and the hero are unlocked by hand; the agent is open from the start.
    await drawer(page).getByTestId('component-leader:letnevcommander').getByRole('button', { name: 'Unlocked' }).click();
    await drawer(page).getByTestId('component-leader:letnevhero').getByRole('button', { name: 'Unlocked' }).click();
    await expect(drawer(page).getByTestId('component-leader:letnevhero').getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await expect(drawer(page).getByTestId('component-leader:letnevagent').getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await shot(page, '19-leaders');
    await groupTab(page, /^Faction/).click();
    await expect(drawer(page)).toHaveCount(0);
  });

  await test.step('R2 B7 pass with a transaction: War Funding and commodities to Sol, trade goods back', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sol', exact: true }).click();
    await panel(page).getByRole('button', { name: '+ Component' }).first().click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('war funding');
    await picker(page).getByRole('button', { name: 'Choose War Funding' }).click();
    const give = panel(page).getByRole('group', { name: 'Give' });
    const get = panel(page).getByRole('group', { name: 'Get' });
    note('transaction groups: ' + await panel(page).getByRole('group').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).join(' | ')));
    await give.getByRole('button', { name: 'Add one Commodities' }).click();
    await give.getByRole('button', { name: 'Add one Commodities' }).click();
    await get.getByRole('button', { name: 'Add one Trade goods' }).click();
    await get.getByRole('button', { name: 'Add one Trade goods' }).click();
    note('transaction: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(0, 900));
    await shot(page, '20-transaction');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    note('pass after transaction: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(0, 1200));
    await done(page);
    note(`after B7 ${JSON.stringify(await sums(page, ALL))}`);
    // Sol is no neighbour (Sol home is three hexes away from every unit I have): the rule 94.1 warning stands on the entry.
    await expect(standingLine(page.getByRole('region', { name: 'Actions' }), 'notNeighbor')).toHaveCount(1);
    expect(await sums(page, ['Trade goods', 'Commodities'])).toEqual({ 'Trade goods': 6, Commodities: 0 });
  });

  await test.step('what Sol holds now: the Letnev promissory note, with its owner named', async () => {
    await page.getByRole('button', { name: /^Components/ }).click();
    await groupTab(page, /^Cards/).click();
    note('mine cards: ' + (await drawer(page).innerText()).split('\n').join(' | ').slice(0, 900));
    await drawer(page).getByRole('button', { name: 'Sol', exact: true }).click();
    note('sol cards: ' + (await drawer(page).innerText()).split('\n').join(' | ').slice(0, 1500));
    await shot(page, '21-sol-cards');
    await expect(drawer(page)).toContainText('War Funding');
    await drawer(page).getByRole('button', { name: 'Mine', exact: true }).click();
    await expect(drawer(page).getByTestId('component-promissory:war_funding')).toHaveCount(0);
    await groupTab(page, /^Cards/).click();
  });

  await test.step('R2 status: tokens, the Lead objective, cards for next round', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    const objectives = panel(page).getByRole('group', { name: 'Objectives scored' });
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'lead from', 'Lead From the Front');
    void objectives;
    await expect(panel(page).getByText('Objective Lead From the Front is scored without its requirement: 0 of 3.')).toBeVisible();
    const cost = panel(page).getByRole('group', { name: 'What scoring cost' });
    note('cost groups: ' + await panel(page).getByRole('group').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).join(' | ')));
    await cost.getByRole('button', { name: 'Add one Tactic' }).click();
    await cost.getByRole('button', { name: 'Add one Tactic' }).click();
    await page.waitForTimeout(1500);
    note('cost block: ' + (await cost.innerText()).replace(/\n/g, ' | '));
    note('lead warn: ' + (await panel(page).innerText()).split('\n').filter(l => /Objective|Lead/.test(l)).join(' | '));
    await expect(panel(page).getByText(/Lead From the Front is scored without its requirement/)).toBeVisible();
    // Only 2 tokens were gained this phase: the objective cannot be paid for. Switch to Trade Routes (5 trade goods of the 6 held).
    await panel(page).getByRole('button', { name: 'Remove Lead From the Front' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'trade routes', 'Negotiate Trade Routes');
    const cost2 = panel(page).getByRole('group', { name: 'What scoring cost' });
    for (let i = 0; i < 5; i++) await cost2.getByRole('button', { name: /^Add one trade good/i }).click();
    await panel(page).getByRole('button', { name: 'Add one Letnev' }).click();
    note('after scoring: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(-1500));
    await shot(page, '22-status-r2');
    expect(await sums(page, ALL)).toMatchObject({ 'Trade goods': 1, VP: 1, Tactic: 2 });
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    for (const [q, n] of [['economic initiative', 'Economic Initiative'], ['harness', 'Harness Energy'], ['direct hit', 'Direct Hit']]) {
      await taken.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await shot(page, '23-status-r2-cards');
    await noErrors();
  });

  await test.step('R3 starts: planets ready, six planets of mine, tokens carried over', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 3', exact: true })).toBeVisible();
    note(`R3 start ${JSON.stringify(await sums(page, ALL))}`);
    // Arc Prime 4 + Wren Terra 2 + New Albion 1 + Starpoint 3 + Arnor 2 + Lor 1 = 13 resources; 0+1+1+1+1+2 = 6 influence.
    expect(await sums(page, ALL)).toEqual({ Resources: 13, Influence: 6, 'Trade goods': 1, Commodities: 0, Tactic: 2, Fleet: 4, Strategy: 0, VP: 1 });
  });

  await test.step('R3 setup: Hacan holds Mecatol Rex with a cruiser and two infantry (opponent units are set on the board directly)', async () => {
    await tile(page, 112).click();
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Hacan', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await shot(page, '24-setup');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  await test.step('R3 C1 Technology primary: a research without its prerequisites warns, the right one does not', async () => {
    await chooseCard(page, '7 Technology');
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'dreadnought ii', 'Dreadnought II');
    // Dreadnought II needs two propulsion and one cybernetic prerequisite; Letnev holds one propulsion (Antimass Deflectors) and one cybernetic (Sarween).
    note('C1 invalid: ' + (await panel(page).innerText()).split('\n').filter(l => /prerequisite|need|lack/i.test(l)).join(' | '));
    await expect(standingLine(panel(page), 'prerequisitesMissing')).toHaveCount(1);
    await panel(page).getByRole('button', { name: 'Remove Dreadnought II' }).click();
    await expect(standingLine(panel(page), 'prerequisitesMissing')).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'gravity drive', 'Gravity Drive');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'l4 disruptors', 'L4 Disruptors');
    note('C1 valid: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(300, 1100));
    await shot(page, '26-c1');
    await done(page);
    note(`after C1 ${JSON.stringify(await sums(page, ALL))}`);
    expect(await sums(page, ['Resources', 'Influence'])).toEqual({ Resources: 7, Influence: 5 });
  });

  await test.step('R3 C2 tactical: the fleet flies to Mecatol Rex, Gravleash Maneuvers lends the dreadnought and carrier the cruisers\' speed', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 112).click();
    await expect(page.getByText('Active system: Mecatol Rex')).toBeVisible();
    await dragRoute(page, [36, 61, 112]);
    for (const u of ['Dreadnought', 'Carrier', 'Cruiser', 'Cruiser', 'Fighter']) await panel(page).getByRole('button', { name: `Take one ${u}`, exact: true }).first().click();
    await panel(page).getByRole('group', { name: 'Arnor' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Arnor' }).getByRole('button', { name: 'Take one Mech' }).click();
    await panel(page).getByRole('group', { name: 'Lor' }).getByRole('button', { name: 'Take one Mech' }).click();
    note('C2 picker: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(0, 2200));
    await shot(page, '27-c2-picker');
    // Dreadnought and carrier (speed 1) start in the same system as the cruisers (speed 2): the breakthrough gives them 2.
    await expect(standingLine(panel(page), 'speedShort')).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    note('C2 action: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(0, 2600));
    await shot(page, '28-c2-action');
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    // Space combat: a cruiser of mine and the Hacan cruiser are lost.
    await stage(page).getByRole('button', { name: 'Cruiser ×2', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Cruiser ×1 (The Emirates of Hacan)', exact: true }).click();
    await shot(page, '29-battle');
    note('battle after: ' + (await stage(page).innerText()).replace(/\n/g, ' | '));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    // Landing: the infantry and both mechs go down on Mecatol Rex.
    const mecatol = panel(page).getByRole('group', { name: 'Landing on Mecatol Rex' });
    await mecatol.getByRole('button', { name: 'Land one Infantry' }).click();
    await mecatol.getByRole('button', { name: 'Land one Mech' }).click();
    await mecatol.getByRole('button', { name: 'Land one Mech' }).click();
    // Ground combat against the two Hacan infantry: they are lost.
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await stage(page).getByRole('button', { name: 'Infantry ×2 (The Emirates of Hacan)', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry ×1 (The Emirates of Hacan)', exact: true }).click();
    note('battle 2: ' + (await stage(page).innerText()).replace(/\n/g, ' | ') + ' // ' + await stage(page).getByRole('button').evaluateAll(a => a.map(x => x.getAttribute('aria-label') || x.textContent).join(' | ')));
    await shot(page, '30-ground-battle');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    // The agent, a combat action card and Harness Energy are named in «Used».
    const used = panel(page).locator('[role="group"]').filter({ has: page.getByRole('button', { name: '+ Used' }) }).last();
    for (const [q, n] of [['viscount', 'Viscount Unlenn'], ['direct hit', 'Direct Hit'], ['harness', 'Harness Energy']]) {
      await used.getByRole('button', { name: '+ Used' }).click();
      await choose(page, q, n);
    }
    await shot(page, '31-c2-final');
    // BUG (F3): the first landing on Mecatol Rex warns "Not enough influence: need 6, paid 0" with "paid" fixed at 0: no control in the
    // action takes the payment, and the same sentence of the custodians warning says "the plan does not record" it.
    await expect(standingLine(panel(page), 'custodians')).toHaveCount(1);
    await expect(standingLine(panel(page), 'shortInfluence')).toHaveCount(1);
    await expect(panel(page).getByRole('button', { name: /Choose manually/ })).toHaveCount(0);
    // BUG (F4): Mecatol Rex is no anomaly, yet Harness Energy ("After you activate an anomaly") was accepted with no warning and filled the commodities.
    await expect(standingLine(panel(page), 'playCondition')).toHaveCount(0);
    await done(page);
    note(`after C2 ${JSON.stringify(await sums(page, ALL))}`);
    expect(await sums(page, ALL)).toMatchObject({ Tactic: 1, VP: 2, Commodities: 2 });
  });

  await test.step('R3 C3 manual adjustment: the commander gains a trade good, Munitions Reserves spends two', async () => {
    await addAction(page, 'Manual adjustment');
    await panel(page).getByRole('button', { name: 'Add one Trade goods' }).click();
    await panel(page).getByRole('button', { name: 'Add one Trade goods' }).click();
    await panel(page).getByRole('button', { name: 'Add one Trade goods' }).click();
    await panel(page).getByRole('button', { name: 'Remove one Trade goods' }).click();
    await panel(page).getByRole('button', { name: 'Remove one Trade goods' }).click();
    const used = panel(page).locator('[role="group"]').filter({ has: page.getByRole('button', { name: '+ Used' }) }).last();
    for (const [q, n] of [['munitions', 'Munitions Reserves'], ['rear admiral', 'Rear Admiral Farran']]) {
      await used.getByRole('button', { name: '+ Used' }).click();
      await choose(page, q, n);
    }
    await shot(page, '32-c3');
    await done(page);
    // 1 held, +3 −2 by hand: 2 trade goods.
    expect(await sums(page, ['Trade goods'])).toEqual({ 'Trade goods': 2 });
  });

  await test.step('R3 C4 component action: the hero Darktalon Treilla is played and purged', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'darktalon', 'Darktalon Treilla');
    await shot(page, '33-hero');
    note('hero action: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(0, 600));
    await done(page);
    await page.getByRole('button', { name: /^Components/ }).click();
    await groupTab(page, /^Faction/).click();
    note('hero state after play: ' + await drawer(page).getByTestId('component-leader:letnevhero').innerText().then(t => t.replace(/\n/g, ' | ')));
    await shot(page, '34-hero-purged');
    await expect(drawer(page).getByTestId('component-leader:letnevhero').getByRole('button', { name: 'Purged' })).toHaveAttribute('aria-pressed', 'true');
    await groupTab(page, /^Faction/).click();
  });

  await test.step('R3 C5 tactical at home: five destroyers beyond the fleet pool; the played hero allows it; the agent used twice warns', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 10).click();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    for (let i = 0; i < 5; i++) await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    note('C5 stage: ' + (await stage(page).innerText()).replace(/\n/g, ' | ').slice(-500));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    const used = panel(page).locator('[role="group"]').filter({ has: page.getByRole('button', { name: '+ Used' }) }).last();
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'viscount', 'Viscount Unlenn');
    note('C5 panel: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(0, 2400));
    await shot(page, '35-c5');
    await expect(waivedLine(panel(page), 'fleetPool').first()).toContainText('Allowed by: Darktalon Treilla');
    await expect(standingLine(panel(page), 'fleetPool')).toHaveCount(0);
    await expect(standingLine(panel(page), 'componentExhausted')).toHaveCount(1);
    await done(page);
    note(`after C5 ${JSON.stringify(await sums(page, ALL))}`);
  });

  await test.step('R3 C6/C7 component actions: Industrial Initiative pays per industrial planet, Economic Initiative readies cultural ones', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    await done(page);
    // New Albion, Arnor and Lor are industrial: three trade goods on top of the two held.
    expect(await sums(page, ['Trade goods'])).toEqual({ 'Trade goods': 5 });
    await addAction(page, 'Component action');
    await choose(page, 'economic initiative', 'Economic Initiative');
    await done(page);
    // I control no cultural planet: nothing is readied.
    expect(await sums(page, ['Resources', 'Influence'])).toEqual({ Resources: 2, Influence: 3 });
  });

  await test.step('R3 C8 pass, C9 status with Raise a Fleet scored, C10 agenda with a law', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Strategy' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'raise a fleet', 'Raise a Fleet');
    await panel(page).getByRole('button', { name: 'Add one Letnev' }).click();
    note('C9 status: ' + (await panel(page).innerText()).split('\n').filter(l => /Objective|requirement|of \d/.test(l)).join(' | '));
    await expect(panel(page).getByText(/Raise a Fleet is scored without its requirement/)).toHaveCount(0);
    await shot(page, '36-status-r3');
    await page.getByRole('region', { name: 'Agenda' }).getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'anti-intellectual', 'Anti-Intellectual Revolution');
    await expect(panel(page).getByTestId('component-agenda:revolution')).toContainText('law: stays in play');
    await done(page);
    await expect(page.getByRole('region', { name: 'Agenda' }).getByRole('listitem', { name: 'Agenda: Anti-Intellectual Revolution' })).toBeVisible();
    note(`end of R3 ${JSON.stringify(await sums(page, ALL))}`);
    await noErrors();
  });

  await test.step('twist: delete the round 2 move to Arnor / Lor, and every later round recomputes', async () => {
    await page.getByRole('button', { name: 'Round 2', exact: true }).click();
    const row = page.getByRole('listitem', { name: /^Tactical action · Arnor \/ Lor/ });
    const list = page.getByRole('region', { name: 'Actions' });
    const missing = list.locator('li[data-code="unitsMissing"], li[data-code="landingOverLimit"]');
    expect(await missing.count()).toBe(0);
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(entries(page)).toHaveCount(6);
    await page.waitForTimeout(500);
    const r2 = await missing.count();
    const r2Text = await list.innerText();
    await page.getByRole('button', { name: 'Round 3', exact: true }).click();
    await page.waitForTimeout(500);
    const r3 = await missing.count();
    note(`after delete: missing-unit warnings R2=${r2} R3=${r3}; R3 text: ` + (await page.getByRole('region', { name: 'Actions' }).innerText()).replace(/\n/g, ' | ').slice(0, 1500));
    note('R2 text: ' + r2Text.replace(/\n/g, ' | ').slice(0, 1500));
    await shot(page, '38-after-delete');
    expect(r2 + r3).toBeGreaterThan(0);
    // The summary of the last round no longer holds Arnor and Lor.
    note(`R3 sums after delete ${JSON.stringify(await sums(page, ALL))}`);
    // Undo brings the move back and every warning goes with it.
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.waitForTimeout(500);
    expect(await missing.count()).toBe(0);
    await page.getByRole('button', { name: 'Round 2', exact: true }).click();
    await expect(entries(page)).toHaveCount(7);
    expect(await missing.count()).toBe(0);
    await page.getByRole('button', { name: 'Round 3', exact: true }).click();
    expect(await sums(page, ALL)).toEqual({ Resources: 14, Influence: 12, 'Trade goods': 5, Commodities: 2, Tactic: 1, Fleet: 4, Strategy: 1, VP: 3 });
  });

  await test.step('R4 D1: the flagship and a mech are bought; a second flagship warns', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 4', exact: true })).toBeVisible();
    note(`R4 start ${JSON.stringify(await sums(page, ALL))}`);
    await chooseCard(page, '7 Technology', 2); // the backup: the card is only looked at here, the secondary is played below
    await addAction(page, 'Tactical action');
    await tile(page, 10).click();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Mech, Arc Prime', exact: true }).click();
    note('D1 stage: ' + (await stage(page).innerText()).replace(/\n/g, ' | ').slice(-700));
    await shot(page, '39-flagship');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    note('D1 panel: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(600, 1800));
    // One flagship exists: the second purchase goes beyond the stock.
    await expect(panel(page).getByText(/Flagship: 0 of 1 are already on the board/)).toBeVisible();
    await panel(page).getByRole('button', { name: /Production/ }).first().click();
    note('D1 give back buttons: ' + await stage(page).getByRole('button').evaluateAll(a => a.map(x => x.getAttribute('aria-label') || x.textContent).filter(x => /back/i.test(x ?? '')).join(' | ')));
    await stage(page).getByRole('button', { name: /^Give back Flagship/ }).first().click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(panel(page).getByText(/Flagship: 0 of 1 are already on the board/)).toHaveCount(0);
    await shot(page, '40-d1');
    note('D1 after fix: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(700, 1700));
    // The hero's round is over: the home system holds 8 ships against 6 tokens, and the two extra are removed as losses.
    await expect(panel(page).getByText(/Still to remove: 2/)).toBeVisible();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    note('D1 battle buttons: ' + await stage(page).getByRole('button').evaluateAll(a => a.map(x => x.getAttribute('aria-label') || x.textContent).join(' | ')));
    await stage(page).getByRole('button', { name: /^Destroyer ×/ }).first().click();
    await stage(page).getByRole('button', { name: /^Destroyer ×/ }).first().click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    note('D1 after losses: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(700, 1800));
    await expect(standingLine(panel(page), 'fleetPool')).toHaveCount(0);
    await done(page);
    note(`after D1 ${JSON.stringify(await sums(page, ALL))}`);
  });

  await test.step('R4 D2 tactical: the flagship carries a mech to Lisis / Velnor with no tactic token left', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 72).click();
    await expect(page.getByText('Active system: Lisis / Velnor')).toBeVisible();
    await dragRoute(page, [10, 72]);
    await panel(page).getByRole('button', { name: 'Take one Flagship', exact: true }).first().click();
    await panel(page).getByRole('group', { name: 'Arc Prime' }).getByRole('button', { name: 'Take one Mech' }).first().click();
    note('D2 picker: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(0, 900));
    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    const lisis = panel(page).getByRole('group', { name: 'Landing on Lisis' });
    await lisis.getByRole('button', { name: 'Land one Mech' }).click();
    note('D2 action: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(0, 1800));
    await shot(page, '41-d2');
    // No tactic token is left in the pool (0 after D1): the action names it.
    note('D2 tactic warning lines: ' + await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code')).join(',')));
    await done(page);
    note(`after D2 ${JSON.stringify(await sums(page, ALL))}`);
  });

  await test.step('R4 D3 secondary of Technology: Non-Euclidean Shielding, the relic Dynamis Core taken on the way', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'non-euclidean', 'Non-Euclidean Shielding');
    await expect(standingLine(panel(page), 'prerequisitesMissing')).toHaveCount(0);
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'dynamis', 'Dynamis Core');
    await shot(page, '42-d3');
    await done(page);
    note(`after D3 ${JSON.stringify(await sums(page, ALL))}`);
  });

  await test.step('R4 D4 component action: Dynamis Core pays trade goods equal to the commodity value (2 + 2)', async () => {
    const before = await sum(page, 'Trade goods');
    await addAction(page, 'Component action');
    await choose(page, 'dynamis', 'Dynamis Core');
    await done(page);
    note(`after D4 ${JSON.stringify(await sums(page, ALL))}`);
    expect(await sum(page, 'Trade goods')).toBe(before + 4);
  });

  await test.step('R4 pass and status; R5: the agent readied in the status phase can be used again without a warning', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 5', exact: true })).toBeVisible();
    await addAction(page, 'Pass');
    const used = panel(page).locator('[role="group"]').filter({ has: page.getByRole('button', { name: '+ Used' }) }).last();
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'viscount', 'Viscount Unlenn');
    await expect(standingLine(panel(page), 'componentExhausted')).toHaveCount(0);
    // The hero was purged in round 3: playing it again is warned of.
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'darktalon', 'Darktalon Treilla');
    note('R5 pass warnings: ' + await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code')).join(',')));
    await shot(page, '43-r5-pass');
    await done(page);
    // BUG (F8, likely): the purged hero named in «Used» of a later round makes no warning, though a second component action with it does (componentNotHeld).
    await addAction(page, 'Component action');
    await choose(page, 'darktalon', 'Darktalon Treilla');
    note('R5 hero again as action warnings: ' + await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code')).join(',')));
    await expect(standingLine(panel(page), 'componentNotHeld')).toHaveCount(1);
    await done(page);
    note(`R5 ${JSON.stringify(await sums(page, ALL))}`);
    await noErrors();
  });


  await test.step('R5 Technology primary: a green technology and the unit upgrade Dreadnought II, prerequisites in order', async () => {
    await page.getByRole('button', { name: 'Round 5', exact: true }).click();
    await chooseCard(page, '7 Technology');
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'neural motivator', 'Neural Motivator');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'dreadnought ii', 'Dreadnought II');
    // Propulsion 2 (Antimass Deflectors, Gravity Drive) and cybernetic 1 (Sarween Tools): nothing is missing.
    await expect(standingLine(panel(page), 'prerequisitesMissing')).toHaveCount(0);
    await expect(standingLine(panel(page), 'shortResources')).toHaveCount(0);
    note('R5 tech: ' + (await panel(page).innerText()).split('\n').join(' | ').slice(300, 1000));
    await shot(page, '43b-r5-tech');
    await done(page);
    note(`after R5 tech ${JSON.stringify(await sums(page, ALL))}`);
  });

  await test.step('twist: drag the last component action of round 3 below the pass: it is warned of; dragging it back clears the warning', async () => {
    await page.getByRole('button', { name: 'Round 3', exact: true }).click();
    const list = page.getByRole('region', { name: 'Actions' });
    const rows = list.getByRole('listitem');
    const order = async () => (await entries(page).evaluateAll(a => a.map(x => (x as HTMLElement).innerText.split('\n')[0]))).join(' > ');
    const dragRow = async (fromIndex: number, toIndex: number) => {
      const handle = rows.nth(fromIndex).getByRole('button', { name: 'Drag to move' });
      const to = (await rows.nth(toIndex).boundingBox())!;
      const from = (await handle.boundingBox())!;
      await handle.hover();
      await page.mouse.down();
      await page.waitForTimeout(100);
      await page.mouse.move(from.x + from.width / 2, from.y + (to.y - from.y) / 2, { steps: 10 });
      await page.mouse.move(from.x + from.width / 2, to.y + to.height / 2 + (toIndex > fromIndex ? 30 : -30), { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(700);
    };
    const afterPass = list.locator('li[data-code="actionAfterPass"]:not(.warning-waived)');
    note('order before: ' + await order());
    expect(await afterPass.count()).toBe(0);
    // Rows: strategy, tactical 1, manual, component, tactical 2, component, component, pass.
    const last = await rows.count();
    await dragRow(last - 2, last - 1);
    note('order after: ' + await order());
    await shot(page, '51-reordered');
    expect(await afterPass.count()).toBeGreaterThan(0);
    await dragRow(last - 1, last - 2);
    note('order restored: ' + await order());
    expect(await afterPass.count()).toBe(0);
  });


  await test.step('the Now mode counts only done entries', async () => {
    await page.getByRole('button', { name: 'Round 1', exact: true }).click();
    await mode(page, 'Now');
    const start = await sumsNow(page, ALL);
    note(`R1 Now before ticking: ${JSON.stringify(start)}`);
    expect(start).toMatchObject({ Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 });
    await page.getByRole('listitem', { name: /^Tactical action · New Albion/ }).getByRole('checkbox', { name: 'Done' }).check();
    await page.waitForTimeout(500);
    const after = await sumsNow(page, ALL);
    note(`R1 Now after ticking the move: ${JSON.stringify(after)}`);
    expect(after).toMatchObject({ Tactic: 2 });
    await shot(page, '44-now');
    await mode(page, 'Forecast');
  });

  await test.step('export the game: the file holds every entry of mine, the leaders and the faction', async () => {
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export to file' }).click();
    const file = testInfo.outputPath('letnev-game.json');
    await (await download).saveAs(file);
    const exported = JSON.parse(readFileSync(file, 'utf8')) as { faction: string; plans: { rounds: { entries: { owner?: string }[] }[] }[] };
    const mine = exported.plans[0].rounds.flatMap(r => r.entries).filter(e => e.owner === undefined).length;
    note(`exported: faction ${exported.faction}, rounds ${exported.plans[0].rounds.length}, my entries ${mine}`);
    expect(exported.faction).toBe('letnev');
    expect(exported.plans[0].rounds).toHaveLength(5);
    expect(mine).toBeGreaterThanOrEqual(25);
    await page.getByRole('button', { name: 'Plan & map' }).click();
  });

  await test.step('drawers: technologies held, Thunder\'s Edge, players, legend, the Russian interface has no raw keys', async () => {
    await page.getByRole('button', { name: 'Round 4', exact: true }).click();
    await page.getByRole('button', { name: /^Components/ }).click();
    await groupTab(page, /^Relics/).click();
    await expect(drawer(page).getByTestId('component-relic:dynamiscore')).toHaveCount(0); // purged by its action
    await groupTab(page, /^Technologies/).click();
    note('techs: ' + (await drawer(page).innerText()).split('\n').join(' | ').slice(0, 900));
    for (const name of ['Sarween Tools', 'Magen Defense Grid', 'Gravity Drive', 'L4 Disruptors', 'Non-Euclidean Shielding', 'Antimass Deflectors', 'Plasma Scoring']) {
      await expect(drawer(page).getByRole('group', { name: 'Researched technologies' })).toContainText(name);
    }
    await groupTab(page, /^Technologies/).click();
    await page.getByRole('button', { name: /^Thunder's Edge/ }).click();
    note('TE drawer: ' + (await page.locator('.drawer-under, [role="dialog"]').last().innerText()).split('\n').join(' | ').slice(0, 700));
    await shot(page, '45-te-drawer');
    await page.getByRole('button', { name: /^Thunder's Edge/ }).click();
    await page.getByRole('button', { name: 'Players', exact: true }).click();
    await shot(page, '46-players-drawer');
    await page.getByTestId('drawer-scrim').click({ position: { x: 1100, y: 400 } });
    await page.getByRole('button', { name: 'Legend', exact: true }).click();
    await shot(page, '47-legend');
    await page.getByTestId('drawer-scrim').click({ position: { x: 1100, y: 400 } });
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    await page.getByRole('radio', { name: 'Русский' }).click();
    await page.getByRole('button', { name: 'План и карта' }).click();
    await page.waitForTimeout(800);
    await shot(page, '48-russian-plan');
    const body = await page.locator('body').innerText();
    const rawKeys = body.split('\n').filter(l => /^[a-z]+(\.[a-zA-Z]+)+$/.test(l.trim()));
    note('raw keys: ' + rawKeys.join(' | '));
    expect(rawKeys).toEqual([]);
    await page.getByRole('button', { name: /^Компоненты/ }).click();
    await page.waitForTimeout(500);
    await shot(page, '49-russian-components');
    await noErrors();
  });

  // NEXT-STEP
});
