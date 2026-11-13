import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

/**
 * One long game as the Mahact Gene-Sorcerers, played through the interface only. Four players: Mahact (seat 1, tile 52),
 * Sol (tile 1), Last Bastion (tile 92, Thunder's Edge), Hacan (tile 16). Prophecy of Kings and Thunder's Edge on.
 */
const MAP = '78 40 42 67 69 34 39 27 26 65 79 47 32 30 29 73 41 21 52 62 19 1 44 36 38 61 76 92 37 50 16 35 31 33 22 23';
const SHOTS = 'test-results/scenarios/mahact';

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
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
async function tapTile(page: Page, n: number): Promise<void> {
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
const lines = async (loc: Locator) => (await loc.allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
const warnings = (page: Page) => panel(page).getByRole('list', { name: 'Warnings' }).getByRole('listitem');
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
  context = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, serviceWorkers: 'block' });
  page = await context.newPage();
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
});
test.afterAll(async () => { await context.close(); });
test.afterEach(() => { expect(errors, 'console errors').toEqual([]); });

test('part 1: setup and round 1', async () => {
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
    await page.getByRole('button', { name: 'The Mahact Gene-Sorcerers' }).click();
    await pick(2, 'The Federation of Sol');
    await pick(3, 'Last Bastion');
    await pick(4, 'The Emirates of Hacan');
    await page.getByRole('textbox', { name: 'Game name' }).fill('MahactGame');
    await shot(page, '00-players');
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('Home systems placed: 4.')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await shot(page, '00-game');
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 52)).toBeVisible();
    console.log('START TOTALS', JSON.stringify(await totals(page)));
    await shot(page, '01-start');
    await tapTile(page, 52);
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

  await step('round 1: strategy cards, Technology main and Imperial second', async () => {
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await expect(page.getByText('Main: 7 Technology')).toBeVisible();
    const imp = page.getByRole('button', { name: '8 Imperial' });
    await imp.click(); await imp.click();
    await expect(page.getByText('Main: 7 Technology · Second: 8 Imperial')).toBeVisible();
    await shot(page, '03-cards');
  });

  await step('setup: a Hacan fleet stands on the wormhole 39', async () => {
    await tapTile(page, 39);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Hacan' }).click();
    for (const u of ['Cruiser', 'Cruiser', 'Fighter']) await stage(page).getByRole('button', { name: u, exact: true }).click();
    await shot(page, '04-stage39');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  await step('tactical 1: a carrier with two infantry to Sem-Lore', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 62);
    await expect(page.getByText('Active system: Sem-Lore')).toBeVisible();
    await expect(panel(page).getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await tapTile(page, 52);
    await tapTile(page, 62);
    await expect(page.getByText('Flight Ixth → Sem-Lore')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await dump('t1a', panel(page));
    await shot(page, '05-t1');
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t1b', panel(page));
    await done(page);
    // A planet taken stands exhausted until the status phase (LRR 25.?): the totals do not grow yet.
    await expectTotals(page, { Resources: 3, Influence: 5, Tactic: 2 }, 'Forecast');
  });

  await step('tactical 2: a battle in space on 39, Edict and the flagship rule are hints', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 39);
    await tapTile(page, 52);
    await tapTile(page, 39);
    await expect(page.getByText('Flight Ixth → Wormhole')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Dreadnought' }).click();
    await panel(page).getByRole('button', { name: 'Take one Cruiser' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t2a', panel(page));
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await shot(page, '06-battle');
    await dump('battle', stage(page), 9000);
    await stage(page).getByRole('button', { name: 'Cruiser ×1' }).click();
    await dump('battle2', stage(page), 9000);
    await shot(page, '06-battle2');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t2b', panel(page));
    await done(page);
    await expectTotals(page, { Tactic: 1 }, 'Forecast');
  });

  await step('strategy: Technology primary, Genetic Recombination free, Crimson Legionnaire II for 6', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('group', { name: 'Technology · primary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'genetic', 'Genetic Recombination');
    await dump('tech1', panel(page));
    await panel(page).getByRole('button', { name: /Research a technology|Another technology|Add a technology/ }).first().click();
    await choose(page, 'crimson legionnaire', 'Crimson Legionnaire II');
    await dump('tech2', panel(page));
    await shot(page, '07-tech');
    await expect(panel(page).getByText('Not enough resources: need 6, paid 3, short by 3.')).toBeVisible();
    // Sem-Lore was taken this round and stands exhausted: only Ixth pays. Without Genetic Recombination only one biotic stands.
    await panel(page).getByRole('button', { name: 'Remove Genetic Recombination' }).click();
    await dump('tech3', panel(page));
    console.log('TECH3 WARN', JSON.stringify(await lines(warnings(page))));
    await shot(page, '08-tech-noprereq');
    await panel(page).getByRole('button', { name: 'Remove Crimson Legionnaire II' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'genetic', 'Genetic Recombination');
    await done(page);
    await expectTotals(page, { Resources: 3 }, 'Forecast');
  });

  await step('Politics secondary: the strategy token is spent, Jae Mir Kan spares it, a second use warns', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '3 Politics' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Politics · secondary ability' })).toBeVisible();
    await expectTotals(page, { Strategy: 1 });
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    for (const [q, n] of [['sabotage', 'Sabotage'], ['mining initiative', 'Mining Initiative']] as const) {
      await common.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await common.getByRole('button', { name: '+ Used' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('jae mir');
    await dump('pick-agent', picker(page), 3000);
    await picker(page).getByRole('button', { name: /^Choose Jae Mir Kan/ }).first().click();
    await dump('politics-agent', panel(page));
    await shot(page, '09-politics-agent');
    console.log('POL WARN', JSON.stringify(await lines(warnings(page))));
    await expectTotals(page, { Strategy: 2 });
    await done(page);
    await expectTotals(page, { Strategy: 2 }, 'Forecast');
  });

  await step('the agent was used: the drawer shows it exhausted; a second use warns', async () => {
    await openGroup(page, /^Faction/);
    await expect(drawer(page).getByRole('group', { name: 'Jae Mir Kan: state' }).getByRole('button', { name: 'Exhausted' })).toHaveAttribute('aria-pressed', 'true');
    await closeDrawer(page);
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '2 Diplomacy' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Diplomacy · secondary ability' })).toBeVisible();
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'jae mir', /^Choose Jae Mir Kan/);
    await dump('agent2', panel(page));
    console.log('AGENT2 WARN', JSON.stringify(await lines(warnings(page))));
    await shot(page, '10-agent2');
    await expectTotals(page, { Strategy: 1 });
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await step('action card as a component action: Mining Initiative on Ixth gives its 3 resources as trade goods', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await dump('mining', panel(page));
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Ixth', exact: true }).click();
    await expectTotals(page, { 'Trade goods': 3 }, 'Forecast');
    await done(page);
  });

  await step('deal: Scepter of Dominion and 2 trade goods go to Sol', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await dump('deal0', panel(page));
    const give = panel(page).getByRole('group', { name: 'Give', exact: true });
    await give.getByRole('button', { name: '+ Component' }).click();
    await dump('deal-pick', picker(page), 3000);
    await choose(page, 'scepter', 'Scepter of Dominion');
    await give.getByRole('group', { name: 'Trade goods' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    await dump('deal1', panel(page));
    await shot(page, '11-deal');
    console.log('DEAL WARN', JSON.stringify(await lines(warnings(page))));
  });

  await step('the deal is done: the note is in Sol hands in the drawer; the warning about distance stands', async () => {
    await expect(panel(page).getByText(/A transaction is only with a neighbour/)).toBeVisible();
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page);
    await expectTotals(page, { 'Trade goods': 2 }, 'Forecast');
    await openGroup(page, /^Cards/);
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Sol' }).click();
    await dump('sol-cards', drawer(page), 9000);
    await shot(page, '12-sol-cards');
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Mine' }).click();
    await dump('my-cards1', drawer(page), 9000);
    await closeDrawer(page);
  });

  await step('Imperial primary without Mecatol: a secret objective is drawn, no point', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Imperial · primary ability' })).toBeVisible();
    await dump('imperial1', panel(page));
    await done(page);
    await expectTotals(page, { VP: 0, Strategy: 2 }, 'Forecast');
  });

  await step('status phase of round 1: tokens, Edict by hand, an action card', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await dump('status1a', panel(page), 9000);
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    await expect(tokens).toContainText('Distribute tokens: 2 left');
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Fleet' }).click();
    await expect(tokens).toContainText('Distribute tokens: 0 left');
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' }).last();
    await taken.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'upgrade', 'Upgrade');
    await dump('status1b', panel(page), 12000);
    await shot(page, '13-status1');
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    // 2 + 1 tactic, 3 + 1 fleet; planets ready (Ixth 3/5, Sem-Lore 3/2), the commodities of Mahact refill to 3 only by Trade
    await expectTotals(page, { Tactic: 2, Fleet: 4, Strategy: 2, Resources: 6, Influence: 7, 'Trade goods': 2 }, 'Forecast');
    console.log('R1 END', JSON.stringify(await totals(page)));
  });
});

test('part 2: round 2', async () => {
  test.setTimeout(290_000);
  await step('round 2 begins: every entry done, the tokens on the map', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await expectTotals(page, { Resources: 6, Influence: 7, 'Trade goods': 2, Tactic: 2, Strategy: 2 }, 'Now');
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { Resources: 6, Influence: 7, 'Trade goods': 2, Commodities: 0, Tactic: 2, Fleet: 4, Strategy: 2, VP: 0 }, 'Forecast');
    console.log('R2 tokens on 62/39', await tile(page, 62).getByRole('img', { name: 'Command token' }).count(), await tile(page, 39).getByRole('img', { name: 'Command token' }).count());
    await shot(page, '15-round2');
  });

  await step('round 2: Trade main, Construction second; Trade primary refills the commodities', async () => {
    const trade = page.getByRole('button', { name: '5 Trade' });
    await trade.click(); await trade.click(); await trade.click();
    const con = page.getByRole('button', { name: '4 Construction' });
    await con.click(); await con.click();
    await expect(page.getByText('Main: 5 Trade · Second: 4 Construction')).toBeVisible();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await panel(page).getByRole('group', { name: 'Who uses the secondary for free' }).getByRole('button', { name: 'Sol' }).click();
    await dump('trade', panel(page));
    await done(page);
    await expectTotals(page, { 'Trade goods': 5, Commodities: 3, Strategy: 2 }, 'Forecast');
  });

  await step('Technology secondary: Neural Motivator for 4 resources and a token', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Technology · secondary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'neural motivator', 'Neural Motivator');
    await dump('tech-sec', panel(page));
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 4, paid 4');
    await shot(page, '16-tech-sec');
    await done(page);
    // The planets pay 3 from Ixth and a trade good the last 1 (Sem-Lore stays ready): 4 resources are spent, 3 left.
    await expectTotals(page, { Resources: 3, 'Trade goods': 4, Strategy: 1 }, 'Forecast');
  });

  await step('tactical 3: a carrier with two infantry flies three systems to Mecatol Rex at speed 1', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 112);
    await tapTile(page, 62);
    await tapTile(page, 27);
    await tapTile(page, 78);
    await tapTile(page, 112);
    await expect(page.getByRole('heading', { name: /^Flight Sem-Lore .*Mecatol Rex/ })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    await dump('t3a', panel(page));
    await expect(panel(page).getByText('Carrier from Sem-Lore has speed 1, and the route takes 3 steps.')).toBeVisible();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t3b', panel(page));
    console.log('T3 WARN2', JSON.stringify(await lines(warnings(page))));
    await shot(page, '17-t3');
    await done(page);
    await expectTotals(page, { Tactic: 1 }, 'Forecast');
    console.log('AFTER MECATOL', JSON.stringify(await totals(page)));
  });

  await step('Construction primary: a PDS and a space dock on Sem-Lore, no token', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Construction · primary ability' })).toBeVisible();
    await dump('constr', panel(page));
    await panel(page).getByRole('button', { name: 'Construction', exact: true }).click();
    await page.waitForTimeout(800);
    await tapTile(page, 62);
    await dump('constr-stage', stage(page), 5000);
    await stage(page).getByRole('button', { name: 'Space dock' }).click();
    await stage(page).getByRole('button', { name: 'PDS' }).click();
    await shot(page, '17b-construction');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await done(page);
    await expectTotals(page, { Strategy: 1, Tactic: 1 }, 'Forecast');
    await dump('t62', tile(page, 62));
  });

  await step('leaders: the commander of Mahact and the commander of Sol are unlocked by hand', async () => {
    await openGroup(page, /^Faction/);
    await drawer(page).getByRole('group', { name: 'Il Na Viroset: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await expect(drawer(page).getByRole('group', { name: 'Il Na Viroset: state' }).getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Sol' }).click();
    await dump('sol-faction', drawer(page), 6000);
    await drawer(page).getByRole('group', { name: 'Claire Gibson: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await expect(drawer(page).getByRole('group', { name: 'Claire Gibson: state' }).getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await shot(page, '18-sol-commander');
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Mine' }).click();
    await closeDrawer(page);
  });

  await step('tactical 4: Mecatol Rex again, my command token stands there; Il Na Viroset and Claire Gibson (Imperia) are named', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 112);
    await expect(page.getByText('Active system: Mecatol Rex')).toBeVisible();
    console.log('T4 WARN0', JSON.stringify(await lines(warnings(page))));
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'claire', /^Choose Claire Gibson/);
    console.log('T4 WARN1', JSON.stringify(await lines(warnings(page))));
    await dump('t4-claire', panel(page));
    await shot(page, '19-t4-claire');
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'il na', /^Choose Il Na Viroset/);
    console.log('T4 WARN2', JSON.stringify(await lines(warnings(page))));
    await dump('t4-il', panel(page));
    await shot(page, '20-t4-il');
  });

  await step('T4 done: the waived warnings stay in the list, shown as allowed', async () => {
    await expect(panel(page).getByText(/Allowed by: Il Na Viroset/)).toBeVisible();
    await expect(panel(page).getByText(/Allowed by: Imperia/)).toBeVisible();
    await panel(page).getByRole('list', { name: 'Warnings' }).first().scrollIntoViewIfNeeded();
    await shot(page, '21-t4-allowed');
    await done(page);
    await expectTotals(page, { Tactic: 0 }, 'Forecast');
  });

  await step('rival Sol: a fleet is set on Wellon, then takes Sem-Lore with three infantry', async () => {
    await tapTile(page, 19);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    for (const u of ['Carrier', 'Infantry', 'Infantry', 'Infantry']) await stage(page).getByRole('button', { name: u, exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    const before = await totals(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Sol' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 62);
    await tapTile(page, 19);
    await tapTile(page, 62);
    await dump('sol-t-a', panel(page));
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('sol-t-b', panel(page));
    await shot(page, '22-sol-t');
    await done(page);
    const after = await totals(page);
    console.log('SOL TAKES SEM-LORE', JSON.stringify(before), JSON.stringify(after));
    await dump('t62-after-sol', tile(page, 62));
    await shot(page, '23-sol-took');
  });

  await step('rival Sol: Warfare as a strategy card, then a pass with his Alliance note given to me (Hubris)', async () => {
    const before = await totals(page);
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '6 Warfare' }).click();
    await dump('sol-warfare', panel(page));
    await shot(page, '24-sol-warfare');
    await done(page);
    expect(await totals(page)).toEqual(before);

    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await dump('sol-deal0', panel(page), 4000);
    const withWhom = panel(page).getByRole('group', { name: 'With whom' });
    console.log('WITH WHOM', JSON.stringify(await withWhom.getByRole('button').allInnerTexts()));
    await withWhom.getByRole('button', { name: 'Mahact' }).first().click().catch(() => console.log('no Mahact button'));
    const give = panel(page).getByRole('group', { name: 'Give', exact: true });
    await give.getByRole('button', { name: '+ Component' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('alliance');
    await dump('alliance-pick', picker(page), 4000);
    await picker(page).getByRole('button', { name: /^Choose Alliance/ }).first().click();
    await dump('sol-deal1', panel(page), 6000);
    // BUG: Hubris gives no warning when a RIVAL entry hands me his Alliance (the `dealt` hook only fires for my entries); the list below stays empty.
    console.log('SOL DEAL WARN', JSON.stringify(await lines(warnings(page))));
    await shot(page, '25-sol-alliance');
  });

  await step('the note reached me anyway; then my own entry gets it from Sol', async () => {
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page);
    await openGroup(page, /^Cards/);
    await dump('my-cards2', drawer(page), 9000);
    await closeDrawer(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine' }).click();
    await addAction(page, 'Manual adjustment');
    await panel(page).getByRole('textbox', { name: 'Label' }).fill('Edict: a Hacan token into the fleet pool after the battle on 39');
    await panel(page).getByRole('group', { name: 'Fleet' }).getByRole('button', { name: 'Add one Fleet' }).click();
    await done(page);
    await expectTotals(page, { Fleet: 5 }, 'Forecast');
    await openGroup(page, /^Faction/);
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('vaults of the heir');
    await page.waitForTimeout(800);
    await dump('bt-search', drawer(page), 4000);
    await shot(page, '27-bt-search');
    console.log('BT BUTTONS', JSON.stringify(await drawer(page).getByRole('button').allInnerTexts()));
  });
});

test('part 3: round 2 end, status and agenda', async () => {
  test.setTimeout(290_000);
  await step('close the drawer; Vaults of the Heir enters my components', async () => {
    await drawer(page).getByRole('button', { name: 'Add Vaults of the Heir' }).click().catch(() => console.log('no add btn'));
    await page.waitForTimeout(300);
    await dump('bt-added', drawer(page), 4000);
    await closeDrawer(page);
  });
  await step('status phase of round 2: dump, scoring', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await dump('status2a', panel(page), 12000);
    await shot(page, '29-status2');
    const st = panel(page).getByRole('listitem', { name: 'Tokens and points' });
    await st.getByRole('button', { name: 'Add one Tactic' }).click();
    await st.getByRole('button', { name: 'Add one Strategy' }).click();
    await st.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'corner the market', 'Corner the Market');
    await st.getByRole('group', { name: 'Mahact' }).getByRole('button', { name: 'Add one Mahact' }).click();
    await dump('status2b', st, 12000);
    await expectTotals(page, { VP: 2, Tactic: 1, Strategy: 2 }, 'Forecast');
    await shot(page, '30-scored');
  });
  await step('agenda: a policy card entry', async () => {
    await panel(page).getByRole('button', { name: '+ Agenda' }).click();
    await dump('agenda0', panel(page), 8000);
    await shot(page, '31-agenda0');
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('holy planet');
    await dump('agenda-pick', picker(page), 3000);
    await picker(page).getByRole('button', { name: /^Choose Holy Planet/ }).first().click();
    await panel(page).getByRole('button', { name: 'Elect Ixth' }).click();
    await dump('agenda1', panel(page), 3000);
    await shot(page, '32-agenda1');
    await done(page);
    await expectTotals(page, { VP: 3 }, 'Forecast');
  });
});

