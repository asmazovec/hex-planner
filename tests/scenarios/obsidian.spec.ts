import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const MAP = '78 40 42 67 69 34 39 27 26 65 79 47 32 30 29 73 41 21 96B 62 19 1 44 36 38 61 76 92 37 50 16 35 31 33 22 23';
const SHOTS = 'test-results/scenarios/obsidian';
mkdirSync(SHOTS, { recursive: true });

const tile = (page: Page, n: number | string) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const summary = (page: Page, name: string) => page.getByRole('group', { name: 'Totals, now and forecast' }).getByRole('group', { name, exact: true });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });
const stage = (page: Page) => page.locator('.stage-dialog');

test.use({ actionTimeout: 10_000 });
expect.configure({ timeout: 6000 });
const errors: string[] = [];
async function dump(label: string, scope: Locator, limit = 6000) {
  const text = await scope.ariaSnapshot();
  writeFileSync(`${SHOTS}/dump-${label}.txt`, text);
  if (process.env.DUMP === label || process.env.DUMP === 'all') console.log(`--- ${label}\n${text.slice(0, limit)}`);
}
async function shot(page: Page, name: string) { await page.screenshot({ path: `${SHOTS}/${name}.png` }); }
async function total(page: Page, name: string): Promise<number> {
  const text = (await summary(page, name).innerText()).replace(/\s+/g, ' ');
  const m = text.match(/(-?\d+)\s*$/);
  return m ? Number(m[1]) : NaN;
}
async function totals(page: Page) {
  const out: Record<string, number> = {};
  for (const n of ['Resources', 'Influence', 'Trade goods', 'Commodities', 'Tactic', 'Fleet', 'Strategy', 'VP']) out[n] = await total(page, n);
  return out;
}
async function expectTotals(page: Page, want: Partial<Record<string, number>>, mode?: 'Forecast' | 'Now') {
  if (mode) {
    const toggle = page.getByRole('button', { name: mode, exact: true });
    if (await toggle.isEnabled()) await toggle.click();
  }
  await expect.poll(async () => {
    const got = await totals(page);
    return Object.fromEntries(Object.keys(want).map(k => [k, got[k]]));
  }, { message: `totals ${mode ?? ''}`, timeout: 4000 }).toEqual(want);
}
async function tapTile(page: Page, n: number | string): Promise<void> {
  let last = '';
  let still = 0;
  await expect.poll(async () => {
    const now = JSON.stringify(await tile(page, n).boundingBox());
    still = now === last ? still + 1 : 0;
    last = now;
    return still >= 3;
  }, { intervals: [120] }).toBe(true);
  await tile(page, n).click();
}
async function centre(page: Page, n: number | string) {
  let last = '';
  await expect.poll(async () => { const now = JSON.stringify(await tile(page, n).boundingBox()); const same = now === last; last = now; return same; }, { intervals: [150] }).toBe(true);
  const box = (await tile(page, n).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function dragRoute(page: Page, hexes: (number | string)[]): Promise<void> {
  const points = [];
  for (const n of hexes) points.push(await centre(page, n));
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
async function choose(page: Page, query: string, name: string | RegExp): Promise<void> {
  await picker(page).getByRole('searchbox', { name: 'Search components' }).fill(query);
  await picker(page).getByRole('button', { name: typeof name === 'string' ? `Choose ${name}` : name }).first().click();
  await expect(picker(page)).toHaveCount(0);
}
async function openGroup(page: Page, name: RegExp) {
  if (!(await groupTab(page, name).isVisible())) await page.getByRole('button', { name: /^Components/ }).click();
  const tab = groupTab(page, name);
  if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click();
  await expect(drawer(page)).toBeVisible();
}
async function closeDrawer(page: Page) {
  await page.waitForTimeout(500);
  const open = page.getByRole('group', { name: 'Drawers' }).locator('button[aria-pressed="true"]');
  if (await open.count()) await open.first().click();
  await expect(drawer(page)).toHaveCount(0);
}
async function done(page: Page) { await panel(page).getByRole('button', { name: 'Done', exact: true }).click(); }
async function step(title: string, body: () => Promise<void>) {
  const t = Date.now();
  console.log('>>', title);
  await test.step(title, body);
  console.log('   ok', ((Date.now() - t) / 1000).toFixed(1) + 's');
}

test.describe.configure({ mode: 'serial' });
let context: BrowserContext;
let page: Page;
test.beforeAll(async ({ browser }: { browser: Browser }) => {
  context = await browser.newContext({ baseURL: 'http://localhost:4173', viewport: { width: 1180, height: 820 }, hasTouch: true, serviceWorkers: 'block' });
  page = await context.newPage();
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
});
test.afterAll(async () => { await context.close(); });
test.afterEach(() => { expect(errors, 'console errors').toEqual([]); });

test('part 1: setup', async () => {
  test.setTimeout(290_000);
  await step('create the game on the first screen', async () => {
    await page.goto('/');
    const pick = async (n: number, f: string) => {
      await page.getByRole('group', { name: `Player ${n}` }).getByRole('button').first().click();
      await page.getByRole('button', { name: f, exact: true }).click();
    };
    await page.getByRole('button', { name: 'Remove opponent' }).last().click();
    await page.getByRole('button', { name: 'Remove opponent' }).last().click();
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'My faction', exact: true }).click();
    await dump('factionlist', page.locator('body'), 3000);
    await shot(page, '00-factionlist');
    await page.getByRole('button', { name: 'The Obsidian' }).click();
    await pick(2, 'The Federation of Sol');
    await pick(3, 'Last Bastion');
    await pick(4, 'The Emirates of Hacan');
    await page.getByRole('textbox', { name: 'Game name' }).fill('ObsidianGame');
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    await dump('afterapply', page.locator('body'), 3000);
    await shot(page, '00-apply');
  });
});

test('part 1b: start and look', async () => {
  test.setTimeout(290_000);
  await step('apply the map and start', async () => {
    await expect(page.getByText('Home systems placed: 4.')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await shot(page, '00-game');
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 96)).toBeVisible();
    console.log('START TOTALS', JSON.stringify(await totals(page)));
    await shot(page, '01-start');
    await tapTile(page, 96);
    await dump('home0', stage(page), 4000);
    await shot(page, '01b-home');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });
  await step('faction drawer at start', async () => {
    await page.getByRole('button', { name: /^Components/ }).click();
    await groupTab(page, /^Faction/).click();
    await dump('faction0', drawer(page), 20000);
    await shot(page, '02-faction');
    await groupTab(page, /^Technologies/).click();
    await dump('tech0', drawer(page), 20000);
    await groupTab(page, /^Cards/).click();
    await dump('cards0', drawer(page), 20000);
    await groupTab(page, /^Cards/).click();
  });
});

