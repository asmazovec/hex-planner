import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * One long game as The Nomad, played through the interface only. Five players: the Nomad (me, seat 1), Sardakk Norr,
 * the Argent Flight, the Barony of Letnev, the Emirates of Hacan. Prophecy of Kings on, Thunder's Edge off.
 *
 * Map (axial q,r; Mecatol in the middle, the Nomad home 53 on top at (0,-3)):
 *   ring 1: 65 Primor (0,-1), 78 (1,-1), 39 alpha (1,0), 67 Cormund rift (0,1), 40 beta (-1,1), 69 (-1,0)
 *   ring 2: 27 New Albion/Starpoint (0,-2), 66 Hope's End (1,-2), 19 Wellon (2,-2), ..., 34 Centauri/Gral (-1,-1)
 *   ring 3: 53 Nomad (0,-3), 62 Sem-Lore (1,-3), 36 Arnor/Lor (2,-3), 13 Sardakk (3,-3), 58 Argent (3,0), 10 Letnev (-3,3),
 *           16 Hacan (-3,0), 21 Thibah (-1,-2), 43 supernova (-2,-1)
 */
const SLOTS: Record<number, number> = { 0: 65, 1: 78, 2: 39, 3: 67, 4: 40, 5: 69, 6: 27, 7: 66, 8: 19, 9: 26, 10: 44, 11: 42, 12: 47, 13: 25, 14: 29, 15: 30, 16: 73, 17: 34, 18: 53, 19: 62, 20: 36, 21: 13, 22: 22, 23: 79, 24: 58, 25: 41, 26: 32, 27: 24, 28: 23, 29: 28, 30: 10, 31: 20, 32: 45, 33: 16, 34: 43, 35: 21 };
const MAP = Array.from({ length: 36 }, (_, i) => SLOTS[i]).join(' ');
const OPPONENTS = ['Sardakk Norr', 'The Argent Flight', 'The Barony of Letnev', 'The Emirates of Hacan'];

const FOLDER = 'test-results/scenarios/nomad';
const problems: string[] = [];
const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const stage = (page: Page) => page.locator('.stage-dialog');
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const summary = (page: Page, name: string) => page.locator('.summary-cell').and(page.getByRole('group', { name, exact: true }));
const fan = (page: Page) => page.getByRole('group', { name: 'Drawers' });
const entries = (page: Page) => page.getByRole('region', { name: 'Actions' }).locator('.entry');
const whose = (page: Page) => page.getByRole('group', { name: 'Whose action' });
let shots = 0;
const shot = async (page: Page, name: string) => { shots += 1; await page.screenshot({ path: `${FOLDER}/${String(shots).padStart(2, '0')}-${name}.png` }); };
async function dump(label: string, scope: Locator) {
  const text = await scope.ariaSnapshot();
  writeFileSync(`${FOLDER}/dump-${label}.txt`, text);
  if (process.env.DUMP === label || process.env.DUMP === 'all') console.log(`--- ${label}\n${text.slice(0, 7000)}`);
}

/** The number a summary group shows: the figure at its end. */
async function figure(page: Page, name: string): Promise<number> {
  const text = (await summary(page, name).innerText()).trim();
  return Number(text.match(/-?\d+$/)![0]);
}
const NAMES = ['Resources', 'Influence', 'Trade goods', 'Commodities', 'Tactic', 'Fleet', 'Strategy', 'VP'];
async function figures(page: Page) {
  const out: Record<string, number> = {};
  for (const n of NAMES) out[n] = await figure(page, n);
  return out;
}
/** Assert some figures, in the mode named (Forecast / Now), if given. */
async function expectFigures(page: Page, want: Record<string, number>, mode?: 'Forecast' | 'Now') {
  if (mode) {
    const toggle = page.getByRole('button', { name: mode, exact: true });
    if (await toggle.isEnabled()) await toggle.click();
  }
  for (const [name, value] of Object.entries(want)) await expect.poll(() => figure(page, name), { message: `${mode ?? ''} ${name}`, timeout: 4000 }).toBe(value);
}

async function centreWhenStill(target: Locator): Promise<{ x: number; y: number }> {
  let last = '';
  await expect.poll(async () => { const now = JSON.stringify(await target.boundingBox()); const still = now === last; last = now; return still; }, { intervals: [150] }).toBe(true);
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
async function addSource(page: Page) {
  await panel(page).getByRole('button', { name: 'Add source' }).click();
  await page.waitForTimeout(1000);
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
const done = (page: Page) => panel(page).getByRole('button', { name: 'Done', exact: true }).click();
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
async function setUnits(page: Page, systemTile: number, who: string, units: string[]) {
  await tapTile(page, systemTile);
  await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
  await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: who, exact: true }).click();
  for (const u of units) await stage(page).getByRole('button', { name: u, exact: true }).click();
  await stage(page).getByRole('button', { name: 'Close' }).click();
}
const STOP = process.env.STOP;
let stopped = false;
async function step(title: string, body: () => Promise<void>) {
  if (stopped) return;
  const t = Date.now();
  console.log('>>', title);
  await test.step(title, body);
  console.log('   ok', ((Date.now() - t) / 1000).toFixed(1) + 's');
  if (STOP && title.startsWith(STOP)) stopped = true;
}

