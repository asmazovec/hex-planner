import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * One long game as the Winnu, played through the interface. Five players: the Winnu (me, seat 1), Sardakk Norr, the
 * Argent Flight, the Crimson Rebellion (Thunder's Edge), the Emirates of Hacan. Prophecy of Kings and Thunder's Edge on.
 *
 * The map (axial q,r; the home of seat 1 on top, Mecatol Rex in the middle):
 *   ring 1: 65 Primor (0,-1), 78, 39 alpha, 67 Cormund, 40 beta, 69
 *   Winnu home 7 at (0,-3); 27 New Albion / Starpoint (0,-2) lies between it and Primor.
 */

/** The Milty string: 36 tokens in ring order, the home tiles of the seats at the ring-3 corners. */
const SLOTS: Record<number, number> = { 0: 65, 1: 78, 2: 39, 3: 67, 4: 40, 5: 69, 6: 27, 7: 66, 8: 19, 9: 26, 10: 44, 11: 42, 12: 47, 13: 25, 14: 29, 15: 30, 16: 73, 17: 34, 18: 7, 19: 62, 20: 36, 21: 13, 22: 22, 23: 79, 24: 58, 25: 41, 26: 32, 27: 24, 28: 23, 29: 28, 30: 118, 31: 20, 32: 45, 33: 16, 34: 43, 35: 21 };
const MAP = Array.from({ length: 36 }, (_, i) => SLOTS[i]).join(' ');
const OPPONENTS = ['Sardakk Norr', 'The Argent Flight', 'The Crimson Rebellion', 'The Emirates of Hacan'];

const FOLDER = 'test-results/scenarios/winnu';
const problems: string[] = [];
const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const stage = (page: Page) => page.locator('.stage-dialog');
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const summary = (page: Page, name: string) => page.locator('.summary-cell').and(page.getByRole('group', { name, exact: true }));
const fan = (page: Page) => page.getByRole('group', { name: 'Drawers' });
const entries = (page: Page) => page.getByRole('region', { name: 'Actions' }).locator('.entry');
let shots = 0;
const shot = async (page: Page, name: string) => { shots += 1; await page.screenshot({ path: `${FOLDER}/${String(shots).padStart(2, '0')}-${name}.png` }); };

/** The number a summary group shows: the figure at its end. */
async function figure(page: Page, name: string): Promise<number> {
  const text = (await summary(page, name).innerText()).trim();
  return Number(text.match(/-?\d+$/)![0]);
}
const expectFigures = async (page: Page, want: Record<string, number>) => {
  for (const [name, value] of Object.entries(want)) await expect.poll(() => figure(page, name), { message: name }).toBe(value);
};

async function centreWhenStill(target: Locator): Promise<{ x: number; y: number }> {
  let last = '';
  await expect.poll(async () => { const now = JSON.stringify(await target.boundingBox()); const still = now === last; last = now; return still; }, { intervals: [150] }).toBe(true);
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
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
async function openGroup(page: Page, group: RegExp): Promise<void> {
  if (!(await drawer(page).isVisible())) await page.getByRole('button', { name: /^Components/ }).click();
  await expect(drawer(page)).toBeVisible();
  const tab = fan(page).getByRole('button', { name: group });
  if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-pressed', 'true');
}
async function closeDrawer(page: Page): Promise<void> {
  if (!(await drawer(page).isVisible())) return;
  await fan(page).locator('button[aria-pressed=true]').click();
  await expect(drawer(page)).toHaveCount(0);
}
async function addComponentByHand(page: Page, query: string, name: string): Promise<void> {
  if (!(await drawer(page).isVisible())) await page.getByRole('button', { name: /^Components/ }).click();
  await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill(query);
  await drawer(page).getByRole('button', { name: `Add ${name}` }).click();
  await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
}

async function newGame(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Remove opponent' }).last().click();
  await page.getByRole('button', { name: 'My faction', exact: true }).click();
  await page.getByRole('button', { name: 'The Winnu' }).click();
  for (const f of OPPONENTS) {
    await page.getByRole('button', { name: 'Opponent', exact: true }).filter({ hasText: 'Choose a faction' }).first().click();
    await page.getByRole('button', { name: f, exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Paste a Milty string' }).click();
  await page.getByLabel('Milty Draft map string').fill(MAP);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('31 tiles placed.')).toBeVisible();
  await expect(page.getByText('Home systems placed: 5.')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('textbox', { name: 'Game name' }).fill('Winnu');
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await expect(tile(page, 65)).toBeVisible();
}

test.beforeAll(() => {
  if (!existsSync(FOLDER)) mkdirSync(FOLDER, { recursive: true });
  for (const f of readdirSync(FOLDER)) if (/^\d\d-.*\.png$/.test(f)) rmSync(`${FOLDER}/${f}`);
});
test.beforeEach(({ page }) => {
  page.setDefaultTimeout(10_000);
  problems.length = 0;
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
});
test.afterEach(() => { expect(problems).toEqual([]); });

test('winnu: rounds 1 to 3', async ({ page }) => {
  await test.step('start the game', async () => {
    await newGame(page);
    await expectFigures(page, { Resources: 3, Influence: 4, 'Trade goods': 0, Commodities: 0, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 });
    await shot(page, 'start');
  });
  await test.step('start technology by hand', async () => {
    // The sheet says "Chosen at setup: 1 of these" but offers no way to choose: the technology is added from the drawer.
    await addComponentByHand(page, 'sarween', 'Sarween Tools');
    await closeDrawer(page);
  });
  await test.step('strategy: technology', async () => {
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'scanlink', 'Scanlink Drone Network');
    await shot(page, 'research');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
  });
  await test.step('tactical to New Albion: carrier with two infantry and two fighters', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 27).click();
    await dragRoute(page, [7, 27]);
    await expect(page.getByText('Flight Winnu → New Albion / Starpoint')).toBeVisible();
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Take one Infantry' }).first().click();
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Take one Fighter' }).first().click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await page.getByRole('group', { name: 'Landing on Starpoint' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await page.getByRole('group', { name: 'Landing on New Albion' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('button', { name: /Battle/ }).click();
    await stage(page).getByRole('button', { name: 'Fighter ×2' }).click();
    await page.waitForTimeout(500);
    await shot(page, 'battle-loss');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(panel(page)).toContainText('Losses: Fighter 1');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    // The captured planets are exhausted: only the home planet is ready.
    await expectFigures(page, { Resources: 3, Influence: 4, Tactic: 2 });
  });
  await test.step('tactical at home: production with Sarween Tools', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 7).click();
    await expect(page.getByText('Active system: Winnu')).toBeVisible();
    await panel(page).getByRole('button', { name: /Production/ }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    // A cruiser (2) and two fighters (1) cost 3; Sarween Tools takes 1 of it: 2 are due, the home planet pays 3.
    await expect(panel(page)).toContainText('Cost 3, paid 3');
    await expect(panel(page).locator('li[data-code="shortResources"]')).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    await expectFigures(page, { Resources: 0, Tactic: 1 });
  });
  await test.step('secondary of the Trade card', async () => {
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: '5 Trade' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Trade · secondary ability' })).toBeVisible();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'mining initiative', 'Mining Initiative');
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'rise of a messiah', 'Rise of a Messiah');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    await expectFigures(page, { Commodities: 3, Strategy: 1 });
  });
  await test.step('component action: Mining Initiative', async () => {
    await addAction(page, 'Component action');
    await expect(picker(page)).toBeVisible();
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('button', { name: 'Starpoint', exact: true }).click();
    await shot(page, 'mining-initiative');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    // Mining Initiative: trade goods equal to the resource value of Starpoint, 3.
    await expectFigures(page, { 'Trade goods': 3 });
  });
  await test.step('pass, then the status entry', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await page.getByRole('button', { name: 'Add one Tactic' }).click();
    await page.getByRole('button', { name: 'Add one Fleet' }).click();
    await expect(panel(page)).toContainText('Distribute tokens: 0 left');
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'lead from the front', 'Lead From the Front');
    await page.getByRole('button', { name: 'Add one Winnu' }).click();
    // Lead From the Front: "spend a total of 3 tokens from your tactic and/or strategy pools". The pools hold 1 + 1.
    await expect(panel(page)).toContainText('is scored without its requirement: 2 of 3');
    // BUG: the block "What scoring cost" takes the tokens spent, but the check of this objective reads the pools only
    // (publicObjective/lead.ts `requirement`) and never calls spentOnObjectives: the warning stays and the pools stay.
    const pools = async () => [await figure(page, 'Tactic'), await figure(page, 'Strategy'), await figure(page, 'Trade goods')];
    const before = await pools();
    await page.getByRole('button', { name: 'Add one Tactic' }).nth(1).click();
    await page.getByRole('button', { name: 'Add one Strategy' }).nth(1).click();
    await page.getByRole('button', { name: 'Add one trade good' }).last().click();
    expect(await pools()).toEqual(before);
    await expect(panel(page)).toContainText('is scored without its requirement: 2 of 3');
    await shot(page, 'status-scored');
    await page.getByRole('button', { name: 'Edit: Tokens and points' }).click();
    await expectFigures(page, { VP: 1, Resources: 7, Influence: 6, 'Trade goods': 3, Commodities: 3, Fleet: 4 });
  });
  await test.step('all of round 1 done: the Now figures count what was done', async () => {
    const ticks = page.getByRole('region', { name: 'Actions' }).getByRole('checkbox', { name: 'Done' });
    for (let i = 0; i < await ticks.count(); i++) await ticks.nth(i).check();
    await page.getByRole('button', { name: 'Now', exact: true }).click();
    await shot(page, 'round-1-now');
    await page.getByRole('button', { name: 'Forecast', exact: true }).click();
  });
  await test.step('round 2 opens: the Imperator breakthrough is added by hand', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await addComponentByHand(page, 'imperator', 'Imperator');
    await openGroup(page, /^Faction/);
    await expect(drawer(page)).toContainText('Imperator');
    await shot(page, 'faction-with-breakthrough');
    await closeDrawer(page);
  });
  await test.step('round 2: Trade as my own card, primary ability', async () => {
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '5 Trade' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    // 3 trade goods and the commodities replenished (3 for the Winnu): the plan so far had 3 goods and 3 commodities.
    await expectFigures(page, { 'Trade goods': 6, Commodities: 3, Strategy: 1 });
  });
  await test.step('tactical to Primor: a carrier from New Albion takes two infantry', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 65).click();
    await dragRoute(page, [27, 65]);
    await expect(page.getByText('Flight New Albion / Starpoint → Primor')).toBeVisible();
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await page.getByRole('button', { name: 'Take one Fighter' }).first().click();
    // One infantry from each planet of the source: the first button is New Albion's, the last Starpoint's.
    await page.getByRole('button', { name: 'Take one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Take one Infantry' }).last().click();
    await expect(page.getByRole('heading', { name: 'Cargo on board: 3 of 4' })).toBeVisible();
    await expect(panel(page).locator('li[data-code="capacitySystem"]')).toHaveCount(0);
    await shot(page, 'primor-flight');
    await page.getByRole('button', { name: 'Fly' }).click();
    await page.getByRole('group', { name: 'Landing on Primor' }).getByRole('button', { name: 'Land one Infantry' }).first().click();
    await page.getByRole('group', { name: 'Landing on Primor' }).getByRole('button', { name: 'Land one Infantry' }).first().click();
    await shot(page, 'primor-landed');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    await expectFigures(page, { Tactic: 1 });
  });
  await test.step('secondary of Technology: Hegemonic Trade Policy, paid by Starpoint and a trade good', async () => {
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Technology · secondary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'hegemonic', 'Hegemonic Trade Policy');
    await expect(panel(page)).toContainText('Cost 4, paid 4');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    // Technology secondary: the strategy token goes, Starpoint and New Albion are exhausted.
    await expectFigures(page, { Strategy: 0 });
  });
  await test.step('tactical at home: a flagship and a mech, paid by the home planet and trade goods', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 7).click();
    await expect(page.getByText('Active system: Winnu')).toBeVisible();
    await panel(page).getByRole('button', { name: /Production/ }).click();
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Mech', exact: true }).click();
    await shot(page, 'shop-flagship-mech');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Choose manually' }).click();
    await page.getByRole('button', { name: 'Remove one trade good' }).click();
    await page.getByRole('button', { name: 'Remove one trade good' }).click();
    // Flagship 8 and mech 2 make 10; Sarween Tools takes 1: 9 are due, 3 + 4 trade goods pay 7.
    const shortWarning = panel(page).locator('li[data-code="shortResources"]:not(.warning-waived)');
    await expect(shortWarning).toContainText('need 9, paid 7, short by 2');
    await shot(page, 'short-by-two');
    // The agent of the Winnu reduces the cost by 2: the shortfall is covered, and the warning stays listed as allowed.
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'berekar', 'Berekar Berekon');
    await expect(shortWarning).toHaveCount(0);
    const allowed = panel(page).locator('li.warning-waived[data-code="shortResources"]');
    await expect(allowed).toContainText('Allowed by: Berekar Berekon');
    expect(await allowed.locator('.warning-text').evaluate(el => getComputedStyle(el).textDecorationLine)).toContain('line-through');
    await shot(page, 'agent-allows');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    await expectFigures(page, { 'Trade goods': 2, Tactic: 0 });
  });
  await test.step('component action: Rise of a Messiah', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'rise of a messiah', 'Rise of a Messiah');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    // One infantry on each planet of mine: the home planet, New Albion, Starpoint and Primor.
    await tile(page, 65).click();
    await expect(stage(page)).toBeVisible();
    await shot(page, 'primor-after-messiah');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });
  await test.step('pass with a transaction: the Winnu promissory note goes to Sardakk, Tekklar Legion comes back', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sardakk' }).click();
    const give = panel(page).getByRole('group', { name: 'Give', exact: true });
    const get = panel(page).getByRole('group', { name: 'Get', exact: true });
    await give.getByRole('button', { name: '+ Component' }).click();
    await choose(page, 'acquiescence', 'Acquiescence');
    await get.getByRole('button', { name: '+ Component' }).click();
    await choose(page, 'tekklar', 'Tekklar Legion');
    await shot(page, 'transaction-filled');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await expect(panel(page).getByRole('button', { name: 'Transaction with Sardakk: give Acquiescence; get Tekklar Legion' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
  });
  await test.step('the promissory note is in the hand of the holder, Tekklar Legion in mine', async () => {
    await openGroup(page, /^Cards/);
    await expect(drawer(page)).toContainText('Tekklar Legion');
    await shot(page, 'my-cards-with-tekklar');
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByText('Sar', { exact: true }).click();
    await shot(page, 'sardakk-cards');
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByText('Mine', { exact: true }).click();
    await closeDrawer(page);
  });
  await test.step('status of round 2: two tactic tokens', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await page.getByRole('button', { name: 'Add one Tactic' }).click();
    await page.getByRole('button', { name: 'Add one Tactic' }).click();
    await expect(panel(page)).toContainText('Distribute tokens: 0 left');
    await page.getByRole('button', { name: 'Edit: Tokens and points' }).click();
    // Tactic: 1 left in round 2 before the tactical action at home took the last one, plus two; the pools start the round at 2.
    await expectFigures(page, { Tactic: 2, Fleet: 4, Strategy: 0, VP: 1, 'Trade goods': 2 });
    const ticks = page.getByRole('region', { name: 'Actions' }).getByRole('checkbox', { name: 'Done' });
    for (let i = 0; i < await ticks.count(); i++) await ticks.nth(i).check();
  });
  const snapshot = async () => ({
    figures: await page.locator('.summary-cell').allInnerTexts(),
    ticks: await page.getByRole('checkbox').evaluateAll(all => all.map(c => (c as HTMLInputElement).checked)),
    entries: await entries(page).allInnerTexts(),
  });
  let before: Awaited<ReturnType<typeof snapshot>>;
  let exportedFile = '';
  await test.step('export the game, delete it, import it back', async () => {
    await page.waitForTimeout(800);
    before = await snapshot();
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export to file' }).click();
    const file = test.info().outputPath('winnu.json');
    await (await download).saveAs(file);
    const exported = JSON.parse(readFileSync(file, 'utf8')) as { faction: string; plans: { rounds: { entries: unknown[] }[] }[] };
    expect(exported.faction).toBe('winnu');
    await shot(page, 'game-screen-before-delete');
    exportedFile = file;
  });
  await test.step('delete the game for good', async () => {
    await page.locator('.saved-list').getByRole('button', { name: /Delete/ }).click();
    await page.getByRole('button', { name: 'Delete for good' }).click();
    await expect(page.getByText('No saved games')).toBeVisible();
  });
  await test.step('import the file: everything is back', async () => {
    await page.locator('input[type=file]').setInputFiles({ name: 'winnu.json', mimeType: 'application/json', buffer: readFileSync(exportedFile) });
    await expect(page.locator('.saved-list li')).toHaveCount(1);
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 65)).toBeVisible();
    await page.getByRole('button', { name: 'Forecast', exact: true }).click();
    await page.getByRole('button', { name: 'Round 2', exact: true }).click();
    const after = await snapshot();
    expect(after.figures).toEqual(before.figures);
    expect(after.entries).toEqual(before.entries);
    await shot(page, 'after-import');
  });
  await test.step('reload the page: the same game, the same numbers', async () => {
    await page.reload();
    // The game has a name: the address opens it on the plan screen where it was left.
    await expect(tile(page, 65)).toBeVisible();
    await page.getByRole('button', { name: 'Round 2', exact: true }).click();
    const after = await snapshot();
    expect(after.figures).toEqual(before.figures);
    expect(after.entries).toEqual(before.entries);
    await shot(page, 'after-reload');
  });
  await test.step('round 3 opens: the hero is unlocked by hand, more technologies and a relic are added', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await openGroup(page, /^Faction/);
    // Locked, Unlocked, Purged: the second segment of the hero.
    await drawer(page).getByTestId('component-leader:winnuhero').locator('.segment > button').nth(1).click();
    await expect(drawer(page).getByTestId('component-leader:winnuhero').locator('.segment > button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await shot(page, 'hero-unlocked');
    for (const [query, name] of [['neural motivator', 'Neural Motivator'], ['plasma scoring', 'Plasma Scoring'], ['carrier ii', 'Carrier II'], ['shard of the throne', 'Shard of the Throne']]) await addComponentByHand(page, query, name);
    await openGroup(page, /^Technologies/);
    // BUG (low): a researched unit upgrade is not in the list "Researched technologies" (it has to carry the II mark there);
    // it shows only in the block "Unit upgrades" below, with its better numbers.
    await expect(drawer(page).getByRole('group', { name: 'Researched technologies' })).not.toContainText('Carrier II');
    await expect(drawer(page).getByRole('group', { name: 'Researched technologies' })).toContainText('Plasma Scoring');
    await expect(drawer(page)).toContainText('4 → 6');
    await shot(page, 'technologies-so-far');
    await closeDrawer(page);
  });
  await test.step('round 3: Technology as my card, two researches: the second costs 6', async () => {
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'antimass', 'Antimass Deflectors');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'gravity drive', 'Gravity Drive');
    await expect(panel(page)).toContainText('Technology: 2');
    await expect(panel(page)).toContainText('The first is free, the second costs 6 resources.');
    await shot(page, 'research-two');
    await expect(panel(page)).toContainText('Cost 6, paid 6');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
  });
  await test.step('a Reclaimer is set at Primor by hand: it could not get there in two rounds', async () => {
    await tile(page, 65).click();
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Mech', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(entries(page).filter({ hasText: 'Setup · Primor' })).toHaveCount(1);
  });
  await test.step('tactical to Mecatol Rex: infantry and the Reclaimer land, structures from the reinforcements', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 112).click();
    await dragRoute(page, [65, 112]);
    await expect(page.getByText('Flight Primor → Mecatol Rex')).toBeVisible();
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await page.getByRole('button', { name: 'Take one Mech' }).first().click();
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Take one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Take one Fighter' }).first().click();
    await expect(page.getByRole('heading', { name: 'Cargo on board: 4 of 6' })).toBeVisible();
    await page.getByRole('button', { name: 'Fly' }).click();
    const landing = page.getByRole('group', { name: 'Landing on Mecatol Rex' });
    for (let i = 0; i < 2; i++) await landing.getByRole('button', { name: 'Land one Infantry' }).click();
    await landing.getByRole('button', { name: 'Land one Mech' }).click();
    await expect(panel(page).locator('li.warning-waived[data-code="custodians"]')).toContainText('Allowed by: Blood Ties');
    await expect(panel(page).locator('li.warning-waived[data-code="shortInfluence"]')).toContainText('Allowed by: Blood Ties');
    // Reclamation: a PDS and a space dock from the reinforcements; the Reclaimer standing there allows one more structure.
    await landing.getByRole('button', { name: 'Land one PDS' }).click();
    await landing.getByRole('button', { name: 'Land one Space dock' }).click();
    // BUG: Thunder's Edge is on, so Mecatol Rex is tile 112 with the planet `mrte`. Reclamation compares the planet with
    // `mr` only (ability/reclamation.ts: `params.planetId === MECATOL_PLANET`, `control[MECATOL_PLANET]`): it never fires
    // here, and "1 PDS and 1 space dock from your reinforcements on Mecatol Rex" stand as missing from the space area.
    const missing = panel(page).locator('li[data-code="unitsMissing"]:not(.warning-waived)');
    await expect(missing).toHaveCount(2);
    await expect(panel(page).locator('li.warning-waived[data-code="unitsMissing"]')).toHaveCount(0);
    // The Reclaimer standing on the planet allows one structure: with the PDS given back, the dock is allowed by it.
    await landing.getByRole('button', { name: 'Give back PDS' }).click();
    await expect(panel(page).locator('li.warning-waived[data-code="unitsMissing"]')).toContainText('Allowed by: Reclaimer');
    await expect(missing).toHaveCount(0);
    await shot(page, 'reclaimer-allows-dock');
    await expect(panel(page).locator('li[data-code="capacitySystem"]')).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
  });
  await test.step('Mecatol Rex is mine: the commander is unlocked by hand and the plan shows its hint in a battle', async () => {
    await openGroup(page, /^Faction/);
    await drawer(page).getByTestId('component-leader:winnucommander').locator('.segment > button').nth(1).click();
    await closeDrawer(page);
    await expectFigures(page, { Tactic: 1, VP: 2 });
  });
  await test.step('hero of the Winnu: the primary of the Imperial card without holding it', async () => {
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: '8 Imperial' }).click();
    await expect(panel(page)).toContainText('Not enough strategy tokens: 0 left.');
    await panel(page).getByRole('button', { name: /^Primary/ }).click();
    await expect(panel(page).getByRole('heading', { name: 'Imperial · primary ability' })).toBeVisible();
    // The card is not mine this round: its primary is warned of, and costs a token the pool does not hold.
    await shot(page, 'imperial-before-hero');
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'mathis', 'Mathis Mathinus');
    await expect(panel(page).locator('li[data-code="foreignPrimary"].warning-waived')).toContainText('Allowed by: Mathis Mathinus');
    await expect(panel(page).locator('li[data-code="shortStrategy"]')).toHaveCount(0);
    await panel(page).getByText('I control Mecatol Rex: +1 point').click();
    await shot(page, 'imperial-with-hero');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    // 2 points so far (Lead From the Front, Mecatol Rex custodians) and 1 more for the Imperial primary with Mecatol held.
    await expectFigures(page, { VP: 3, Strategy: 0 });
  });
  await test.step('the hero is purged; a second use of it warns', async () => {
    await openGroup(page, /^Faction/);
    await expect(drawer(page).getByTestId('component-leader:winnuhero').locator('.segment > button').nth(2)).toHaveAttribute('aria-pressed', 'true');
    await shot(page, 'hero-purged');
    await closeDrawer(page);
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: '3 Politics' }).click();
    await panel(page).getByRole('button', { name: /^Primary/ }).click();
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'mathis', 'Mathis Mathinus');
    await expect(panel(page).locator('li[data-code="componentNotHeld"]')).toContainText('Mathis Mathinus');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    await page.getByRole('listitem', { name: /Strategy: Politics/ }).getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('listitem', { name: /Strategy: Politics/ })).toHaveCount(0);
  });
  await test.step('tactical to Primor from home: the flagship is one system short, the Imperator breakthrough allows it', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 65).click();
    await dragRoute(page, [7, 27, 65]);
    await expect(page.getByText('Distance: 2')).toBeVisible();
    await page.getByRole('button', { name: 'Take one Flagship' }).click();
    await page.getByRole('button', { name: 'Take one Mech' }).first().click();
    await page.getByRole('button', { name: 'Take one Infantry' }).first().click();
    await expect(panel(page).locator('li[data-code="speedShort"].warning-waived').first()).toContainText('Allowed by: Imperator');
    await expect(panel(page).locator('li[data-code="speedShort"]:not(.warning-waived)')).toHaveCount(0);
    await page.getByRole('button', { name: 'Fly' }).click();
    const landing = page.getByRole('group', { name: 'Landing on Primor' });
    await landing.getByRole('button', { name: 'Land one Mech' }).click();
    await landing.getByRole('button', { name: 'Land one Infantry' }).click();
    await shot(page, 'flagship-at-primor');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    await expectFigures(page, { Tactic: 0 });
  });
  await test.step('component action: Focused Research researches Lazax Gate Folding (two propulsion technologies held)', async () => {
    await addComponentByHand(page, 'focused research', 'Focused Research');
    await closeDrawer(page);
    await addAction(page, 'Component action');
    await choose(page, 'focused research', 'Focused Research');
    await expect(panel(page)).toContainText('Not enough trade goods: need 4, have 2.');
    // BUG (medium): the list of technologies is one horizontal strip of cramped cells that runs past the right edge of the panel
    // (names broken in the middle of words); the panel scrolls sideways to reach a technology.
    await shot(page, 'focused-research-list');
    const strip = await panel(page).getByRole('button', { name: 'Lazax Gate Folding', exact: true }).boundingBox();
    expect(strip!.x + strip!.width).toBeGreaterThan(1180);
    // BUG (low): the list of technologies to research names the Keleres technology that Thunder's Edge replaces by its raw id.
    await expect(panel(page)).toContainText('technology:iihq');
    await panel(page).getByRole('button', { name: 'Lazax Gate Folding', exact: true }).click();
    await shot(page, 'focused-research');
    // Two propulsion technologies (Antimass Deflectors, Gravity Drive) are held: no prerequisite warning.
    await expect(panel(page).locator('li[data-code="prerequisites"], li[data-code="techPrerequisite"]')).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
  });
  await test.step('component action: Lazax Gate Folding places an infantry on Mecatol Rex', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'lazax', 'Lazax Gate Folding');
    // BUG: I control Mecatol Rex (the custodians point is in the figures), but the technology's condition looks at the
    // planet `mr`, not `mrte` of Thunder's Edge (technology/lgf.ts:27, 33, 37): it warns, and no infantry is placed.
    await expect(panel(page).locator('li[data-code="componentCondition"]:not(.warning-waived)')).toContainText('Mecatol Rex');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    await tile(page, 112).click();
    await expect(stage(page).getByRole('button', { name: 'Infantry ×2' })).toBeVisible();
    await expect(stage(page).getByRole('button', { name: 'Infantry ×3' })).toHaveCount(0);
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });
  const codes = (scope: Locator) => scope.locator('li[data-code]').evaluateAll(all => all.map(li => `${li.getAttribute('data-code')}:${li.className}:${(li as HTMLElement).innerText.replaceAll('\n', ' ')}`));
  await test.step('Industrial Initiative with the agent named in Used: the agent readied in the status phase, no warning', async () => {
    await addComponentByHand(page, 'industrial initiative', 'Industrial Initiative');
    await addComponentByHand(page, 'flank speed', 'Flank Speed');
    await closeDrawer(page);
    await addAction(page, 'Component action');
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'berekar', 'Berekar Berekon');
    await page.waitForTimeout(800);
    expect(await codes(panel(page))).toEqual([]);
    await shot(page, 'agent-first-use');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    // New Albion is the one industrial planet of mine: one trade good on top of the 0 left after Focused Research.
    await expectFigures(page, { 'Trade goods': 1 });
  });
  await test.step('the legendary planet Primor: The Atrament, the agent named a second time: it is exhausted', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'atrament', 'The Atrament');
    await panel(page).getByRole('button', { name: 'Winnu', exact: true }).click();
    await page.getByRole('button', { name: 'Add one Infantry' }).click();
    await page.getByRole('button', { name: 'Add one Infantry' }).click();
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'berekar', 'Berekar Berekon');
    await page.waitForTimeout(800);
    await expect(panel(page).locator('li[data-code="componentExhausted"]')).toContainText('Berekar Berekon is exhausted');
    await shot(page, 'agent-second-use');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
  });
  await test.step('a pass that names the exhausted agent: the warning is in the row, not in the editor', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'berekar', 'Berekar Berekon');
    await page.waitForTimeout(800);
    // BUG (low): the warning "is exhausted, readied only in the status phase" is made for the pass too (it stands in the row below), but the
    // editor of a pass shows it nowhere: the block "Used" lists no warning, unlike the editor of a component action.
    expect(await codes(panel(page))).toEqual([]);
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
    await expect(entries(page).filter({ hasText: /^Pass/ }).last()).toContainText('Berekar Berekon is exhausted');
  });
  await test.step('Flank Speed named in Used of the Primor action; the commander shows its hint in the battle step', async () => {
    await page.getByRole('button', { name: 'Edit: Tactical action · Primor' }).click();
    await expect(panel(page).getByRole('button', { name: /Rickar Rickani/ })).toBeVisible();
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'flank speed', 'Flank Speed');
    await page.waitForTimeout(800);
    await shot(page, 'primor-flank-speed');
    await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
  });
  await test.step('the board after the round: Mecatol Rex and Primor', async () => {
    await tile(page, 112).click();
    await expect(stage(page).getByRole('button', { name: 'Infantry ×2' })).toBeVisible();
    await expect(stage(page).getByRole('button', { name: 'Mech ×1' })).toBeVisible();
    await shot(page, 'mecatol-stage');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await tile(page, 65).click();
    await expect(stage(page).getByRole('button', { name: 'Flagship ×1' })).toBeVisible();
    await expect(stage(page).getByRole('button', { name: 'Mech ×1' })).toBeVisible();
    await shot(page, 'primor-stage');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });
  await test.step('status of round 3: tokens, two action cards (Neural Motivator), an agenda with a law', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await page.getByRole('button', { name: 'Add one Tactic' }).click();
    await page.getByRole('button', { name: 'Add one Fleet' }).click();
    await panel(page).getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'sabotage', 'Sabotage');
    await panel(page).getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'unexpected action', 'Unexpected Action');
    await page.waitForTimeout(800);
    await expect(panel(page)).toContainText('Distribute tokens: 0 left');
    await page.getByRole('button', { name: 'Edit: Tokens and points' }).click();
    await expectFigures(page, { Tactic: 1, Fleet: 5, Strategy: 0, 'Trade goods': 1, VP: 3, Commodities: 3 });
    // The agenda phase: Mecatol Rex is held, a law is voted.
    const agendas = page.getByRole('region', { name: 'Agenda' });
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'anti-intellectual', 'Anti-Intellectual Revolution');
    await expect(panel(page).getByTestId('component-agenda:revolution')).toContainText('law: stays in play');
    await panel(page).getByRole('button', { name: 'Done' }).click();
    await expect(agendas.getByRole('listitem', { name: 'Agenda: Anti-Intellectual Revolution' })).toBeVisible();
    await shot(page, 'agenda-law');
  });
  await test.step('what the Winnu hold at the end: the law, the relic, the technologies, the leaders', async () => {
    await openGroup(page, /^Objectives/);
    await expect(drawer(page).getByRole('group', { name: 'Laws' })).toContainText('Anti-Intellectual Revolution');
    await openGroup(page, /^Relics/);
    await expect(drawer(page).getByRole('group', { name: 'Relics' })).toContainText('Shard of the Throne');
    await openGroup(page, /^Cards/);
    await page.waitForTimeout(500);
    await shot(page, 'cards-end');
    await openGroup(page, /^Faction/);
    await page.waitForTimeout(500);
    await shot(page, 'faction-end');
    await closeDrawer(page);
    await shot(page, 'end-of-round-3');
  });
  await test.step('production of round 2 again: the agent and Hegemonic Trade Policy together cover what each cannot alone', async () => {
    // On a copy of the plan: the plan played above stays as it is.
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await page.getByRole('button', { name: 'Round 2', exact: true }).click();
    await page.getByRole('button', { name: 'Edit: Tactical action · Winnu' }).click();
    // 10 - 1 (Sarween) = 9; the agent takes 2 more off: 7. The home planet swaps to 4 resources with the policy: 3 + 4... paid 6 + 1 = 7.
    if (await page.getByRole('button', { name: 'Choose manually' }).count()) await page.getByRole('button', { name: 'Choose manually' }).click();
    await page.getByRole('button', { name: 'Remove one trade good' }).click();
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'hegemonic', 'Hegemonic Trade Policy');
    await page.waitForTimeout(800);
    const short = panel(page).locator('li[data-code="shortResources"]');
    // BUG: with both named in Used the cost is 10 - 1 (Sarween Tools) - 2 (agent) = 7, and the swap of the home planet (3 -> 4) makes the
    // payment 6 + 1 = 7: nothing is short. The two waivers are judged one by one (leader/winnuagent.ts: shortfall <= 2,
    // technology/htp.ts: shortfall <= the planet's gain of 1), so the shortfall of 3 is covered by neither and the warning stands.
    await expect(short.filter({ hasText: 'need 9, paid 6, short by 3' })).toHaveCount(1);
    await expect(panel(page).locator('li.warning-waived[data-code="shortResources"]')).toHaveCount(0);
    await shot(page, 'agent-and-policy');
    // The dock of the home planet produces up to its resources + 2 = 5 units: flagship, mech, and 6 infantry make 8.
    await panel(page).getByRole('button', { name: /Production/ }).click();
    for (let i = 0; i < 6; i++) await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await page.waitForTimeout(800);
    await expect(panel(page).locator('li[data-code="productionOver"]')).toContainText('Production 5, and 8 units are built');
    await shot(page, 'eight-units-one-dock');
  });
});