test('part 1c: adjacency', async () => {
  const boxes: [string, number, number, number][] = [];
  for (const loc of await page.getByRole('button', { name: /^Tile \d+[A-B]?$/ }).all()) {
    const name = (await loc.getAttribute('aria-label')) ?? '';
    const b = (await loc.boundingBox())!;
    boxes.push([name.replace('Tile ', ''), b.x + b.width / 2, b.y + b.height / 2, b.width]);
  }
  const adj: Record<string, string[]> = {};
  for (const [a, ax, ay, w] of boxes) adj[a] = boxes.filter(([b, bx, by]) => b !== a && Math.hypot(ax - bx, ay - by) < w * 0.95).map(x => x[0]);
  writeFileSync(`${SHOTS}/adjacency.json`, JSON.stringify(adj));
});

test('round 1', async () => {
  test.setTimeout(290_000);
  await step('r1 e1: Technology primary: Plasma Scoring free, AIDA for 6', async () => {
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await expect(page.getByText('Main: 7 Technology')).toBeVisible();
    await addAction(page, 'Strategy');
    await dump('tech-editor', panel(page), 30000);
    await shot(page, '04-tech-editor');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await dump('tech-picker', picker(page), 30000);
    await choose(page, 'plasma scoring', 'Plasma Scoring');
    await dump('after-ps', panel(page), 30000);
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'ai development', 'AI Development Algorithm');
    await dump('after-aida', panel(page), 30000);
    await shot(page, '04b-aida');
  });
});

test('round 1b: faction techs cannot be researched', async () => {
  test.setTimeout(290_000);
  await step('r1: try researching Planesplitter', async () => {
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('planesplitter');
    await dump('picker-planesplitter', picker(page), 5000);
    await shot(page, '05-picker-planesplitter');
    await picker(page).getByRole('button', { name: /Choose Planesplitter \(Obsidian\)/ }).first().click();
    await dump('after-planesplitter', panel(page), 30000);
    await shot(page, '05b-planesplitter');
  });
});

test('round 1c: finish tech, tactical to Sem-Lore', async () => {
  test.setTimeout(290_000);
  await step('r1 e1: remove the faction tech and finish', async () => {
    await panel(page).getByRole('button', { name: 'Remove Planesplitter (Obsidian)' }).click();
    await done(page);
    await expectTotals(page, { Resources: 0, Tactic: 3, Strategy: 2 }, 'Forecast');
    await shot(page, '06-after-tech');
    console.log('TOTALS after tech', JSON.stringify(await totals(page)));
  });
  await step('r1 e2: tactical: carrier + 3 infantry to Sem-Lore', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 62);
    await expect(page.getByText('Active system: Sem-Lore')).toBeVisible();
    await expect(panel(page).getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await dragRoute(page, [96, 62]);
    await dump('t1a', panel(page), 30000);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await dump('t1b', panel(page), 30000);
    await shot(page, '07-t1');
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t1c', panel(page), 30000);
    for (let i = 0; i < 3; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t1d', panel(page), 30000);
    await shot(page, '07b-t1-landed');
    await done(page);
    console.log('TOTALS after t1', JSON.stringify(await totals(page)));
  });
});

test('round 1d: Hacan fleet, battle, agent', async () => {
  test.setTimeout(290_000);
  await step('r1: set a Hacan fleet at 27 by hand', async () => {
    await tapTile(page, 27);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Hacan' }).click();
    for (const u of ['Cruiser', 'Cruiser', 'Fighter']) await stage(page).getByRole('button', { name: u, exact: true }).click();
    await dump('setup27', stage(page), 8000);
    await shot(page, '08-setup27');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });
  await step('r1 e3: tactical to 27, pick up on the way, battle, loss', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 27);
    await expect(panel(page).getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await dragRoute(page, [96, 62, 27]);
    await dump('t3a', panel(page), 30000);
    await shot(page, '09-t3a');
  });
});