async function newGame(page: Page): Promise<void> {
  await page.addInitScript(() => { if (!localStorage.getItem('ti4.lang')) localStorage.setItem('ti4.lang', 'en'); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Remove opponent' }).last().click();
  await page.getByRole('button', { name: "Thunder's Edge" }).click();
  await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'My faction', exact: true }).click();
  await page.getByRole('button', { name: 'The Nomad' }).click();
  for (const f of OPPONENTS) {
    await page.getByRole('button', { name: 'Opponent', exact: true }).filter({ hasText: 'Choose a faction' }).first().click();
    await page.getByRole('button', { name: f, exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Paste a Milty string' }).click();
  await page.getByLabel('Milty Draft map string').fill(MAP);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('31 tiles placed.')).toBeVisible();
  await expect(page.getByText('Home systems placed: 5.')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('textbox', { name: 'Game name' }).fill('NomadGame');
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await expect(tile(page, 53)).toBeVisible();
}

test.beforeAll(() => { if (!existsSync(FOLDER)) mkdirSync(FOLDER, { recursive: true }); });
test.beforeEach(({ page }) => {
  page.setDefaultTimeout(10_000);
  problems.length = 0;
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
});
test.afterEach(() => { expect(problems).toEqual([]); });

test('nomad: a long game through the interface', async ({ page }) => {
  await step('start the game', async () => {
    await newGame(page);
    // Arcturus 4/4; 3 tactic, 3 fleet, 2 strategy tokens.
    await expectFigures(page, { Resources: 4, Influence: 4, 'Trade goods': 0, Commodities: 0, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 });
    await shot(page, 'start');
    await dump('start-panel', page.locator('body'));
  });

  await step('drawer: what the Nomad holds at the start', async () => {
    for (const g of [/^Technologies/, /^Cards/, /^Faction/, /^Relics/, /^Objectives/]) {
      await openGroup(page, g);
      await dump(`drawer-${String(g).slice(2, 6)}`, drawer(page));
    }
    await shot(page, 'drawer-faction');
    await closeDrawer(page);
  });
  await step('drawer: search for the faction pieces', async () => {
    await page.getByRole('button', { name: /^Components/ }).click();
    const box = drawer(page).getByRole('searchbox', { name: 'Search components' });
    for (const q of ['future sight', 'the company', 'quantum manipulator', 'temporal command', 'memoria', 'cavalry', 'thunder paradox']) {
      await box.fill(q);
      await dump('search-' + q.split(' ')[0], drawer(page).getByRole('group', { name: 'Search results' }));
    }
    await box.fill('');
    await closeDrawer(page);
  });
  await step('round 1: Technology is the main card', async () => {
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await expect(page.getByText('Main: 7 Technology')).toBeVisible();
    await dump('strategy-r1', page.getByRole('region', { name: 'Strategy' }));
  });
  await step('tactical 1: a carrier with two infantry to New Albion and Starpoint (27)', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 27);
    await expect(page.getByText('Active system: New Albion')).toBeVisible();
    await expect(panel(page).getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await tapTile(page, 53);
    await tapTile(page, 27);
    await expect(page.getByText('Flight Arcturus → New Albion')).toBeVisible();
    await dump('t1-flight', panel(page));
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await shot(page, 't1-flight');
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('group', { name: 'Landing on New Albion' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Starpoint' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t1-landed', panel(page));
    await done(page);
    // LRR 25.1: a planet taken comes exhausted, so New Albion and Starpoint add nothing until the status phase.
    await expectFigures(page, { Resources: 4, Influence: 4, Tactic: 2, Fleet: 3 }, 'Forecast');
    await expectFigures(page, { Resources: 4, Influence: 4, Tactic: 3 }, 'Now');
    await page.getByRole('button', { name: 'Forecast', exact: true }).click();
    await shot(page, 't1-done');
  });

  await step('strategy: Technology primary, Sarween Tools free, Temporal Command Suite for 6', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('group', { name: 'Technology · primary ability' })).toBeVisible();
    // The faction technology first: the Nomad holds no yellow technology yet, so its prerequisite is missing.
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'temporal', 'Temporal Command Suite');
    await dump('tech-tcs-first', panel(page));
    await shot(page, 'tech-tcs-first');
    await expect(panel(page).getByText(/prerequisites of Temporal Command Suite/)).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove Temporal Command Suite' }).click();
    await expect(panel(page).getByText(/prerequisites of Temporal Command Suite/)).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'sarween', 'Sarween Tools');
    await dump('tech1', panel(page));
    await shot(page, 'tech-r1');
    await expect(panel(page).getByText(/prerequisites of Sarween/)).toHaveCount(0);
    await done(page);
    await expectFigures(page, { Resources: 4, Strategy: 2 }, 'Forecast');
  });

  await step('strategy: Construction secondary of another card, a PDS on Starpoint and a dock on New Albion', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '4 Construction' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Construction · secondary ability' })).toBeVisible();
    await expectFigures(page, { Strategy: 1 }, 'Forecast');
    await dump('con-sec', panel(page));
    await shot(page, 'con-sec');
    await panel(page).getByRole('button', { name: 'Construction', exact: true }).click();
    await page.waitForTimeout(800);
    await tapTile(page, 27);
    await dump('con-stage', stage(page));
    await stage(page).getByRole('button', { name: 'PDS, Starpoint' }).click();
    await stage(page).getByRole('button', { name: 'Space dock, New Albion' }).click();
    await dump('con-stage2', stage(page));
    await shot(page, 'con-stage2');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('con-panel', panel(page));
    await shot(page, 'con-panel');
    // Take the dock back: a secondary places only one.
    await panel(page).getByRole('button', { name: /^Construction · / }).click();
    await tapTile(page, 27);
    await stage(page).getByRole('button', { name: 'Give back Space dock, New Albion' }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toHaveCount(0);
    await expect(panel(page).getByText('Built: PDS (Starpoint)')).toBeVisible();
    await done(page);
    await expectFigures(page, { Strategy: 1, Resources: 4 }, 'Forecast');
  });

  await step('tactical 2: the home system, production at the dock: a mech and two infantry', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 53);
    await expect(page.getByText('Active system: Arcturus')).toBeVisible();
    await expect(panel(page).getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = stage(page);
    await dump('shop1', shop);
    await shot(page, 'shop1');
    await shop.getByRole('button', { name: 'Mech', exact: true }).click();
    for (let i = 0; i < 2; i++) await shop.getByRole('button', { name: 'Infantry', exact: true }).click();
    await dump('shop2', shop);
    await shop.getByRole('button', { name: 'Close' }).click();
    await dump('t2-panel', panel(page));
    await shot(page, 't2-panel');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 3, paid 4');
    await done(page);
    console.log('FIG after t2', JSON.stringify(await figures(page)));
    await expectFigures(page, { Resources: 0, Tactic: 1, Strategy: 1 }, 'Forecast');
    await tapTile(page, 53);
    await dump('t53-after', stage(page));
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  await step('pass, then the status phase of round 1', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await dump('status1', panel(page));
    const status = panel(page).getByRole('listitem', { name: 'Tokens and points' });
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'betray a friend', 'Betray a Friend');
    await status.getByRole('group', { name: 'Nomad', exact: true }).getByRole('button', { name: 'Add one Nomad' }).click();
    const tokens = status.getByRole('group', { name: 'Token distribution' });
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Strategy' }).click();
    await expect(tokens).toContainText('Distribute tokens: 0 left');
    const taken = status.getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'rally', 'Rally');
    await dump('status1b', status);
    await shot(page, 'status1b');
    await status.getByRole('checkbox', { name: 'Done' }).check();
    console.log('FIG end r1', JSON.stringify(await figures(page)));
    await expectFigures(page, { Tactic: 2, Fleet: 3, Strategy: 2, VP: 1, Resources: 8, Influence: 6 }, 'Forecast');
  });
  await step('round 2 begins: Technology main again; Temporal Command Suite free, Neural Motivator for 6', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectFigures(page, { Resources: 8, Influence: 6, 'Trade goods': 0, Commodities: 0, Tactic: 2, Fleet: 3, Strategy: 2, VP: 1 }, 'Forecast');
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await expect(page.getByText('Main: 7 Technology')).toBeVisible();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'temporal', 'Temporal Command Suite');
    await expect(panel(page).getByText(/prerequisites of Temporal/)).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'neural motivator', 'Neural Motivator');
    await dump('tech-r2', panel(page));
    await shot(page, 'tech-r2');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6');
    await done(page);
    console.log('FIG after tech r2', JSON.stringify(await figures(page)));
  });
  await step('tactical 3: Primor (65), the legendary planet, from 27', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 65);
    await tapTile(page, 27);
    await tapTile(page, 65);
    await expect(page.getByText('Flight New Albion / Starpoint → Primor')).toBeVisible();
    await dump('t3-flight', panel(page));
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    await panel(page).getByRole('group', { name: 'New Albion', exact: true }).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Starpoint', exact: true }).getByRole('button', { name: 'Take one Infantry' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 2 of 4' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t3-landed', panel(page));
    await done(page);
    // Primor 2/1 is taken exhausted: nothing changes in resources; the tactic token is spent.
    await expectFigures(page, { Resources: 1, Tactic: 1 }, 'Forecast');
    await tapTile(page, 65);
    await dump('t65', stage(page));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await tapTile(page, 27);
    await dump('t27', stage(page));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await shot(page, 't3-after');
  });
  await step('component action: Sling Relay produces a destroyer at the dock of 53', async () => {
    await addAction(page, 'Component action');
    await dump('pick-sr', picker(page));
    await choose(page, 'sling relay', 'Sling Relay');
    await dump('sr1', panel(page));
    await panel(page).getByRole('group', { name: 'System', exact: true }).getByRole('button', { name: 'Arcturus', exact: true }).click();
    await panel(page).getByRole('group', { name: 'Unit', exact: true }).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await dump('sr2', panel(page));
    await shot(page, 'sr2');
    // BUG(wrong-number): the ship of Sling Relay is paid by nothing and warned of by nothing: no payment block, the cost 1 is not charged.
    expect(await page.locator('li[data-code]').count()).toBe(0);
    console.log('FIG during sr', JSON.stringify(await figures(page)));
    await done(page);
    console.log('FIG after sr', JSON.stringify(await figures(page)));
    await tapTile(page, 53);
    await dump('t53-sr', stage(page));
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });
  await step('setup: a Letnev cruiser holds Sem-Lore (62)', async () => {
    await setUnits(page, 62, 'Letnev', ['Cruiser']);
  });

  await step('tactical 4: the Memoria with two destroyers and three infantry to Sem-Lore; a battle; Mercer and Temporal Command Suite in Used', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 62);
    await expect(page.getByText('Active system: Sem-Lore')).toBeVisible();
    await tapTile(page, 53);
    await tapTile(page, 62);
    await panel(page).getByRole('button', { name: 'Take one Flagship' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Destroyer' }).click();
    // The two infantry standing in space at the start, and one that the dock produced on the planet.
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).first().click();
    await panel(page).getByRole('button', { name: 'Take one Infantry' }).last().click();
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 3 of 3' })).toBeVisible();
    await dump('t4-flight', panel(page));
    await shot(page, 't4-flight');
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await dump('t4-battle', stage(page));
    await shot(page, 't4-battle');
    await stage(page).getByRole('button', { name: /^Destroyer ×2/ }).click();
    await dump('t4-battle2', stage(page));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t4-landed', panel(page));
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'mercer', 'Field Marshal Mercer');
    await dump('t4-used1', panel(page));
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'temporal', 'Temporal Command Suite');
    await dump('t4-used2', panel(page));
    await shot(page, 't4-used');
    await done(page);
    await expectFigures(page, { Tactic: 0 }, 'Forecast');
    await openGroup(page, /^Faction/);
    await dump('faction-after-t4', drawer(page));
    await shot(page, 'faction-after-t4');
    await openGroup(page, /^Technologies/);
    await dump('tech-after-t4', drawer(page));
    await closeDrawer(page);
  });
  await step('Politics secondary of another card: two action cards are drawn', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '3 Politics' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Politics · secondary ability' })).toBeVisible();
    await expectFigures(page, { Strategy: 1 }, 'Forecast');
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    for (const [q, n] of [['mining initiative', 'Mining Initiative'], ['frontline deployment', 'Frontline Deployment']] as const) {
      await common.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await dump('politics', panel(page));
    await shot(page, 'politics');
    await done(page);
  });

  await step('action card as a component action: Mining Initiative on Starpoint, Artuno the Betrayer in Used', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await dump('mining1', panel(page));
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Starpoint', exact: true }).click();
    await expectFigures(page, { 'Trade goods': 3 });
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'artuno', 'Artuno the Betrayer');
    await dump('mining2', panel(page));
    await shot(page, 'mining');
    await done(page);
    await expectFigures(page, { 'Trade goods': 3 }, 'Forecast');
  });
  await step('hero: played while locked, then unlocked in the drawer', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'ahk-syl', 'Ahk-Syl Siven');
    await dump('hero1', panel(page));
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toContainText('you do not hold this component');
    await openGroup(page, /^Faction/);
    await dump('hero-drawer', drawer(page));
    await shot(page, 'hero-drawer');
    // BUG(usability): the start state of a hero the open entry plays is locked in the drawer ("set by the plan"): the only way to unlock it is to delete the entry.
    await expect(drawer(page).getByRole('group', { name: 'Ahk-Syl Siven: state' }).getByRole('button', { name: 'Unlocked' })).toBeDisabled();
    await closeDrawer(page);
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
    await openGroup(page, /^Faction/);
    await drawer(page).getByRole('group', { name: 'Ahk-Syl Siven: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await closeDrawer(page);
    await addAction(page, 'Component action');
    await choose(page, 'ahk-syl', 'Ahk-Syl Siven');
    await dump('hero2', panel(page));
    await shot(page, 'hero-unlocked');
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toHaveCount(0);
    await done(page);
  });
  await step('tactical 5: the Memoria leaves Sem-Lore (my token lies there) with infantry; the hero allows it', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 27);
    await tapTile(page, 62);
    await tapTile(page, 27);
    await dump('t5-source', panel(page));
    await panel(page).getByRole('button', { name: 'Take one Flagship' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await dump('t5-flight', panel(page));
    await shot(page, 't5-flight');
    // The destroyer leaves the same token-bearing system: the hero covers the flagship and its cargo only.
    await panel(page).getByRole('button', { name: 'Take one Destroyer' }).click();
    await dump('t5-with-destroyer', panel(page));
    await panel(page).getByRole('button', { name: 'Return one Destroyer' }).click();
    await dump('t5-without-destroyer', panel(page));
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t5-after', panel(page));
    await shot(page, 't5-after');
    await done(page);
    console.log('FIG after t5', JSON.stringify(await figures(page)));
  });
  await step('second use: Sling Relay and Artuno again in the same round', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'sling relay', 'Sling Relay');
    await panel(page).getByRole('group', { name: 'System', exact: true }).getByRole('button', { name: 'Arcturus', exact: true }).click();
    await panel(page).getByRole('group', { name: 'Unit', exact: true }).getByRole('button', { name: 'Fighter', exact: true }).click();
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'artuno', 'Artuno the Betrayer');
    await dump('second-use', panel(page));
    await shot(page, 'second-use');
    await done(page);
  });
  await step('pass with a transaction: the Cavalry to Argent for a trade good', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await dump('tx1', panel(page));
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Argent' }).click();
    await dump('tx2', panel(page));
    await shot(page, 'tx2');
    const give = panel(page).getByRole('group', { name: 'Give', exact: true });
    await give.getByRole('button', { name: 'Add one Trade goods' }).click();
    await give.getByRole('button', { name: '+ Component' }).click();
    await dump('tx-picker', picker(page));
    await choose(page, 'cavalry', 'The Cavalry');
    await dump('tx3', panel(page));
    await shot(page, 'tx3');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await dump('tx-entry', panel(page));
    await expect(panel(page).getByRole('button', { name: /^\+ Transaction with Argent:/ })).toBeVisible();
    await done(page);
    console.log('FIG after tx', JSON.stringify(await figures(page)));
  });
  await step('the Cavalry: where it is in my cards, and what Argent holds', async () => {
    await openGroup(page, /^Cards/);
    await dump('cards-mine', drawer(page));
    await shot(page, 'cards-mine');
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Argent' }).click();
    await dump('cards-argent', drawer(page));
    await shot(page, 'cards-argent');
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Mine' }).click();
    await closeDrawer(page);
  });
  await step('status phase of round 2: two tactic tokens, an action card; round 3 begins', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const status = panel(page).getByRole('listitem', { name: 'Tokens and points' });
    const tokens = status.getByRole('group', { name: 'Token distribution' });
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await expect(tokens).toContainText('Distribute tokens: 0 left');
    await status.getByRole('group', { name: 'Taken and discarded' }).getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'plague', 'Plague');
    await dump('status2', status);
    await shot(page, 'status2');
    await status.getByRole('checkbox', { name: 'Done' }).check();
    console.log('FIG end r2', JSON.stringify(await figures(page)));
    await expectFigures(page, { Tactic: 1, Fleet: 3, Strategy: 1, VP: 1 }, 'Forecast');
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    console.log('FIG start r3', JSON.stringify(await figures(page)));
    await shot(page, 'r3-start');
    await tapTile(page, 62);
    await dump('t62-r3', stage(page));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await openGroup(page, /^Faction/);
    await dump('faction-r3', drawer(page));
    await closeDrawer(page);
  });
  await step('round 3: Technology main; Memoria II free, Space Dock II for 6; both need prerequisites held from earlier rounds', async () => {
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await expect(page.getByText('Main: 7 Technology')).toBeVisible();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'memoria', 'Memoria II');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'space dock', 'Space Dock II');
    await dump('tech-r3', panel(page));
    await shot(page, 'tech-r3');
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toHaveCount(0);
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6');
    await done(page);
    console.log('FIG after tech r3', JSON.stringify(await figures(page)));
    await openGroup(page, /^Technologies/);
    await dump('tech-drawer-r3', drawer(page));
    await shot(page, 'tech-drawer-r3');
    await closeDrawer(page);
  });
  await step('hand additions: a red technology and a relic', async () => {
    await addComponentByHand(page, 'plasma scoring', 'Plasma Scoring');
    await addComponentByHand(page, 'dominus', 'Dominus Orb');
    await closeDrawer(page);
    await openGroup(page, /^Relics/);
    await dump('relics', drawer(page));
    await shot(page, 'relics');
    await openGroup(page, /^Technologies/);
    await dump('tech-drawer-r3b', drawer(page));
    await closeDrawer(page);
  });
  await step('setup: a Letnev dreadnought holds Mecatol Rex (18)', async () => {
    await setUnits(page, 18, 'Letnev', ['Dreadnought']);
  });
  await step('tactical 6: Memoria II, 5 infantry to Mecatol Rex (18) through Primor; Rally in Used; a battle', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 18);
    await expect(page.getByText('Active system: Mecatol Rex')).toBeVisible();
    await tapTile(page, 27);
    await tapTile(page, 65);
    await tapTile(page, 18);
    await panel(page).getByRole('button', { name: 'Take one Flagship' }).click();
    await panel(page).getByRole('group', { name: '27', exact: true }).getByRole('button', { name: 'Take one Infantry' }).click({ clickCount: 1 });
    for (let i = 0; i < 2; i++) await panel(page).getByRole('group', { name: '27', exact: true }).getByRole('button', { name: 'Take one Infantry' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('group', { name: 'Primor', exact: true }).getByRole('button', { name: 'Take one Infantry' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 5 of 6' })).toBeVisible();
    await dump('t6-flight', panel(page));
    await shot(page, 't6-flight');
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t6-after-fly', panel(page));
    await shot(page, 't6-after-fly');
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'rally', 'Rally');
    await dump('t6-rally', panel(page));
    await expect.poll(() => figure(page, 'Fleet'), { timeout: 4000 }).toBe(5);
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await dump('t6-battle', stage(page));
    await shot(page, 't6-battle');
    await stage(page).getByRole('button', { name: /^Flagship ×1/ }).click();
    await dump('t6-battle2', stage(page));
    await shot(page, 't6-battle2');
    // The Memoria is lost in the first tap, and with it the five infantry on board: the app only warns of the capacity.
    await stage(page).getByRole('button', { name: 'Give back Flagship' }).click();
    await stage(page).getByRole('button', { name: /^Dreadnought ×1 \(The Barony of Letnev\)/ }).click();
    await dump('t6-battle3', stage(page));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    for (let i = 0; i < 5; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t6-landed', panel(page));
    await shot(page, 't6-landed');
    await expect(panel(page).getByText(/The custodians token is still on Mecatol Rex/)).toBeVisible();
    // BUG(false-warning): the custodians influence cannot be paid anywhere: the warning says the plan does not record it, and a second one says "paid 0, short by 6" whatever the player has (src/domain/replay/invasion.ts:86).
    await expect(panel(page).getByText('Not enough influence: need 6, paid 0, short by 6.')).toBeVisible();
    await done(page);
    console.log('FIG after t6', JSON.stringify(await figures(page)));
    await expectFigures(page, { Tactic: 0, Fleet: 5, VP: 2 }, 'Forecast');
  });
  await step('tactical 7: the home dock builds a flagship; the commander Navarch Feng is locked first, then unlocked', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 53);
    await expect(page.getByText('Active system: Arcturus')).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = stage(page);
    await dump('shop-r3', shop);
    await shot(page, 'shop-r3');
    await shop.getByRole('button', { name: 'Flagship', exact: true }).click();
    await shop.getByRole('button', { name: 'Close' }).click();
    await dump('t7-locked', panel(page));
    await shot(page, 't7-locked');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 8');
    await openGroup(page, /^Faction/);
    await drawer(page).getByRole('group', { name: 'Navarch Feng: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await closeDrawer(page);
    await dump('t7-unlocked', panel(page));
    await shot(page, 't7-unlocked');
    // BUG(wrong-number): the payment is seeded when the production changes (src/domain/tactical.ts:177-188); the commander made the flagship free afterwards, the 8 chosen stay paid.
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 0, paid 8');
    await done(page);
    await expectFigures(page, { Resources: 0, 'Trade goods': 1 }, 'Forecast');
    // Opened again, the flagship stays free and a mech is added: the price changes, the payment is seeded anew.
    await page.getByRole('button', { name: /^Edit: Tactical action/ }).last().click();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: 'Mech', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t7-rebuilt', panel(page));
    await shot(page, 't7-rebuilt');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 2, paid 2');
    await done(page);
    await expectFigures(page, { Resources: 5, 'Trade goods': 2 }, 'Forecast');
  });
  await step('Trade secondary of another card: the commodities are replenished', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '5 Trade' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Trade · secondary ability' })).toBeVisible();
    await dump('trade-sec', panel(page));
    await shot(page, 'trade-sec');
    await done(page);
    console.log('FIG after trade', JSON.stringify(await figures(page)));
    await expectFigures(page, { Commodities: 4, Strategy: 0 }, 'Forecast');
  });
  await step('pass: a transaction with Argent (not a neighbour) and the Thundarian exhausted, Temporal Command Suite readies it', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Argent' }).click();
    const get = panel(page).getByRole('group', { name: 'Get', exact: true });
    await get.getByRole('button', { name: 'Add one Commodities' }).click();
    await panel(page).getByRole('group', { name: 'Give', exact: true }).getByRole('button', { name: 'Add one Commodities' }).click();
    await dump('tx-r3a', panel(page));
    await panel(page).getByRole('button', { name: 'Back' }).click();
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'thundarian', 'The Thundarian');
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'temporal', 'Temporal Command Suite');
    await dump('tx-r3b', panel(page));
    await shot(page, 'tx-r3b');
    await done(page);
  });
  await step('rival: an Argent fleet on 78 attacks Mecatol Rex holding the Cavalry; the reminder of the battle', async () => {
    await setUnits(page, 78, 'Argent', ['Cruiser', 'Destroyer']);
    await whose(page).getByRole('button', { name: 'Argent' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 18);
    await tapTile(page, 78);
    await tapTile(page, 18);
    await panel(page).getByRole('button', { name: 'Take one Cruiser' }).click();
    await panel(page).getByRole('button', { name: 'Take one Destroyer' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('argent-t', panel(page));
    await shot(page, 'argent-t');
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await dump('argent-battle', stage(page));
    await shot(page, 'argent-battle');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await done(page);
    await whose(page).getByRole('button', { name: 'Mine' }).click();
  });
  await step('status phase of round 3: a public objective is scored, tokens are distributed', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const status = panel(page).getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await dump('score-picker', picker(page));
    await choose(page, 'expand borders', 'Expand Borders');
    await status.getByRole('group', { name: 'Nomad', exact: true }).getByRole('button', { name: 'Add one Nomad' }).click();
    const tokens = status.getByRole('group', { name: 'Token distribution' });
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Fleet' }).click();
    await expect(tokens).toContainText('Distribute tokens: 0 left');
    await dump('status3', status);
    await shot(page, 'status3');
    await status.getByRole('checkbox', { name: 'Done' }).check();
    console.log('FIG end r3', JSON.stringify(await figures(page)));
  });
  await step('agenda phase (I hold Mecatol Rex): a law passes', async () => {
    const agendas = page.getByRole('region', { name: 'Agenda' });
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await dump('agenda-picker', picker(page));
    await choose(page, 'minister of commerce', 'Minister of Commerce');
    await dump('agenda1', panel(page));
    await shot(page, 'agenda1');
    await panel(page).getByRole('button', { name: 'Elect The Nomad' }).click();
    // Future Sight (an outcome I predicted resolves): one trade good, entered by hand: the agenda phase shows no reminder of the ability.
    await expect(panel(page).getByText('Future Sight')).toHaveCount(0);
    await panel(page).getByRole('textbox', { name: 'Label' }).fill('Future Sight');
    await panel(page).getByRole('group', { name: 'Trade goods' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    await dump('agenda2', panel(page));
    await shot(page, 'agenda2');
    await done(page);
    await expectFigures(page, { 'Trade goods': 3 }, 'Forecast');
    await openGroup(page, /^Objectives/);
    await dump('objectives-r3', drawer(page));
    await shot(page, 'objectives-r3');
    await closeDrawer(page);
  });
  await step('round 4: Trade secondary with Minister of Commerce held: one trade good per neighbour', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectFigures(page, { 'Trade goods': 3, Commodities: 3 }, 'Forecast');
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '5 Trade' }).click();
    await dump('trade-r4', panel(page));
    await shot(page, 'trade-r4');
    await done(page);
    console.log('FIG after trade r4', JSON.stringify(await figures(page)));
  });
  let before: Record<string, unknown> = {};
  async function snapshot(): Promise<Record<string, unknown>> {
    const out: Record<string, unknown> = {};
    await page.getByRole('button', { name: 'Forecast', exact: true }).click().catch(() => undefined);
    await page.waitForTimeout(600);
    out.forecast = await figures(page);
    await page.getByRole('button', { name: 'Now', exact: true }).click().catch(() => undefined);
    await page.waitForTimeout(600);
    out.now = await figures(page);
    await page.getByRole('button', { name: 'Forecast', exact: true }).click().catch(() => undefined);
    await page.waitForTimeout(600);
    for (const name of ['Strategy', 'Actions', 'Status', 'Agenda']) out['region-' + name] = await page.getByRole('region', { name, exact: true }).first().innerText().catch(() => 'none');
    for (const [label, group] of [['tech', /^Technologies/], ['cards', /^Cards/], ['faction', /^Faction/], ['relics', /^Relics/], ['objectives', /^Objectives/]] as const) {
      await openGroup(page, group);
      out['drawer-' + label] = await drawer(page).innerText();
    }
    await closeDrawer(page);
    for (const n of [53, 62, 18, 27, 65, 78]) {
      await tapTile(page, n);
      out['tile-' + n] = await stage(page).locator('.big-hex, [role=group]').first().ariaSnapshot().catch(() => stage(page).innerText());
      await stage(page).getByRole('button', { name: 'Close' }).click();
    }
    return out;
  }
  await step('export mid-game, delete the game, import the file, reload: everything is the same', async () => {
    // The Trade entry of round 4 is not done yet: the now and forecast figures differ, and both must come back.
    before = await snapshot();
    console.log('FIG before export', JSON.stringify(before.forecast), JSON.stringify(before.now));
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export to file' }).click();
    const file = `${FOLDER}/nomad-export.json`;
    await (await download).saveAs(file);
    const exported = JSON.parse(readFileSync(file, 'utf8')) as { faction: string; plans: { rounds: { entries: unknown[] }[] }[] };
    expect(exported.faction).toBe('nomad');
    console.log('rounds exported', exported.plans[0].rounds.length, exported.plans[0].rounds.map(r => r.entries.length).join(','));
    await shot(page, 'game-screen');
    await dump('game-screen', page.locator('main'));
    await page.locator('.saved-list li').first().getByRole('button', { name: 'Delete game' }).click();
    await shot(page, 'delete-confirm');
    await page.getByRole('button', { name: 'Delete for good' }).click();
    await expect(page.locator('.saved-list li')).toHaveCount(0);
    await page.locator('input[type=file]').setInputFiles({ name: 'game.json', mimeType: 'application/json', buffer: readFileSync(file) });
    await expect(page.locator('.saved-list li')).toHaveCount(1);
    await dump('after-import', page.locator('main'));
    await page.reload();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 53)).toBeVisible();
    const after = await snapshot();
    for (const key of Object.keys(before)) expect(after[key], key).toEqual(before[key]);
    await shot(page, 'after-import');
  });
  await step('round 4: Frontline Deployment on Mecatol Rex, an action card is taken', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'frontline deployment', 'Frontline Deployment');
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Mecatol Rex', exact: true }).click();
    await panel(page).getByRole('group', { name: 'Taken and discarded' }).getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'unexpected action', 'Unexpected Action');
    await dump('fd', panel(page));
    await shot(page, 'fd');
    await done(page);
    await tapTile(page, 18);
    await dump('t18-r4', stage(page));
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });
  await step('tactical 8: the Memoria jumps from Mecatol Rex to the home system (it holds a mech); a dock of 8 production; Mercer and Temporal Command Suite in Used', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 53);
    await tapTile(page, 18);
    await tapTile(page, 53);
    await dump('t8-route', panel(page));
    await shot(page, 't8-route');
    await panel(page).getByRole('button', { name: 'Take one Flagship' }).click();
    await dump('t8-flight', panel(page));
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = stage(page);
    for (let i = 0; i < 8; i++) await shop.getByRole('button', { name: 'Infantry', exact: true }).click();
    await shop.getByRole('button', { name: 'Close' }).click();
    await dump('t8-prod8', panel(page));
    await shot(page, 't8-prod8');
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await shop.getByRole('button', { name: 'Infantry', exact: true }).click();
    await shop.getByRole('button', { name: 'Close' }).click();
    await dump('t8-prod9', panel(page));
    await shot(page, 't8-prod9');
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await shop.getByRole('button', { name: 'Give back Infantry' }).click();
    await shop.getByRole('button', { name: 'Close' }).click();
    for (const [q, n] of [['mercer', 'Field Marshal Mercer'], ['temporal', 'Temporal Command Suite']] as const) {
      await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
      await choose(page, q, n);
    }
    await dump('t8-used', panel(page));
    await done(page);
    console.log('FIG after t8', JSON.stringify(await figures(page)));
  });
  await step('tactical 9: the Memoria, a mech and infantry leave the home system (my token lies there); Dominus Orb allows it; Mercer was readied by the Temporal Command Suite', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 27);
    await tapTile(page, 53);
    await tapTile(page, 27);
    await panel(page).getByRole('button', { name: 'Take one Flagship' }).click();
    await panel(page).getByRole('button', { name: 'Take one Mech' }).click();
    await panel(page).getByRole('button', { name: 'Take one Infantry' }).first().click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t9-before-orb', panel(page));
    await shot(page, 't9-before-orb');
    await expect(panel(page).getByText(/Arcturus already holds your command token/).first()).toBeVisible();
    await expect(panel(page).getByText(/Allowed by: Dominus Orb/)).toHaveCount(0);
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'dominus', 'Dominus Orb');
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'mercer', 'Field Marshal Mercer');
    await dump('t9-orb', panel(page));
    await shot(page, 't9-orb');
    await expect(panel(page).getByText(/Allowed by: Dominus Orb/).first()).toBeVisible();
    // Mercer was exhausted by the previous action and readied by the Temporal Command Suite named there: no warning of it.
    await expect(panel(page).getByText(/Field Marshal Mercer is exhausted/)).toHaveCount(0);
    await done(page);
    await openGroup(page, /^Relics/);
    await dump('relics-after-orb', drawer(page));
    await closeDrawer(page);
  });
  await step('component actions: Unexpected Action takes the token off the home system; the hero is played again; Mercer a second time', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'unexpected', 'Unexpected Action');
    await dump('ua1', panel(page));
    await panel(page).getByRole('group', { name: 'System', exact: true }).getByRole('button', { name: 'Arcturus', exact: true }).click();
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'mercer', 'Field Marshal Mercer');
    await dump('ua2', panel(page));
    await shot(page, 'ua2');
    await done(page);
    await addAction(page, 'Component action');
    await choose(page, 'ahk-syl', 'Ahk-Syl Siven');
    await dump('hero-again', panel(page));
    await shot(page, 'hero-again');
    await done(page);
  });
  await step('Thunder\'s Edge is off: the breakthrough of the faction', async () => {
    await openGroup(page, /^Faction/);
    // BUG(usability, low): with Thunder's Edge off the Faction group still has a «Breakthrough» block for the Nomad (empty: "none").
    await expect(drawer(page).getByRole('group', { name: 'Breakthrough' })).toBeVisible();
    await expect(drawer(page).getByRole('group', { name: 'Breakthrough' })).toContainText('none');
    await expect(drawer(page).getByText("Thunder's Paradox")).toHaveCount(0);
    await closeDrawer(page);
  });
});