test('part 4: round 3', async () => {
  test.setTimeout(290_000);
  await step('round 3 begins', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Now' })).toBeVisible();
    console.log('R3 start', JSON.stringify(await totals(page)));
    await shot(page, '33-round3');
  });
  await step('round 3: Leadership main, Warfare second; Leadership primary', async () => {
    const ld = page.getByRole('button', { name: '1 Leadership' });
    await ld.click(); await ld.click(); await ld.click();
    const wf = page.getByRole('button', { name: '6 Warfare' });
    await wf.click(); await wf.click();
    await expect(page.getByText('Main: 1 Leadership · Second: 6 Warfare')).toBeVisible();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Leadership · primary ability' })).toBeVisible();
    await dump('lead0', panel(page), 7000);
    await shot(page, '34-leadership');
    const tk = panel(page).getByRole('group', { name: 'Token distribution' });
    for (let k = 0; k < 3; k++) await tk.getByRole('button', { name: 'Add one Tactic' }).click();
    await dump('lead1', panel(page), 7000);
    for (let k = 0; k < 2; k++) await tk.getByRole('button', { name: 'Add one Fleet' }).click();
    await dump('lead2', panel(page), 7000);
    console.log('LEAD WARN', JSON.stringify(await lines(warnings(page))));
    await shot(page, '35-leadership2');
    await done(page);
    await expectTotals(page, { Tactic: 4, Fleet: 7, Influence: 5, Resources: 3, Strategy: 2 }, 'Forecast');
  });
  await step('tactical 5: activate home Ixth, production there', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 52);
    await expect(page.getByText('Active system: Ixth')).toBeVisible();
    console.log('T5 WARN0', JSON.stringify(await lines(warnings(page))));
    await dump('t5a', panel(page), 9000);
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await dump('shop0', stage(page), 9000);
    await shot(page, '36-shop');
    const sp = stage(page);
    await sp.getByRole('group', { name: 'Ixth' }).getByRole('button', { name: 'Mech', exact: true }).click();
    await sp.getByRole('button', { name: 'Cruiser', exact: true }).click();
    await sp.getByRole('button', { name: 'Destroyer', exact: true }).click();
    await dump('shop1', sp, 9000);
    await shot(page, '37-shop1');
    await sp.getByRole('button', { name: 'Close' }).click();
    await dump('t5b', panel(page), 12000);
    await shot(page, '38-t5b');
    await done(page);
    await expectTotals(page, { Tactic: 3, Resources: 0, 'Trade goods': 2, Fleet: 7 }, 'Forecast');
  });
  await step('tactical 6: take Sem-Lore back, a cruiser carries the Starlancer; battle and ground battle', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 62);
    await expect(page.getByText('Active system: Sem-Lore')).toBeVisible();
    await tapTile(page, 52);
    await tapTile(page, 62);
    await panel(page).getByRole('button', { name: 'Take one Cruiser' }).click();
    await panel(page).getByRole('button', { name: 'Take one Destroyer' }).click();
    await dump('t6a', panel(page), 9000);
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t6b', panel(page), 9000);
    await shot(page, '39-t6');
    console.log('T6 WARN', JSON.stringify(await lines(warnings(page))));
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await dump('t6battle', stage(page), 9000);
    await shot(page, '40-t6battle');
    await stage(page).getByRole('button', { name: 'Destroyer ×1' }).click();
    // NOTE: a loss recorded for Sol is shown in the battle panel but the Carrier stays on the tile afterwards.
    await stage(page).getByRole('button', { name: /^Carrier ×1/ }).click();
    await dump('t6loss', stage(page), 5000);
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t6c', panel(page), 9000);
    await done(page);
    await expectTotals(page, { Tactic: 2, Fleet: 7 }, 'Forecast');
    await dump('t62', tile(page, 62));
  });
  await step('component action: Vaults of the Heir', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'vaults', 'Vaults of the Heir');
    await dump('vaults0', panel(page), 9000);
    await shot(page, '41-vaults');
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    await common.getByRole('button', { name: '+ Discarded' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('neural');
    await dump('vaults-discard-pick', picker(page), 2500);
    await picker(page).getByRole('button', { name: /^Choose Neural Motivator/ }).first().click();
    await common.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'heart of ixth', 'Heart of Ixth');
    await dump('vaults1', panel(page), 9000);
    console.log('VAULTS WARN', JSON.stringify(await lines(warnings(page))));
    await shot(page, '42-vaults1');
    await done(page);
    await openGroup(page, /^Faction/);
    await dump('faction-after-vaults', drawer(page), 5000);
    await closeDrawer(page);
    await openGroup(page, /^Relics/);
    await dump('relics-after', drawer(page), 5000);
    await closeDrawer(page);
  });
  await step('Vaults a second time: warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'vaults', 'Vaults of the Heir');
    console.log('VAULTS2 WARN', JSON.stringify(await lines(warnings(page))));
    await dump('vaults2', panel(page), 4000);
    await shot(page, '43-vaults2');
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });
  await step('the hero is unlocked by hand and played: units move, the hero is purged', async () => {
    await openGroup(page, /^Faction/);
    await drawer(page).getByRole('group', { name: 'Airo Shir Aur: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await closeDrawer(page);
    await addAction(page, 'Component action');
    await choose(page, 'airo shir', /^Choose Airo Shir Aur/);
    // BUG: the From/To system picker overflows the panel (one wide row of squeezed buttons), see 44-hero0.png.
    await dump('hero0', panel(page), 6000);
    await shot(page, '44-hero0');
    await panel(page).getByRole('group', { name: 'From', exact: true }).getByRole('button', { name: 'Sem-Lore', exact: true }).click();
    await panel(page).getByRole('group', { name: 'To', exact: true }).getByRole('button', { name: 'Wellon', exact: true }).click();
    console.log('HERO WARN', JSON.stringify(await lines(warnings(page))));
    await done(page);
    await dump('t19', tile(page, 19));
    await dump('t62b', tile(page, 62));
    await openGroup(page, /^Faction/);
    await expect(drawer(page).getByRole('group', { name: 'Airo Shir Aur: state' }).getByRole('button', { name: 'Purged' })).toHaveAttribute('aria-pressed', 'true');
    await closeDrawer(page);
  });
  await step('hero a second time warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'airo shir', /^Choose Airo Shir Aur/);
    console.log('HERO2 WARN', JSON.stringify(await lines(warnings(page))));
    await shot(page, '45-hero2');
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });
  await step('Hubris: my pass, Sol gives me his Alliance note: refused', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sol' }).click();
    await panel(page).getByRole('group', { name: 'Get', exact: true }).getByRole('button', { name: '+ Component' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('alliance');
    await dump('hub-pick', picker(page), 3000);
    await picker(page).getByRole('button', { name: /^Choose Alliance/ }).first().click();
    await dump('hub1', panel(page), 5000);
    console.log('HUBRIS WARN', JSON.stringify(await lines(warnings(page))));
    await shot(page, '46-hubris');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page);
  });
  await step('status phase of round 3: tokens, a second objective, Vaults is readied', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const st = panel(page).getByRole('listitem', { name: 'Tokens and points' });
    await st.getByRole('button', { name: 'Add one Tactic' }).click();
    await st.getByRole('button', { name: 'Add one Tactic' }).click();
    await st.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'develop weaponry', 'Develop Weaponry');
    await st.getByRole('group', { name: 'Mahact' }).getByRole('button', { name: 'Add one Mahact' }).click();
    await shot(page, '47-status3');
    await expectTotals(page, { VP: 4, Tactic: 4 }, 'Forecast');
    console.log('R3 END', JSON.stringify(await totals(page)));
    await openGroup(page, /^Faction/);
    await dump('faction-r3end', drawer(page), 6000);
    await closeDrawer(page);
  });
});