test('round 1e: fly, battle, agent', async () => {
  test.setTimeout(290_000);
  await step('r1 e3: fly cruiser + destroyer, battle, destroyer lost, agent used', async () => {
    await panel(page).getByRole('button', { name: 'Take one Cruiser' }).click();
    await panel(page).getByRole('button', { name: 'Take one Destroyer' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t3b', panel(page), 30000);
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await dump('battle-open', stage(page), 12000);
    await shot(page, '10-battle');
    const hex = stage(page).getByRole('group', { name: 'Big hex' });
    await hex.getByRole('button', { name: /^Destroyer ×1$/ }).click();
    await hex.getByRole('button', { name: 'Cruiser ×2 (The Emirates of Hacan)', exact: true }).click();
    await hex.getByRole('button', { name: 'Cruiser ×1 (The Emirates of Hacan)', exact: true }).click();
    await dump('battle-losses', stage(page), 12000);
    await shot(page, '10b-battle');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t3c', panel(page), 30000);
    await shot(page, '10c-t3c');
  });
});

test('round 1f: agent, pass, status', async () => {
  test.setTimeout(290_000);
  await step('r1 e3: Used: Vos Hollow agent', async () => {
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await dump('used-picker', picker(page), 8000);
    await choose(page, 'vos hollow', /^Choose Vos Hollow/);
    await dump('used-agent', panel(page), 30000);
    await shot(page, '11-used-agent');
    await done(page);
  });
  await step('r1 e4: pass with a transaction: Malevolency to Hacan', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Hacan' }).click();
    await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: '+ Component' }).click();
    await dump('trans-picker', picker(page), 8000);
    await choose(page, 'malevolency', /^Choose Malevolency/);
    await dump('trans-1', panel(page), 30000);
    await shot(page, '12-trans');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await dump('pass-editor', panel(page), 30000);
    await done(page);
    await openGroup(page, /^Cards/);
    await dump('cards-after-trade', drawer(page), 20000);
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Hacan' }).click();
    await dump('cards-hacan', drawer(page), 20000);
    await shot(page, '12b-hacan-cards');
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Mine' }).click();
    await closeDrawer(page);
  });
  await step('r1 e5: status', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await dump('status-1', panel(page), 30000);
    await shot(page, '13-status');
  });
});

test('round 1g: status entries, done, now vs forecast', async () => {
  test.setTimeout(290_000);
  await step('r1 e5: status: tokens, action cards', async () => {
    const status = panel(page).getByRole('region', { name: 'Status' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Fleet' }).click();
    await expect(status.getByText('Distribute tokens: 0 left')).toBeVisible();
    await status.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'sabotage', /^Choose Sabotage/);
    await status.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'uprising', /^Choose Uprising/);
    await dump('status-1b', status, 30000);
    await shot(page, '13b-status');
    await expectTotals(page, { Tactic: 2, Fleet: 4, Strategy: 2 }, 'Forecast');
  });
  await step('r1: mark everything done, now vs forecast', async () => {
    const boxes = panel(page).getByRole('checkbox', { name: 'Done' });
    const n = await boxes.count();
    expect(n).toBe(5);
    for (let i = 0; i < n; i++) await boxes.nth(i).check();
    await expectTotals(page, { Resources: 9, Influence: 2, 'Trade goods': 0, Tactic: 2, Fleet: 4, Strategy: 2 }, 'Now');
    await shot(page, '14-r1-done');
    console.log('NOW r1', JSON.stringify(await totals(page)));
  });
});

test('round 2a: trade, production', async () => {
  test.setTimeout(290_000);
  await step('r2: new round, Trade primary', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('group', { name: 'Rounds' }).getByRole('button', { name: 'Round 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expectTotals(page, { Resources: 9, Influence: 2, 'Trade goods': 0, Commodities: 0, Tactic: 2, Fleet: 4, Strategy: 2, VP: 0 }, 'Forecast');
    const trade = page.getByRole('button', { name: '5 Trade' });
    await trade.click(); await trade.click(); await trade.click();
    const imp = page.getByRole('button', { name: '8 Imperial' });
    await imp.click(); await imp.click();
    await expect(page.getByText('Main: 5 Trade · Second: 8 Imperial')).toBeVisible();
    await addAction(page, 'Strategy');
    await dump('trade-editor', panel(page), 30000);
    await shot(page, '15-trade');
    const free = panel(page).getByRole('group', { name: 'Who uses the secondary for free' });
    await free.getByRole('button', { name: 'Sol' }).click();
    await free.getByRole('button', { name: 'Hacan' }).click();
    await expectTotals(page, { 'Trade goods': 3, Commodities: 3 }, 'Forecast');
    await done(page);
    await expectTotals(page, { Resources: 9, Influence: 2, 'Trade goods': 3, Commodities: 3, Strategy: 2 }, 'Forecast');
  });
  await step('r2: tactical at home, production: flagship + 2 infantry', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 96);
    await expect(panel(page).getByText('Active system: Cronos Hollow / Tallin Hollow')).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await dump('shop-open', stage(page), 30000);
    await shot(page, '16-shop');
  });
});

test('round 2b: buy flagship', async () => {
  test.setTimeout(290_000);
  await step('r2: buy a flagship and 2 infantry', async () => {
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry, Cronos Hollow', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry, Cronos Hollow', exact: true }).click();
    await expect(stage(page).getByRole('group', { name: 'Counters' })).toContainText('9 / 12');
    await dump('shop-bought', stage(page), 30000);
    await shot(page, '17-shop-bought');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('production-editor', panel(page), 30000);
    await shot(page, '17b-production-editor');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 9, paid 9');
    await done(page);
    await expectTotals(page, { Resources: 0, Influence: 0, 'Trade goods': 3, Tactic: 1 }, 'Forecast');
  });
});

test('round 2c: hero, second production', async () => {
  test.setTimeout(290_000);
  await step('r2: hero Sharsiss Hollow: unlock and play', async () => {
    await openGroup(page, /^Faction/);
    const who = 'Sharsiss Hollow';
    await drawer(page).getByRole('group', { name: `${who}: state` }).getByRole('button', { name: 'Unlocked' }).click();
    await expect(drawer(page).getByRole('group', { name: `${who}: state` }).getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await closeDrawer(page);
    await addAction(page, 'Component action');
    await dump('component-picker', picker(page), 8000);
    await choose(page, 'sharsiss', /^Choose Sharsiss Hollow/);
    await dump('hero-editor', panel(page), 30000);
    await shot(page, '18-hero');
    await expectTotals(page, { Resources: 9, Influence: 2, 'Trade goods': 3, Tactic: 1 }, 'Forecast');
    await done(page);
  });
  await step('r2: second production at home, over the production limit', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 96);
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: 'Dreadnought', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Carrier', exact: true }).click();
    for (let i = 0; i < 4; i++) await stage(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    await dump('shop-2', stage(page), 30000);
    await shot(page, '19-shop-2');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('production-2', panel(page), 30000);
    await shot(page, '19b-production-2');
  });
});

test('round 2d: used, uprising, hero again', async () => {
  test.setTimeout(290_000);
  await step('r2: finish production 2 and check totals', async () => {
    await done(page);
    await expectTotals(page, { Resources: 0, Influence: 0, 'Trade goods': 3, Tactic: 0 }, 'Forecast');
  });
  await step('r2: action card Uprising as a component action', async () => {
    await addAction(page, 'Component action');
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('uprising');
    await dump('uprising-pick', picker(page), 6000);
    await choose(page, 'uprising', /^Choose Uprising/);
    await dump('uprising-editor', panel(page), 30000);
    await shot(page, '20-uprising');
    await done(page);
  });
  await step('r2: the hero a second time warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'sharsiss', /^Choose Sharsiss Hollow/);
    await dump('hero-again', panel(page), 30000);
    await shot(page, '21-hero-again');
    await done(page);
  });
});