test('part 5: round 4', async () => {
  test.setTimeout(290_000);
  await step('round 4 begins; Technology main, Imperial second', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    const imp = page.getByRole('button', { name: '8 Imperial' });
    await imp.click(); await imp.click();
    await expect(page.getByText('Main: 7 Technology · Second: 8 Imperial')).toBeVisible();
    console.log('R4 start', JSON.stringify(await totals(page)));
    await openGroup(page, /^Faction/);
    await expect(drawer(page).getByRole('group', { name: 'Jae Mir Kan: state' }).getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await dump('faction-r4', drawer(page), 6000);
    await closeDrawer(page);
  });
  await step('Technology primary: Plasma Scoring free, Cruiser II for 6', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'plasma scoring', 'Plasma Scoring');
    await panel(page).getByRole('button', { name: /Research a technology|Another technology|Add a technology/ }).first().click();
    await choose(page, 'cruiser ii', 'Cruiser II');
    await dump('tech-r4', panel(page), 9000);
    console.log('TECHR4 WARN', JSON.stringify(await lines(warnings(page))));
    await shot(page, '48-tech-r4');
    await done(page);
    await expectTotals(page, {}, 'Forecast');
    console.log('R4 after tech', JSON.stringify(await totals(page)));
  });
  await step('Upgrade (after activation) used in a tactical action: the cruiser at Wellon becomes a dreadnought', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'upgrade', 'Upgrade');
    console.log('UPGRADE-AS-ACTION WARN', JSON.stringify(await lines(warnings(page))));
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 19);
    await expect(page.getByText('Active system: Wellon')).toBeVisible();
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'upgrade', /^Choose Upgrade/);
    console.log('UPGRADE WARN', JSON.stringify(await lines(warnings(page))));
    await dump('upgrade1', panel(page), 6000);
    await done(page);
    await dump('t19b', tile(page, 19));
    await shot(page, '49-upgrade');
    await expectTotals(page, { Tactic: 3 }, 'Forecast');
  });
  await step('tactical 8: a carrier from Mecatol picks up two infantry on the way and lands on New Albion', async () => {
    await tapTile(page, 78);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    for (let i = 0; i < 2; i++) await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 27);
    await expect(page.getByText(/Active system: New Albion/)).toBeVisible();
    await tapTile(page, 112);
    await tapTile(page, 78);
    await tapTile(page, 27);
    await dump('t8a', panel(page), 8000);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    await panel(page).getByRole('group', { name: /^Mecatol/ }).getByRole('button', { name: 'Take one Infantry' }).click().catch(() => console.log('no mecatol infantry btn'));
    await dump('t8b', panel(page), 8000);
    await shot(page, '50-t8');
    for (let k = 0; k < 2; k++) await panel(page).getByRole('group', { name: '78' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 3 of 4' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('group', { name: 'Landing on New Albion' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Landing on New Albion' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Starpoint' }).getByRole('button', { name: 'Land one Infantry' }).click();
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    for (const [q, n] of [['unexpected action', 'Unexpected Action'], ['skilled retreat', 'Skilled Retreat'], ['direct hit', 'Direct Hit']] as const) {
      await common.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await shot(page, '51-t8done');
    console.log('T8 WARN', JSON.stringify(await lines(warnings(page))));
    await done(page);
    await expectTotals(page, { Tactic: 2 }, 'Forecast');
    await dump('t27', tile(page, 27));
    console.log('TOKENS', await Promise.all([52, 62, 19, 27, 112].map(async n => n + ':' + (await tile(page, n).getByRole('img', { name: 'Command token' }).count()))));
  });
  await step('Unexpected Action as a component action: a system without my token warns, Wellon returns its token', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'unexpected action', 'Unexpected Action');
    await dump('unexp0', panel(page), 3000);
    const sys = panel(page).getByRole('group', { name: 'System', exact: true });
    await sys.getByRole('button', { name: 'Sem-Lore', exact: true }).click();
    console.log('UNEXP WARN none-token', JSON.stringify(await lines(warnings(page))));
    await sys.getByRole('button', { name: 'Wellon', exact: true }).click();
    console.log('UNEXP WARN token', JSON.stringify(await lines(warnings(page))));
    await done(page);
    console.log('TOKENS2', await Promise.all([52, 62, 19, 27].map(async n => n + ':' + (await tile(page, n).getByRole('img', { name: 'Command token' }).count()))));
  });
  await step('rival Hacan: a component action (Mining Initiative), my totals stay', async () => {
    const before = await totals(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Hacan' }).click();
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await dump('hac-mining', panel(page), 5000);
    console.log('HAC WARN', JSON.stringify(await lines(warnings(page))));
    const planets = panel(page).getByRole('group', { name: 'Planet' });
    console.log('HAC planets', JSON.stringify(await planets.getByRole('button').allInnerTexts()));
    await planets.getByRole('button').first().click();
    await shot(page, '52-hacan-comp');
    await done(page);
    expect(await totals(page)).toEqual(before);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine' }).click();
  });
  await step('Imperial primary (my second card): Mecatol held, one point', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Imperial · primary ability' })).toBeVisible();
    await expect(panel(page).getByText('I control Mecatol Rex: +1 point')).toBeVisible();
    await done(page);
    await expectTotals(page, { Strategy: 2, VP: 5 }, 'Forecast');
  });
  await step('relic Heart of Ixth used in a deal turn; commodities to Hacan', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Hacan' }).click();
    const give = panel(page).getByRole('group', { name: 'Give', exact: true });
    await give.getByRole('group', { name: 'Commodities' }).getByRole('button', { name: 'Add one Commodities' }).click();
    await give.getByRole('group', { name: 'Commodities' }).getByRole('button', { name: 'Add one Commodities' }).click();
    await dump('deal-hac', panel(page), 4000);
    console.log('HACDEAL WARN', JSON.stringify(await lines(warnings(page))));
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page);
    await expectTotals(page, { Commodities: 1 }, 'Forecast');
  });
  await step('status phase of round 4: tokens, third objective; agenda: a law', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const st = panel(page).getByRole('listitem', { name: 'Tokens and points' });
    await st.getByRole('button', { name: 'Add one Tactic' }).click();
    await st.getByRole('button', { name: 'Add one Fleet' }).click();
    await st.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'expand borders', 'Expand Borders');
    await st.getByRole('group', { name: 'Mahact' }).getByRole('button', { name: 'Add one Mahact' }).click();
    await expectTotals(page, { VP: 6 }, 'Forecast');
    await panel(page).getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('wormhole reconstruction');
    await picker(page).getByRole('button', { name: /^Choose Wormhole Reconstruction/ }).first().click();
    await dump('agenda2', panel(page), 3000);
    await shot(page, '53-agenda2');
    await done(page);
    await openGroup(page, /^Objectives/);
    await dump('laws', drawer(page), 6000);
    await shot(page, '54-laws');
    await closeDrawer(page);
    console.log('R4 END', JSON.stringify(await totals(page)));
  });
  await step('Russian interface: no keys left, screenshot', async () => {
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    await page.getByRole('radio', { name: 'Русский' }).click();
    await page.getByRole('button', { name: /План и карта/ }).click();
    await page.waitForTimeout(500);
    await shot(page, '55-ru');
    const text = await page.locator('body').innerText();
    const keys = text.match(/[a-z]+.[a-zA-Z]+(.[a-zA-Z]+)+/g) ?? [];
    console.log('RU KEYS', JSON.stringify(keys.slice(0, 10)));
    await page.getByRole('button', { name: /Партия/ }).click();
    await page.getByRole('radio', { name: 'English' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
  });
});

test('part 6: round 5, the Scepter comes back', async () => {
  test.setTimeout(290_000);
  await step('round 5 begins: the Scepter hint stands at the round start', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    console.log('R5 start', JSON.stringify(await totals(page)));
    // BUG: the Scepter hint (hintAt 'round') is shown nowhere: no UI renders StepHints for 'round', 'card' or 'transaction'.
    await dump('r5-panel', panel(page), 5000);
    await shot(page, '56-round5');
  });
  await step('Sol plays the Scepter of Dominion (Used): it returns to me', async () => {
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Sol' }).click();
    await addAction(page, 'Pass');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'scepter', /^Choose Scepter of Dominion/);
    console.log('SCEPTER WARN', JSON.stringify(await lines(warnings(page))));
    await dump('scepter-used', panel(page), 5000);
    await done(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine' }).click();
    await openGroup(page, /^Cards/);
    await dump('cards-r5', drawer(page), 6000);
    await closeDrawer(page);
  });
});