test('round 2e: pass, status, scoring', async () => {
  test.setTimeout(290_000);
  await step('r2: pass', async () => {
    await addAction(page, 'Pass');
    await done(page);
  });
  await step('r2: status: score objectives', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = panel(page).getByRole('region', { name: 'Status' });
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await dump('score-picker', picker(page), 8000);
    await shot(page, '22-score-picker');
  });
});
test('round 2f: scoring', async () => {
  test.setTimeout(290_000);
  await step('r2: score Develop Weaponry (public) and a secret', async () => {
    await choose(page, 'develop weaponry', /^Choose Develop Weaponry/);
    const status = panel(page).getByRole('region', { name: 'Status' });
    await dump('scored-1', status, 30000);
    await shot(page, '23-scored');
    console.log('TOTALS after score', JSON.stringify(await totals(page)));
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'adapt new', /^Choose Adapt New Strategies/);
    await dump('scored-2', status, 30000);
    console.log('TOTALS after score 2', JSON.stringify(await totals(page)));
  });
});
test('round 2g: points, tokens, Mecatol, agenda', async () => {
  test.setTimeout(290_000);
  await step('r2: points and tokens', async () => {
    const status = panel(page).getByRole('region', { name: 'Status' });
    await status.getByRole('button', { name: 'Add one Obsidian' }).click();
    await status.getByRole('button', { name: 'Add one Obsidian' }).click();
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Strategy' }).click();
    await expect(status.getByText('Distribute tokens: 0 left')).toBeVisible();
    await expectTotals(page, { VP: 2, Tactic: 1, Strategy: 3 }, 'Forecast');
  });
  await step('r2: take Mecatol by hand and open the agenda', async () => {
    await tapTile(page, 112);
    await dump('mecatol', stage(page), 8000);
    await stage(page).getByRole('group', { name: 'Control of Mecatol Rex' }).getByRole('button', { name: 'Mine' }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await panel(page).getByRole('button', { name: '+ Agenda' }).click();
    await dump('agenda-1', panel(page), 30000);
    await shot(page, '24-agenda');
  });
});
test('round 2h: agenda: Fleet Regulations', async () => {
  test.setTimeout(290_000);
  await step('r2: agenda picker', async () => {
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await dump('agenda-picker', picker(page), 10000);
    await choose(page, 'fleet regulations', /^Choose Fleet Regulations/);
    await dump('agenda-2', panel(page), 30000);
    await shot(page, '25-agenda-fleet');
    await done(page);
    console.log('TOTALS after agenda', JSON.stringify(await totals(page)));
    await openGroup(page, /^Objectives/);
    await dump('objectives-laws', drawer(page), 20000);
    await shot(page, '25b-laws');
    await closeDrawer(page);
  });
});
test('round 2i: done, round 3 starts', async () => {
  test.setTimeout(290_000);
  await step('r2: mark done, check', async () => {
    const boxes = panel(page).getByRole('checkbox', { name: 'Done' });
    const n = await boxes.count();
    for (let i = 0; i < n; i++) await boxes.nth(i).check();
    console.log('R2 entries', n);
    await dump('r2-list', panel(page), 30000);
    console.log('NOW r2', JSON.stringify(await totals(page)));
    await expectTotals(page, { 'Trade goods': 3, Commodities: 3, Tactic: 1, Fleet: 4, Strategy: 3, VP: 2 }, 'Now');
    await shot(page, '26-r2-done');
  });
  await step('r3: new round, Leadership primary', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('group', { name: 'Rounds' }).getByRole('button', { name: 'Round 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
    console.log('R3 start', JSON.stringify(await totals(page)));
    const lead = page.getByRole('button', { name: '1 Leadership' });
    await lead.click(); await lead.click(); await lead.click();
    const dip = page.getByRole('button', { name: '4 Construction' });
    await dip.click(); await dip.click();
    await addAction(page, 'Strategy');
    await dump('lead-editor', panel(page), 30000);
    await shot(page, '27-leadership');
  });
});
test('round 3a: leadership tokens', async () => {
  test.setTimeout(290_000);
  await step('r3 e1: 3 free tokens + 2 for 6 influence, one into Fleet over the law', async () => {
    const lead = panel(page);
    for (let i = 0; i < 4; i++) await lead.getByRole('button', { name: 'Add one Tactic' }).click();
    await lead.getByRole('button', { name: 'Add one Fleet' }).click();
    await dump('lead-after', panel(page), 30000);
    await shot(page, '28-lead-after');
    console.log('R3 lead totals', JSON.stringify(await totals(page)));
    await expectTotals(page, { Tactic: 5, Fleet: 5, Influence: 2 }, 'Forecast');
  });
});
test('round 3b: tactical to Saudor with the flagship', async () => {
  test.setTimeout(290_000);
  await step('r3 e2: flagship + carrier + fighters + 2 infantry to Saudor', async () => {
    await done(page);
    await addAction(page, 'Tactical action');
    await tapTile(page, 23);
    await expect(panel(page).getByText('Tactic tokens: 5 → 4')).toBeVisible();
    await dragRoute(page, [96, 23]);
    await dump('t4a', panel(page), 30000);
    await shot(page, '29-t4a');
    const p = panel(page);
    await p.getByRole('button', { name: 'Take one Flagship' }).click();
    await p.getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 2; i++) await p.getByRole('button', { name: 'Take one Infantry' }).click();
    for (let i = 0; i < 5; i++) await p.getByRole('button', { name: 'Take one Fighter' }).click();
    await expect(p.getByRole('heading', { name: /^Cargo on board: / })).toHaveText('Cargo on board: 7 of 7');
    await dump('t4b', panel(page), 30000);
    await shot(page, '29b-loaded');
    await p.getByRole('button', { name: 'Fly' }).click();
    const landing = panel(page).getByRole('group', { name: 'Landing on Saudor' });
    for (let i = 0; i < 2; i++) await landing.getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t4c', panel(page), 30000);
    await shot(page, '29c-landed');
    await done(page);
    console.log('R3 t4 totals', JSON.stringify(await totals(page)));
  });
});
test('round 3c: Wellon and the wormhole', async () => {
  test.setTimeout(290_000);
  await step('r3 e3: carrier + 3 infantry from Sem-Lore to Wellon', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 19);
    await expect(panel(page).getByText('Tactic tokens: 4 → 3')).toBeVisible();
    await dragRoute(page, [62, 19]);
    const p = panel(page);
    await p.getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 3; i++) await p.getByRole('button', { name: 'Take one Infantry' }).click();
    await p.getByRole('button', { name: 'Fly' }).click();
    const landing = panel(page).getByRole('group', { name: 'Landing on Wellon' });
    for (let i = 0; i < 3; i++) await landing.getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t5', panel(page), 30000);
    await done(page);
    console.log('R3 t5 totals', JSON.stringify(await totals(page)));
  });
  await step('r3 e4: dreadnought through the wormhole to Lodor: speed warning', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 26);
    await dragRoute(page, [96, 39, 26]);
    await dump('t6a', panel(page), 30000);
    await shot(page, '30-t6a');
    const p = panel(page);
    await p.getByRole('button', { name: 'Take one Dreadnought' }).click();
    await dump('t6b', panel(page), 30000);
    await p.getByRole('button', { name: 'Fly' }).click();
    await dump('t6c', panel(page), 30000);
    await shot(page, '30b-t6c');
  });
});
test('round 3d: wormhole by taps', async () => {
  test.setTimeout(290_000);
  await step('r3 e4: redo the route by taps through the wormhole', async () => {
    await panel(page).getByRole('button', { name: /^Remove source/ }).click();
    await page.waitForTimeout(800);
    await tapTile(page, 96);
    await tapTile(page, 39);
    await tapTile(page, 26);
    await dump('t6d', panel(page), 30000);
    await shot(page, '31-t6d');
    const p = panel(page);
    await p.getByRole('button', { name: 'Take one Dreadnought' }).click();
    await p.getByRole('button', { name: 'Fly' }).click();
    await dump('t6e', panel(page), 30000);
    await shot(page, '31b-t6e');
  });
});
test('round 3e: relic The Obsidian', async () => {
  test.setTimeout(290_000);
  await step('r3 e4: Took: relic The Obsidian, and a secret objective', async () => {
    await panel(page).getByRole('button', { name: '+ Took' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('obsidian');
    await dump('took-obsidian', picker(page), 8000);
    await picker(page).getByRole('button', { name: /^Choose The Obsidian/ }).first().click();
    await dump('took-editor', panel(page), 30000);
    await shot(page, '32-relic');
    await done(page);
    await openGroup(page, /^Relics/);
    await dump('relics', drawer(page), 8000);
    await shot(page, '32b-relics-drawer');
    await closeDrawer(page);
  });
});
test('probe: relics drawer', async () => {
  for (const mode of ['Forecast', 'Now'] as const) {
    await page.getByRole('group', { name: 'The map shows' }).getByRole('button', { name: mode, exact: true }).click();
    await openGroup(page, /^Relics/);
    await dump('relics-' + mode, drawer(page), 8000);
    await openGroup(page, /^Cards/);
    await dump('cards-' + mode, drawer(page), 8000);
    await closeDrawer(page);
  }
  await page.getByRole('group', { name: 'The map shows' }).getByRole('button', { name: 'Forecast', exact: true }).click();
});
test('round 3f: construction and technology secondaries', async () => {
  test.setTimeout(290_000);
  await step('r3 e5: Construction (Thunder\'s Edge) as a secondary', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '4 Construction' }).click();
    await dump('constr-0', panel(page), 30000);
    await shot(page, '33-constr');
    const mode = panel(page).getByRole('group', { name: 'Card mode' });
    await dump('constr-mode', mode, 4000);
  });
});
test('round 3g: build a structure', async () => {
  test.setTimeout(290_000);
  await step('r3 e5: Construction primary: a space dock on Sem-Lore', async () => {
    await panel(page).getByRole('button', { name: 'Construction', exact: true }).click();
    await dump('constr-1', panel(page), 30000);
    await shot(page, '34-constr-1');
  });
});
test('round 3h: build in the hex', async () => {
  test.setTimeout(290_000);
  await step('r3 e5: Create mode on Sem-Lore', async () => {
    await tapTile(page, 62);
    await dump('stage62', stage(page), 8000);
    await stage(page).getByRole('button', { name: 'Create', exact: true }).click().catch(() => {});
    await dump('stage62-create', stage(page), 8000);
    await shot(page, '35-stage62');
  });
});
test('round 3i: space dock bought, technology secondary', async () => {
  test.setTimeout(290_000);
  await step('r3 e5: space dock on Sem-Lore', async () => {
    await stage(page).getByRole('button', { name: 'Space dock', exact: true }).click();
    await dump('stage62-bought', stage(page), 8000);
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('constr-2', panel(page), 30000);
    await shot(page, '36-constr-2');
    await done(page);
    console.log('R3 constr totals', JSON.stringify(await totals(page)));
  });
  await step('r3 e6: Technology secondary: Destroyer II', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('group', { name: 'Card mode' }).getByRole('button', { name: /^Secondary/ }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'destroyer ii', /^Choose Destroyer II/);
    await dump('tech2-editor', panel(page), 30000);
    await shot(page, '37-tech2');
    await expectTotals(page, { Strategy: 2 }, 'Forecast');
    console.log('R3 tech2 totals', JSON.stringify(await totals(page)));
    await done(page);
  });
});
test('round 3j: pass, status, agenda', async () => {
  test.setTimeout(290_000);
  await step('r3 e7: pass with a commodity transaction to Sol', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sol' }).click();
    const give = panel(page).getByRole('group', { name: 'Give' });
    for (let i = 0; i < 3; i++) await give.getByRole('button', { name: 'Add one Commodities' }).click();
    await panel(page).getByRole('group', { name: 'Get' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    await dump('trans-r3', panel(page), 30000);
    await shot(page, '38-trans-r3');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page);
    await expectTotals(page, { Commodities: 0, 'Trade goods': 3 }, 'Forecast');
    console.log('R3 after trans', JSON.stringify(await totals(page)));
  });
  await step('r3 e8: status: score, tokens', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = panel(page).getByRole('region', { name: 'Status' });
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'expand borders', /^Choose Expand Borders/);
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'cut supply', /^Choose Cut Supply Lines/);
    await status.getByRole('button', { name: 'Add one Obsidian' }).click();
    await status.getByRole('button', { name: 'Add one Obsidian' }).click();
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Strategy' }).click();
    await status.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'direct hit', /^Choose Direct Hit/);
    await dump('status-3', status, 30000);
    await shot(page, '39-status-3');
    console.log('R3 status', JSON.stringify(await totals(page)));
  });
});
test('round 3k: agenda: Executive Sanctions', async () => {
  test.setTimeout(290_000);
  await step('r3 e9: agenda Executive Sanctions, hand limit', async () => {
    await panel(page).getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'executive sanctions', /^Choose Executive Sanctions/);
    for (const card of ['Plagiarize', 'Scramble Frequency']) {
      await panel(page).getByRole('button', { name: '+ Took' }).click();
      await choose(page, card.toLowerCase(), new RegExp(`^Choose ${card}`));
    }
    await dump('sanctions-none', panel(page), 30000);
    await shot(page, '40-sanctions-none');
    await panel(page).getByRole('group', { name: 'Outcome' }).getByRole('button', { name: 'Against' }).click();
    await dump('sanctions-against', panel(page), 30000);
    await panel(page).getByRole('group', { name: 'Outcome' }).getByRole('button', { name: 'For' }).click();
    await dump('sanctions-for', panel(page), 30000);
    await shot(page, '40b-sanctions-for');
  });
});
test('round 3l: done, round 4 starts', async () => {
  test.setTimeout(290_000);
  await step('r3: mark done', async () => {
    await done(page);
    const boxes = panel(page).getByRole('checkbox', { name: 'Done' });
    const n = await boxes.count();
    console.log('R3 entries', n);
    for (let i = 0; i < n; i++) await boxes.nth(i).check();
    console.log('NOW r3', JSON.stringify(await totals(page)));
    await shot(page, '41-r3-done');
  });
  await step('r4: new round, Imperial primary with Mecatol', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('group', { name: 'Rounds' }).getByRole('button', { name: 'Round 4', exact: true })).toHaveAttribute('aria-pressed', 'true');
    console.log('R4 start', JSON.stringify(await totals(page)));
    const imp = page.getByRole('button', { name: '8 Imperial' });
    await imp.click(); await imp.click(); await imp.click();
    await addAction(page, 'Strategy');
    await dump('imperial-editor', panel(page), 30000);
    await shot(page, '42-imperial');
    console.log('R4 imperial', JSON.stringify(await totals(page)));
  });
});
test('round 4a: gain faction technologies and the breakthrough', async () => {
  test.setTimeout(290_000);
  await step('r4 e1: Took the faction techs', async () => {
    for (const [q, n] of [['planesplitter', 'Planesplitter (Obsidian)'], ['parasite', 'Neural Parasite (Obsidian)']] as const) {
      await panel(page).getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, `${n}`);
    }
    await dump('imperial-took', panel(page), 30000);
    await panel(page).getByRole('button', { name: '+ Expedition' }).click();
    await dump('expedition-1', panel(page), 30000);
    await shot(page, '43a-expedition');
    await panel(page).getByRole('button', { name: 'Technology', exact: true }).click();
    await dump('expedition-2', panel(page), 30000);
    console.log('R4 in expedition', JSON.stringify(await totals(page)));
    await shot(page, '43a2-expedition');
    await shot(page, '43-took-faction');
    await done(page);
    await panel(page).getByRole('button', { name: '+ Took' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('reaping');
    await dump('took-reaping', picker(page), 3000);
    // BUG: The Reaping cannot be gained in the plan: not in the Took picker, the expedition (expedition note 3) does not give it, the drawer shows none.
    await expect(picker(page).getByText('Nothing found.')).toBeVisible();
    await picker(page).getByRole('button', { name: 'Close' }).click();
    await done(page);
    await openGroup(page, /^Faction/);
    await dump('faction-r4', drawer(page), 20000);
    await shot(page, '43b-faction-r4');
    await openGroup(page, /^Technologies/);
    await dump('tech-r4', drawer(page), 20000);
    await shot(page, '43c-tech-r4');
    await closeDrawer(page);
  });
});
test('round 4b: tactical on New Albion', async () => {
  test.setTimeout(290_000);
  await step('r4 e2: two sources to 27', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 27);
    await dragRoute(page, [26, 27]);
    await panel(page).getByRole('button', { name: 'Take one Dreadnought' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await addSource(page);
    await tapTile(page, 19);
    await tapTile(page, 27);
    await dump('r4t1a', panel(page), 30000);
    await shot(page, '44-r4t1a');
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('r4t1b', panel(page), 30000);
    await shot(page, '44b-r4t1b');
  });
});
test('round 4c: battle with used cards, landing', async () => {
  test.setTimeout(290_000);
  await step('r4 e2: battle, Hacan fighter lost, used cards and the agent', async () => {
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await dump('r4battle', stage(page), 12000);
    await shot(page, '45-r4battle');
    const hex = stage(page).getByRole('group', { name: 'Big hex' });
    await hex.getByRole('button', { name: /Fighter ×1 \(The Emirates of Hacan\)/ }).click();
    await shot(page, '45b-r4battle');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    for (const [q, n] of [['direct hit', 'Direct Hit'], ['scramble', 'Scramble Frequency'], ['vos hollow', 'Vos Hollow']] as const) {
      await panel(page).getByRole('button', { name: '+ Used' }).click();
      await choose(page, q, new RegExp(`^Choose ${n}`));
    }
    await dump('r4used', panel(page), 30000);
    await shot(page, '46-r4used');
    const landing = panel(page).getByRole('group', { name: 'Landing on Starpoint' });
    for (let i = 0; i < 3; i++) await landing.getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('r4landed', panel(page), 30000);
    await shot(page, '46b-r4landed');
    await done(page);
    console.log('R4 e2 totals', JSON.stringify(await totals(page)));
  });
});
test('probe: who controls Starpoint', async () => {
  await tapTile(page, 27);
  await dump('stage27-r4', stage(page), 8000);
  await shot(page, '46c-stage27');
  console.log('R4 probe27', JSON.stringify(await totals(page)));
  await stage(page).getByRole('button', { name: 'Close' }).click();
  await dump('entries-r4', panel(page).getByRole('region', { name: 'Actions' }), 8000);
});
test('round 4d: second agent use, commander, Fracture', async () => {
  test.setTimeout(290_000);
  await step('r4 e3: pass with the agent used a second time', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'vos hollow', /^Choose Vos Hollow/);
    await dump('r4pass-agent', panel(page), 30000);
    await shot(page, '47-r4pass-agent');
  });
  await step('r4: Thunder\'s Edge drawer: the Fracture', async () => {
    await page.getByRole('button', { name: /^Thunder's Edge/ }).click();
    await dump('te-drawer', page.getByRole('dialog').last(), 12000);
    await shot(page, '48-te-drawer');
  });
});
test('probe: used warnings in the pass', async () => {
  await page.getByRole('button', { name: /^Thunder's Edge/ }).click().catch(() => {});
  await page.waitForTimeout(600);
  await panel(page).getByRole('button', { name: '+ Used' }).click({ force: true });
  await choose(page, 'uprising', /^Choose Uprising/);
  await dump('probe-used-notheld', panel(page), 30000);
  await shot(page, '48b-used-notheld');
  // BUG: a pass entry shows no warning for a Used component that is not held or is exhausted (TurnEditor.tsx:66-77 takes the 'component' warnings out of rest() and renders them only for a component action); the tactical entry does show it.
  expect(await panel(page).getByRole('list', { name: 'Warnings' }).allInnerTexts()).toEqual([]);
  await panel(page).getByRole('button', { name: 'Remove Uprising' }).click();
});
test('probe: used warnings in a tactical entry', async () => {
  await done(page);
  await dump('r4-list-with-pass', panel(page).getByRole('region', { name: 'Actions' }), 8000);
  console.log('LIST warnings', await panel(page).locator('li[data-code], .has-warning, [data-warning]').count());
  await panel(page).getByRole('button', { name: /^Edit: Tactical action · New Albion/ }).click();
  await panel(page).getByRole('button', { name: '+ Used' }).click();
  await choose(page, 'uprising', /^Choose Uprising/);
  console.log('TACT warnings', await panel(page).getByRole('list', { name: 'Warnings' }).allInnerTexts());
  await dump('probe-used-tact', panel(page), 30000);
  await panel(page).getByRole('button', { name: 'Remove Uprising' }).click();
  await done(page);
});
test('round 4e: status, secret objective limit with the relic', async () => {
  test.setTimeout(290_000);
  await step('r4 e4: status: tokens, secrets over and within the limit', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = panel(page).getByRole('region', { name: 'Status' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    for (const q of ['destroy their greatest', 'control the region']) {
      await status.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, new RegExp(`^Choose ${q.replace(/^./, c => c.toUpperCase())}`, 'i'));
    }
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'establish a perimeter', /^Choose Establish a Perimeter/);
    await dump('status-4-over', status, 30000);
    await shot(page, '49-status-4-over');
    const w = await status.getByRole('list', { name: 'Warnings' }).allInnerTexts();
    console.log('R4 status warnings (5 secrets)', JSON.stringify(w));
    await status.getByRole('button', { name: 'Remove Control the Region' }).click();
    const w2 = await status.getByRole('list', { name: 'Warnings' }).allInnerTexts().catch(() => []);
    console.log('R4 status warnings (4 secrets)', JSON.stringify(w2));
    await dump('status-4-ok', status, 30000);
    await shot(page, '49b-status-4-ok');
  });
  await step('r4: all done, final totals', async () => {
    const boxes = panel(page).getByRole('checkbox', { name: 'Done' });
    const n = await boxes.count();
    console.log('R4 entries', n);
    for (let i = 0; i < n; i++) await boxes.nth(i).check();
    console.log('NOW r4', JSON.stringify(await totals(page)));
    await shot(page, '50-r4-done');
  });
});
test('round 4f: commander, Fracture, hints', async () => {
  test.setTimeout(290_000);
  await step('r4: Fracture opened, commander unlocked and used in the battle', async () => {
    await page.getByRole('button', { name: /^Thunder's Edge/ }).click();
    await drawer(page).getByRole('button', { name: 'Open the Fracture' }).click().catch(async () => {
      await page.getByRole('dialog', { name: "Thunder's Edge" }).getByRole('button', { name: 'Open the Fracture' }).click();
    });
    await dump('te-open', page.getByRole('dialog', { name: "Thunder's Edge" }), 8000);
    await shot(page, '51-fracture-open');
    await page.getByRole('button', { name: /^Thunder's Edge/ }).click();
    await openGroup(page, /^Faction/);
    await drawer(page).getByRole('group', { name: 'Aroz Hollow: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await closeDrawer(page);
    await panel(page).getByRole('button', { name: /^Edit: Tactical action · New Albion/ }).click();
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'aroz', /^Choose Aroz Hollow/);
    await dump('commander-used', panel(page), 30000);
    await shot(page, '52-commander-used');
    console.log('COMMANDER warnings', JSON.stringify(await panel(page).getByRole('list', { name: 'Warnings' }).allInnerTexts()));
    await done(page);
  });
  await step('r4: Strategy entry shows the Planesplitter reminder', async () => {
    await panel(page).getByRole('button', { name: /^Edit: Strategy: Imperial/ }).click();
    await dump('imperial-hint', panel(page), 30000);
    // BUG: hints with hintAt 'card' (Planesplitter and nine more) are never shown: StrategyEditor renders no StepHints.
    expect(await panel(page).getByRole('group', { name: 'Reminders for this step' }).count()).toBe(0);
    console.log('IMPERIAL reminders', JSON.stringify(await panel(page).getByRole('group', { name: 'Reminders for this step' }).allInnerTexts()));
    await done(page);
  });
});
