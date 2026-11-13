import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * One long game as the Naaz-Rokha Alliance through the interface only. Three players: Naaz-Rokha (me, seat 1, home 57),
 * the Federation of Sol (seat 2, home 1, base game) and the Ral Nel Consortium (seat 3, home 93, Thunder's Edge).
 * Prophecy of Kings and Thunder's Edge on. The map is a Milty string of the 3-player standard layout.
 *
 * Geometry (axial q,r; ring 1..3): me (0,-3); Quann 25 (0,-2); Ang 61 (1,-3); asteroid field 44 (-1,-2); Lodor 26 (0,-1) next to Mecatol.
 */
const MAP = '26 40 67 21 24 41 25 34 36 62 27 42 60 65 29 63 19 38 57 61 0 0 0 68 1 71 0 0 0 32 93 69 0 0 0 44 ' + '0 '.repeat(24).trim();
const SHOTS = 'test-results/scenarios/naaz';
mkdirSync(SHOTS, { recursive: true });

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const summary = (page: Page, name: string) => page.getByRole('group', { name: 'Totals, now and forecast' }).getByRole('group', { name, exact: true });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });
const stage = (page: Page) => page.locator('.stage-dialog');
/** A tap on the tab of the open group folds the stack, so a group is opened only when it is not the open one. */
async function openGroup(page: Page, name: RegExp) {
  if (await drawer(page).count() === 0) await page.getByRole('button', { name: /^Components/ }).click();
  const tab = groupTab(page, name);
  if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-pressed', 'true');
}
async function closeDrawer(page: Page) {
  if (await drawer(page).count() === 0) return;
  const open = groupTab(page, /./).and(page.locator('[aria-pressed=true]'));
  await open.first().click();
  await expect(drawer(page)).toHaveCount(0);
}

test.use({ actionTimeout: 10_000 });
expect.configure({ timeout: 6000 });
const errors: string[] = [];
async function dump(label: string, scope: Locator, limit = 6000) {
  const text = await scope.ariaSnapshot();
  writeFileSync(`${SHOTS}/dump-${label}.txt`, text);
  if (process.env.DUMP === label || process.env.DUMP === 'all') console.log(`--- ${label}\n${text.slice(0, limit)}`);
}
async function shot(page: Page, name: string) { await page.screenshot({ path: `${SHOTS}/${name}.png` }); }

/** The number a summary group shows. */
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
    // While an entry is open the toggle is off and the header reads "now -> forecast".
    if (await toggle.isEnabled()) await toggle.click();
  }
  await expect.poll(async () => {
    const got = await totals(page);
    return Object.fromEntries(Object.keys(want).map(k => [k, got[k]]));
  }, { message: `totals ${mode ?? ''}`, timeout: 4000 }).toEqual(want);
}

async function stillBox(target: Locator) {
  let last = '';
  let still = 0;
  await expect.poll(async () => { const now = JSON.stringify(await target.boundingBox()); still = now === last ? still + 1 : 0; last = now; return still >= 3; }, { intervals: [120] }).toBe(true);
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function tapTile(page: Page, n: number) { await stillBox(tile(page, n)); await tile(page, n).click(); }
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
  await picker(page).getByRole('button', { name: `Choose ${name}` }).first().click();
  await expect(picker(page)).toHaveCount(0);
}
async function done(page: Page) { await panel(page).getByRole('button', { name: 'Done', exact: true }).click(); }
async function step(title: string, body: () => Promise<void>) {
  const t = Date.now();
  console.log('>>', title);
  await test.step(title, body);
  console.log('   ok', ((Date.now() - t) / 1000).toFixed(1) + 's');
}

let context: BrowserContext;
let page: Page;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({
    baseURL: 'http://localhost:4173', viewport: { width: 1180, height: 820 }, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true,
  });
  page = await context.newPage();
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
});
test.afterAll(async () => { await context.close(); });
test.afterEach(() => { expect(errors, 'console errors').toEqual([]); });

test('1. setup and round 1', async () => {
  test.setTimeout(290_000);
  await step('create the game on the first screen', async () => {
    await page.addInitScript(() => { if (localStorage.getItem('ti4.lang') === null) localStorage.setItem('ti4.lang', 'en'); });
    await page.goto('/');
    await page.getByRole('button', { name: 'Remove opponent' }).last().click();
    await page.getByRole('button', { name: 'Remove opponent' }).last().click();
    await page.getByRole('button', { name: 'Remove opponent' }).last().click();
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'My faction', exact: true }).click();
    await page.getByRole('button', { name: 'The Naaz-Rokha Alliance' }).click();
    for (const [i, f] of [[2, 'The Federation of Sol'], [3, 'The Ral Nel Consortium']] as const) {
      await page.getByRole('group', { name: `Player ${i}` }).getByRole('button', { name: 'Opponent', exact: true }).click();
      await page.getByRole('button', { name: f }).click();
    }
    await shot(page, '00-game-screen');
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    await dump('mapimport', page.locator('body'), 3000);
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('textbox', { name: 'Game name' }).fill('NaazGame');
    await shot(page, '00b-map-built');
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 57)).toBeVisible();
    await dump('start', panel(page), 8000);
    console.log('TOTALS start', JSON.stringify(await totals(page)));
    await shot(page, '01-start');
  });

  await step('the components drawer at the start: every group of Naaz-Rokha', async () => {
    for (const name of ['Technologies', 'Cards', 'Faction', 'Relics', 'Objectives & laws']) {
      await openGroup(page, new RegExp(`^${name}`));
      await dump(`d0-${name.split(' ')[0]}`, drawer(page), 12000);
    }
    await openGroup(page, /^Faction/);
    await shot(page, '02-faction');
    await closeDrawer(page);
  });

  await step('round 1: Technology main, Trade second', async () => {
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    const trade = page.getByRole('button', { name: '5 Trade' });
    await trade.click(); await trade.click();
    await expect(page.getByText('Main: 7 Technology · Second: 5 Trade')).toBeVisible();
  });

  await step('tactical 1: carrier, mech and two infantry to Quann; the mech and Distant Suns on an exploration', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 25);
    await expect(page.getByText('Active system: Quann')).toBeVisible();
    await expect(panel(page).getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await tapTile(page, 57);
    await tapTile(page, 25);
    await expect(page.getByText('Flight Naazir / Rokha → Quann')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    await panel(page).getByRole('button', { name: 'Take one Mech' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 3 of 4' })).toBeVisible();
    await dump('t1-flight', panel(page), 9000);
    await shot(page, '03-t1-flight');
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Land one Mech' }).click();
    await dump('t1-land', panel(page), 9000);
    await shot(page, '04-t1-land');
    // Quann is cultural: the exploration is entered in "Taken and discarded". The relic fragment is held, not attached.
    await panel(page).getByRole('group', { name: 'Taken and discarded' }).getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'cultural relic', 'Cultural Relic Fragment');
    await dump('t1-took', panel(page), 14000);
    await shot(page, '05-t1-took');
    await done(page);
    await expectTotals(page, { Tactic: 2, Resources: 3, Influence: 3 }, 'Forecast');
  });

  await step('component action: Fabrication purges the relic fragment for a command token', async () => {
    await addAction(page, 'Component action');
    await expect(picker(page)).toBeVisible();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('fabrication');
    await dump('pick-fab', picker(page), 3000);
    await picker(page).getByRole('button', { name: 'Choose Fabrication' }).first().click();
    await panel(page).getByRole('group', { name: 'Gain' }).getByRole('button', { name: 'Command token' }).click();
    await dump('fab1', panel(page), 9000);
    await panel(page).getByRole('group', { name: 'Pool' }).getByRole('button', { name: 'Tactic pool' }).click();
    // The fragment is purged: it leaves the game (the exploration cards are components, so it can be named).
    await panel(page).getByRole('group', { name: 'Taken and discarded' }).getByRole('button', { name: '+ Discarded' }).click();
    await dump('fab-disc-pick', picker(page), 6000);
    await choose(page, 'cultural relic', 'Cultural Relic Fragment');
    await dump('fab2', panel(page), 9000);
    await shot(page, '06-fab2');
    await expectTotals(page, { Tactic: 3 });
    await done(page);
    await expectTotals(page, { Tactic: 3 }, 'Forecast');
  });
});

test('2. round 1 rest: Ang, Technology, pass, status; marking entries done one by one', async () => {
  test.setTimeout(290_000);
  await step('tactical 2: carrier, destroyer, two fighters and an infantry to Ang', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 61);
    await expect(page.getByText('Active system: Ang')).toBeVisible();
    await tapTile(page, 57);
    await tapTile(page, 61);
    await expect(page.getByText('Flight Naazir / Rokha → Ang')).toBeVisible();
    for (const u of ['Carrier', 'Destroyer', 'Fighter', 'Fighter', 'Infantry']) await panel(page).getByRole('button', { name: `Take one ${u}` }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t2-land', panel(page), 9000);
    await shot(page, '07-t2');
    await done(page);
    await expectTotals(page, { Tactic: 2, Resources: 3, Influence: 3 }, 'Forecast');
  });

  await step('Technology primary: Neural Motivator free, a second for resources', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Technology · primary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'neural motivator', 'Neural Motivator');
    await dump('tech1', panel(page), 9000);
    await shot(page, '08-tech1');
    await panel(page).getByRole('button', { name: /Research a technology|Another technology|Add a technology/ }).first().click();
    await choose(page, 'dacxive', 'Dacxive Animators');
    await dump('tech1b', panel(page), 9000);
    await shot(page, '08b-tech1b');
  });

  await step('the second technology is out of reach (cost 6, 3 resources): removed; Trade primary', async () => {
    await expect(panel(page).getByText('Not enough resources: need 6, paid 3, short by 3.')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove Dacxive Animators' }).click();
    await expect(panel(page).getByText(/Not enough resources/)).toHaveCount(0);
    await done(page);
    await expectTotals(page, { Resources: 3, Tactic: 2 }, 'Forecast');
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await dump('trade1', panel(page), 9000);
    await shot(page, '09-trade1');
    await done(page);
    // Trade primary: +3 trade goods and the commodities replenished (3 for Naaz-Rokha).
    await expectTotals(page, { 'Trade goods': 3, Commodities: 3, Strategy: 2 }, 'Forecast');
  });

  await step('pass, then the entries are looked at in Now and Forecast', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await dump('actions1', page.getByRole('region', { name: 'Actions' }), 9000);
    await expectTotals(page, { Resources: 3, Influence: 3, 'Trade goods': 0, Commodities: 0, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 }, 'Now');
    const checks = page.getByRole('region', { name: 'Actions' }).getByRole('checkbox', { name: 'Done' });
    await expect(checks).toHaveCount(6);
    // Entries done in order: Quann, Fabrication, Ang, Technology, Trade, Pass.
    const stages: Array<Partial<Record<string, number>>> = [
      { Tactic: 2, 'Trade goods': 0 }, { Tactic: 3 }, { Tactic: 2 }, { Tactic: 2, Resources: 3 }, { 'Trade goods': 3, Commodities: 3, Tactic: 2 }, { Tactic: 2, 'Trade goods': 3 },
    ];
    for (let i = 0; i < 6; i++) {
      await checks.nth(i).check();
      await expectTotals(page, stages[i], 'Now');
      await expectTotals(page, { Tactic: 2, 'Trade goods': 3, Commodities: 3 }, 'Forecast');
      await page.getByRole('button', { name: 'Now', exact: true }).click();
    }
    // Undo: Fabrication is unchecked while the later ones stay done: the token it gave goes away from Now only.
    await checks.nth(1).uncheck();
    await expectTotals(page, { Tactic: 1, 'Trade goods': 3 }, 'Now');
    await expectTotals(page, { Tactic: 2, 'Trade goods': 3 }, 'Forecast');
    await shot(page, '10-now-undo');
    await page.getByRole('button', { name: 'Now', exact: true }).click();
    await checks.nth(1).check();
    await expectTotals(page, { Tactic: 2 }, 'Now');
  });

  await step('status phase of round 1: tokens, an action card; the planets ready again', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    await expect(tokens).toContainText('Distribute tokens: 2 left');
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Strategy' }).click();
    await expect(tokens).toContainText('Distribute tokens: 0 left');
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' }).last();
    await taken.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'mining initiative', 'Mining Initiative');
    await dump('status1', panel(page), 9000);
    await shot(page, '11-status1');
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    // Naazir 2/1, Rokha 1/2, Quann 2/1, Ang 2/0 are ready again.
    await expectTotals(page, { Resources: 7, Influence: 4, 'Trade goods': 3, Commodities: 3, Tactic: 3, Fleet: 3, Strategy: 3, VP: 0 }, 'Forecast');
  });

  await step('round 2 begins; the totals in Now equal Forecast, since everything is done', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await expectTotals(page, { Resources: 7, Influence: 4, 'Trade goods': 3, Commodities: 3, Tactic: 3, Fleet: 3, Strategy: 3 }, 'Now');
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { Resources: 7, Influence: 4, 'Trade goods': 3, Commodities: 3, Tactic: 3, Fleet: 3, Strategy: 3 }, 'Forecast');
    await shot(page, '12-round2');
    await dump('r2-map', page.locator('.hexmap, svg').first(), 1);
  });
});

test('3. round 2: techs with AI Development Algorithm, production of mechs, agent', async () => {
  test.setTimeout(290_000);
  await step('round 2 cards: Leadership main, Imperial second', async () => {
    const lead = page.getByRole('button', { name: '1 Leadership' });
    await lead.click(); await lead.click(); await lead.click();
    const imp = page.getByRole('button', { name: '8 Imperial' });
    await imp.click(); await imp.click();
    await expect(page.getByText('Main: 1 Leadership · Second: 8 Imperial')).toBeVisible();
  });

  await step('Technology secondary: Fighter II misses propulsion; AI Development Algorithm in Used waives it', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Technology · secondary ability' })).toBeVisible();
    await expectTotals(page, { Strategy: 2 });
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'fighter ii', 'Fighter II');
    await dump('ff2-before', panel(page), 9000);
    await shot(page, '13-ff2-before');
    await expect(panel(page).getByText(/prerequisites of Fighter II/)).toBeVisible();
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await dump('pick-aida', picker(page), 3000);
    await choose(page, 'ai development', 'AI Development Algorithm');
    await dump('ff2-after', panel(page), 9000);
    await shot(page, '14-ff2-after');
  });
  await step('close the technology; Leadership primary gives tokens', async () => {
    await done(page);
    await expectTotals(page, { Resources: 3, Strategy: 2 }, 'Forecast');
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Leadership · primary ability' })).toBeVisible();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    for (const [pool, n] of [['Tactic', 2], ['Fleet', 1]] as const) for (let i = 0; i < n; i++) await tokens.getByRole('button', { name: `Add one ${pool}` }).click();
    await dump('lead', panel(page), 8000);
    await done(page);
    await expectTotals(page, { Tactic: 5, Fleet: 4, Strategy: 2, Influence: 3 }, 'Forecast');
  });

  await step('tactical 3: three Eidolon mechs at the dock; AI Development Algorithm a second time is warned', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 57);
    await expect(page.getByText(/Active system: Naazir/)).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = stage(page);
    await dump('shop0', shop, 9000);
    await shot(page, '15-shop0');
    for (const where of ['Rokha', 'Naazir', 'Naazir', 'Naazir']) await shop.getByRole('button', { name: `Mech, ${where}`, exact: true }).click();
    await dump('shop1', shop, 9000);
    await shot(page, '16-shop1');
    await shop.getByRole('button', { name: 'Give back Mech, Rokha' }).click();
    await expect(shop.getByRole('list', { name: 'Warnings' })).toHaveCount(0);
    await shop.getByRole('button', { name: 'Close' }).click();
    await dump('prod1', panel(page), 9000);
    await shot(page, '17-prod1');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    await expectTotals(page, { Resources: 0, 'Trade goods': 0, Tactic: 4 });
    // AI Development Algorithm was exhausted by the research of Fighter II: naming it again warns.
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'ai development', 'AI Development Algorithm');
    await dump('prod-aida2', panel(page), 9000);
    await shot(page, '18-prod-aida2');
    await done(page);
    await dump('r2-actions', page.getByRole('region', { name: 'Actions' }), 9000);
  });
  await step('tactical 4: the mech and two infantry of Quann go to Lodor; Garv and Gunn explore; Distant Suns', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 26);
    await expect(page.getByText('Active system: Lodor')).toBeVisible();
    await tapTile(page, 25);
    await tapTile(page, 26);
    await expect(page.getByText('Flight Quann → Lodor')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    await dump('t4-take', panel(page), 9000);
    await panel(page).getByRole('button', { name: 'Take one Mech' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await shot(page, '19-t4-take');
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Land one Mech' }).click();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'cultural relic', 'Cultural Relic Fragment');
    // The action cards drawn later in the round (Summit, Economic Initiative) are entered here, with the exploration.
    for (const [q, n] of [['economic initiative', 'Economic Initiative'], ['summit', 'Summit']] as const) {
      await taken.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'garv', 'Garv and Gunn');
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'cultural relic', 'Cultural Relic Fragment');
    await dump('t4-end', panel(page), 12000);
    await shot(page, '20-t4-end');
    await done(page);
    await expectTotals(page, { Tactic: 3 }, 'Forecast');
  });
  await step('Fabrication: two cultural fragments become a relic, Dynamis Core', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'fabrication', 'Fabrication');
    await panel(page).getByRole('group', { name: 'Gain' }).getByRole('button', { name: 'Relic' }).click();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await expectTotals(page, { Tactic: 3 });
    for (let i = 0; i < 2; i++) {
      await taken.getByRole('button', { name: '+ Discarded' }).click();
      await choose(page, 'cultural relic', 'Cultural Relic Fragment');
    }
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'dynamis', 'Dynamis Core');
    await dump('fab-relic', panel(page), 9000);
    await shot(page, '21-fab-relic');
    await done(page);
    await dump('r2-actions2', page.getByRole('region', { name: 'Actions' }), 9000);
    await expectTotals(page, { Tactic: 3 }, 'Forecast');
  });
  await step('Mining Initiative on Lodor, Economic Initiative readies the cultural planets, Dynamis Core gives trade goods', async () => {
    console.log('TOTALS before mining', JSON.stringify(await totals(page)));
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Lodor', exact: true }).click();
    await expectTotals(page, { 'Trade goods': 3 });
    await done(page);
    await addAction(page, 'Component action');
    await choose(page, 'economic initiative', 'Economic Initiative');
    await dump('econ', panel(page), 6000);
    await done(page);
    // Quann 2/1 and Lodor 3/1 are cultural and were exhausted.
    await expectTotals(page, { Resources: 5, Influence: 2, 'Trade goods': 3 }, 'Forecast');
    await addAction(page, 'Component action');
    await choose(page, 'dynamis', 'Dynamis Core');
    await dump('dynamis', panel(page), 6000);
    await shot(page, '22-dynamis');
    // commodity value 3 + 2 = 5 trade goods; the commodities stay 3 (the value falls back to 3 once purged).
    await expectTotals(page, { 'Trade goods': 8, Commodities: 3 });
    await done(page);
    await expectTotals(page, { Resources: 5, Influence: 2, 'Trade goods': 8, Commodities: 3, Tactic: 3, Fleet: 4, Strategy: 2 }, 'Forecast');
  });
  await step('tactical 5: two infantry from Lodor take Mecatol Rex; the custodians token', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 112);
    await tapTile(page, 26);
    await tapTile(page, 112);
    await expect(page.getByRole('heading', { name: /^Flight Lodor .*Mecatol Rex/ })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t5', panel(page), 9000);
    await shot(page, '23-t5');
    await expect(panel(page).getByText(/custodians token is still on Mecatol Rex/)).toBeVisible();
    await done(page);
    await expectTotals(page, { VP: 1, Tactic: 2 }, 'Forecast');
  });

  await step('Imperial primary: a point; a deal gives Black Market Forgery and commodities to Sol', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Imperial · primary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await dump('deal0', panel(page), 9000);
    const give = panel(page).getByRole('group', { name: 'Give', exact: true });
    await give.getByRole('button', { name: '+ Component' }).click();
    await dump('deal-pick', picker(page), 3000);
    await choose(page, 'black market', 'Black Market Forgery');
    for (let i = 0; i < 2; i++) await give.getByRole('group', { name: 'Commodities' }).getByRole('button', { name: 'Add one Commodities' }).click();
    await dump('deal1', panel(page), 9000);
    await shot(page, '24-deal1');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page);
    await expectTotals(page, { VP: 2, Commodities: 1 }, 'Forecast');
  });
  await step('the note stands with Sol; Sol plays it and it returns to me', async () => {
    await openGroup(page, /^Cards/);
    await dump('cards-sol-has', drawer(page), 9000);
    await shot(page, '25-cards-sol-has');
    await closeDrawer(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Sol' }).click();
    await addAction(page, 'Component action');
    await choose(page, 'black market', 'Black Market Forgery');
    await dump('sol-bmf', panel(page), 9000);
    await shot(page, '26-sol-bmf');
    await done(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine' }).click();
    await openGroup(page, /^Cards/);
    await dump('cards-back', drawer(page), 9000);
    await shot(page, '27-cards-back');
    await closeDrawer(page);
  });
  await step('pass; the agenda phase with Mecatol held: a law', async () => {
    await addAction(page, 'Pass');
    await done(page);
    const agendas = page.getByRole('region', { name: 'Agenda' });
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'wormhole reconstruction', 'Wormhole Reconstruction');
    await dump('agenda1', panel(page), 8000);
    await shot(page, '28-agenda');
    await done(page);
    await openGroup(page, /^Objectives & laws/);
    await expect(drawer(page).getByRole('group', { name: 'Laws' })).toContainText('Wormhole Reconstruction');
    await closeDrawer(page);
  });

  await step('status phase of round 2: Negotiate Trade Routes is scored with 5 trade goods', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'negotiate trade', 'Negotiate Trade Routes');
    const cost = panel(page).getByRole('group', { name: 'What scoring cost' });
    for (let i = 0; i < 5; i++) await cost.getByRole('button', { name: 'Add one trade good' }).click();
    await panel(page).getByRole('group', { name: 'Naaz-Rokha', exact: true }).getByRole('button', { name: 'Add one Naaz-Rokha' }).click();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Fleet' }).click();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' }).last();
    await taken.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'unexpected', 'Unexpected Action');
    await dump('status2', panel(page), 12000);
    await shot(page, '29-status2');
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    await expectTotals(page, { Resources: 11, Influence: 11, 'Trade goods': 3, Tactic: 3, Fleet: 5, Strategy: 2, VP: 3 }, 'Forecast');
  });
});

test('4. round 3: techs, flagship and mech at the dock, the hero, the breakthrough', async () => {
  test.setTimeout(290_000);
  await step('round 3 begins: every entry of round 2 is done; Now equals Forecast', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await expectTotals(page, { Resources: 11, Influence: 11, 'Trade goods': 3, Commodities: 1, Tactic: 3, Fleet: 5, Strategy: 2, VP: 3 }, 'Now');
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { Resources: 11, Influence: 11, 'Trade goods': 3, Commodities: 1, Tactic: 3, Fleet: 5, Strategy: 2, VP: 3 }, 'Forecast');
    await shot(page, '30-round3');
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    const trade = page.getByRole('button', { name: '5 Trade' });
    await trade.click(); await trade.click();
    await expect(page.getByText('Main: 7 Technology · Second: 5 Trade')).toBeVisible();
  });

  await step('Technology primary: Gravity Drive free, Supercharge for 6 (red prerequisite from AI Development Algorithm)', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'gravity drive', 'Gravity Drive');
    await panel(page).getByRole('button', { name: /Research a technology|Another technology|Add a technology/ }).first().click();
    await choose(page, 'supercharge', 'Supercharge');
    await dump('tech3', panel(page), 9000);
    await shot(page, '31-tech3');
    await expect(panel(page).getByText(/prerequisites of Supercharge/)).toHaveCount(0);
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    await done(page);
    await expectTotals(page, { Resources: 5 }, 'Forecast');
  });

  await step('Trade primary: three trade goods; the commodities are replenished to 3', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await done(page);
    await expectTotals(page, { 'Trade goods': 6, Commodities: 3, Strategy: 2 }, 'Forecast');
  });
  await step('tactical 6 at home: the flagship Visz El Vir and a fourth mech; AI Development Algorithm lowers the cost', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 57);
    await expect(page.getByText(/Active system: Naazir/)).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = stage(page);
    await shop.getByRole('button', { name: 'Flagship', exact: true }).click();
    await shop.getByRole('button', { name: 'Mech, Naazir', exact: true }).click();
    await dump('shop3', shop, 9000);
    await shot(page, '32-shop3');
    await shop.getByRole('button', { name: 'Close' }).click();
    await dump('prod3a', panel(page), 9000);
    await shot(page, '33-prod3a');
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'ai development', 'AI Development Algorithm');
    await page.waitForTimeout(800);
    await dump('prod3b', panel(page), 9000);
    await shot(page, '34-prod3b');
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    const pay = panel(page).getByRole('group', { name: 'Payment' });
    await dump('pay-manual', pay, 5000);
    await pay.getByRole('button', { name: 'Remove one trade good' }).click();
    await page.waitForTimeout(600);
    await dump('pay-manual2', panel(page), 9000);
    await shot(page, '35-pay-manual');
    // BUG: the editor says "Cost 10" and picks 10 for you although AI Development Algorithm (used here) makes the combined cost 9
    // (Flagship 8 + Mech 2 - 1 unit upgrade); the replay counts 9: paying 9 raises no warning. src/ui/plan/editors/TacticalEditor.tsx:75 uses productionCost
    // of unitStats (per unit), not costOf of src/domain/replay/production.ts:244, which also asks the 'productionCost' point.
    await expect(pay).toContainText('Cost 10, paid 9');
    await expect(panel(page).getByText(/Not enough resources/)).toHaveCount(0);
    await done(page);
    await expectTotals(page, { Resources: 0, 'Trade goods': 2, Tactic: 2 }, 'Forecast');
  });
  await step('leaders set in the drawer: the hero (three objectives), the commander (mechs in three systems)', async () => {
    await openGroup(page, /^Faction/);
    await dump('faction3', drawer(page), 12000);
    await shot(page, '36-faction3');
    await drawer(page).getByRole('group', { name: 'Hesh and Prit: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await drawer(page).getByRole('group', { name: 'Dart and Tai: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await expect(drawer(page).getByRole('group', { name: 'Hesh and Prit: state' }).getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await expect(drawer(page).getByRole('group', { name: 'Dart and Tai: state' }).getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await closeDrawer(page);
  });

  await step('hero Hesh and Prit: a relic, purged; played a second time it warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'hesh', 'Hesh and Prit');
    await dump('hero1', panel(page), 9000);
    await shot(page, '37-hero1');
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'shard of the throne', 'Shard of the Throne');
    await expectTotals(page, { VP: 4 });
    await done(page);
    await expectTotals(page, { VP: 4 }, 'Forecast');
    await addAction(page, 'Component action');
    await choose(page, 'hesh', 'Hesh and Prit');
    await dump('hero2', panel(page), 9000);
    await shot(page, '38-hero2');
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await step('hero: the secondaries of two unchosen cards (Diplomacy, Politics) are entered as secondary entries', async () => {
    console.log('TOTALS before hero secondaries', JSON.stringify(await totals(page)));
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '2 Diplomacy' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Diplomacy · secondary ability' })).toBeVisible();
    await dump('dipl', panel(page), 9000);
    await shot(page, '39-dipl');
    const ready = panel(page).getByRole('group', { name: 'Ready planets' });
    await ready.getByRole('button', { name: /^Lodor/ }).click();
    await ready.getByRole('button', { name: /^Mecatol Rex/ }).click();
    // BUG(cannot-do): the hero says the secondary is paid with tokens from the reinforcements, but the card has no such mode: the strategy pool pays.
    await expectTotals(page, { Resources: 4, Influence: 7, Strategy: 1 });
    await done(page);
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '3 Politics' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Politics · secondary ability' })).toBeVisible();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    for (const [q, n] of [['sabotage', 'Sabotage'], ['war effort', 'War Effort']] as const) {
      await taken.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await dump('polit', panel(page), 9000);
    await done(page);
    await expectTotals(page, { Strategy: 0, Resources: 4 }, 'Forecast');
  });
  await step('breakthrough Absolute Synergy is added in the drawer; the three mechs are returned by hand in the big hex', async () => {
    await openGroup(page, /^Faction/);
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('absolute synergy');
    await dump('bt-search', drawer(page), 5000);
    await drawer(page).getByRole('button', { name: 'Add Absolute Synergy' }).click();
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await dump('bt-added', drawer(page), 9000);
    await shot(page, '40-bt-added');
    await openGroup(page, /^Technologies/);
    await dump('units-bt', drawer(page), 12000);
    await shot(page, '41-units-bt');
    await closeDrawer(page);
    await tapTile(page, 57);
    await dump('t57-open', stage(page), 9000);
    await shot(page, '42-t57');
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await dump('t57-setup', stage(page), 9000);
    await shot(page, '43-t57-setup');
    // Absolute Synergy: three of the four mechs return to the reinforcements.
    for (let i = 0; i < 3; i++) await stage(page).getByRole('button', { name: /^Mech ×[0-9]$/ }).first().click();
    await expect(stage(page).getByRole('group', { name: 'Tile 57' }).getByRole('button', { name: /^Mech/ })).toHaveCount(1);
    await dump('t57-after', stage(page), 4000);
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('after-bt-actions', page.getByRole('region', { name: 'Actions' }), 12000);
  });

  await step('setup: two Sol infantry hold Sem-Lore; tactical 7 from Mecatol takes it (the commander Dart and Tai)', async () => {
    await tapTile(page, 62);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    for (let i = 0; i < 2; i++) await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await shot(page, '44-t62-setup');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 62);
    await tapTile(page, 112);
    await tapTile(page, 67);
    await tapTile(page, 62);
    await expect(page.getByRole('heading', { name: /^Flight Mecatol Rex .*Sem-Lore/ })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t7', panel(page), 9000);
    console.log('T7 warnings', await panel(page).getByRole('listitem').allInnerTexts());
    await shot(page, '45-t7');
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await dump('t7-battle', stage(page), 9000);
    await shot(page, '46-t7-battle');
    for (let i = 0; i < 2; i++) await stage(page).getByRole('button', { name: /Federation of Sol/ }).first().click();
    await stage(page).getByRole('button', { name: /^Infantry ×[0-9]$/ }).first().click();
    await dump('t7-battle2', stage(page), 9000);
    await shot(page, '47-t7-battle2');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t7-after', panel(page), 12000);
    await shot(page, '48-t7-after');
    // The commander: a planet taken from another player may be explored. It is a hint with no step: nothing in the landing block reminds of it.
    await expect(panel(page).getByRole('button', { name: /^Dart and Tai/ })).toHaveCount(0);
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'dart and tai', 'Dart and Tai');
    await panel(page).getByRole('group', { name: 'Taken and discarded' }).getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'cultural relic', 'Cultural Relic Fragment');
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toHaveCount(0);
    await done(page);
    await expect(tile(page, 62).getByRole('img', { name: 'Infantry ×1' })).toBeVisible();
    await expectTotals(page, { Tactic: 1 }, 'Forecast');
  });

  await step('the agent is played as a component action; a second time in the round it warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'garv', 'Garv and Gunn');
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toHaveCount(0);
    await done(page);
    await addAction(page, 'Component action');
    await choose(page, 'garv', 'Garv and Gunn');
    await expect(panel(page).getByText(/Garv and Gunn is exhausted/)).toBeVisible();
    await dump('agent2', panel(page), 6000);
    await shot(page, '49-agent2');
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await step('pass; the status phase of round 3: Diversify Research is scored', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'diversify research', 'Diversify Research');
    await panel(page).getByRole('group', { name: 'Naaz-Rokha', exact: true }).getByRole('button', { name: 'Add one Naaz-Rokha' }).click();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Fleet' }).click();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' }).last();
    for (const [q, n] of [['upgrade', 'Upgrade'], ['rally', 'Rally']] as const) {
      await taken.getByRole('button', { name: '+ Action card' }).click();
      await choose(page, q, n);
    }
    await dump('status3', panel(page), 12000);
    await shot(page, '50-status3');
    await dump('status3-warn', page.getByRole('region', { name: 'Status' }), 9000);
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    await expectTotals(page, { VP: 5, Tactic: 2, Fleet: 6 }, 'Forecast');
  });
  await step('round 3 is marked done one entry at a time: Now follows each, Forecast stays', async () => {
    const status = panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' });
    await status.uncheck();
    const checks = page.getByRole('region', { name: 'Actions' }).getByRole('checkbox', { name: 'Done' });
    const total3 = await checks.count();
    console.log('R3 action checkboxes', total3);
    await dump('r3-actions', page.getByRole('region', { name: 'Actions' }), 12000);
    // The checkboxes of round 3 are the last nine of the list (the entries of the earlier rounds belong to the other tabs).
    await expect(checks).toHaveCount(10);
    await expectTotals(page, { Resources: 11, Influence: 11, 'Trade goods': 3, Commodities: 1, Tactic: 3, Fleet: 5, Strategy: 2, VP: 3 }, 'Now');
    const stagesNow: Array<Partial<Record<string, number>>> = [
      { Resources: 5, Tactic: 3 }, { 'Trade goods': 6, Commodities: 3 }, { Resources: 0, 'Trade goods': 2, Tactic: 2 }, { VP: 4 },
      { Resources: 4, Influence: 7, Strategy: 1 }, { Strategy: 0 }, { Strategy: 0 }, { Tactic: 1 }, { Tactic: 1 }, { Tactic: 1 },
    ];
    for (let i = 0; i < 10; i++) {
      await checks.nth(i).check();
      await expectTotals(page, stagesNow[i], 'Now');
      await page.getByRole('button', { name: 'Now', exact: true }).click();
    }
    await status.check();
    await expectTotals(page, { VP: 5, Tactic: 2, Fleet: 6, Resources: 14, Influence: 13, 'Trade goods': 2, Commodities: 3, Strategy: 0 }, 'Now');
    // Undo the hero: the point of Shard of the Throne goes away from Now (it is lost with the card), Forecast keeps it.
    await checks.nth(3).uncheck();
    await expectTotals(page, { VP: 4 }, 'Now');
    await expectTotals(page, { VP: 5 }, 'Forecast');
    await shot(page, '51-now-undo-hero');
    await page.getByRole('button', { name: 'Now', exact: true }).click();
    await checks.nth(3).check();
    await expectTotals(page, { VP: 5 }, 'Now');
    await expectTotals(page, { VP: 5, Resources: 14, Influence: 13, 'Trade goods': 2, Commodities: 3, Tactic: 2, Fleet: 6, Strategy: 0 }, 'Forecast');
    await shot(page, '52-r3-all-done');
  });
});

test('5. round 4: the faction technology Pre-Fab Arcologies, Psychoarchaeology, an objective not met, a rival, Russian', async () => {
  test.setTimeout(290_000);
  await step('round 4 begins; Technology main, Imperial second', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { VP: 5, Resources: 14, Influence: 13, 'Trade goods': 2, Commodities: 3, Tactic: 2, Fleet: 6, Strategy: 0 }, 'Forecast');
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    const imp = page.getByRole('button', { name: '8 Imperial' });
    await imp.click(); await imp.click();
    await expect(page.getByText('Main: 7 Technology · Second: 8 Imperial')).toBeVisible();
    await shot(page, '53-round4');
  });

  await step('Technology primary: Pre-Fab Arcologies first misses the third green; Dacxive Animators first fixes it', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'pre-fab', 'Pre-Fab Arcologies');
    await dump('pfa1', panel(page), 9000);
    await shot(page, '54-pfa1');
    await expect(panel(page).getByText(/prerequisites of Pre-Fab Arcologies/)).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove Pre-Fab Arcologies' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'dacxive', 'Dacxive Animators');
    await panel(page).getByRole('button', { name: /Research a technology|Another technology|Add a technology/ }).first().click();
    await choose(page, 'pre-fab', 'Pre-Fab Arcologies');
    await dump('pfa2', panel(page), 9000);
    await shot(page, '55-pfa2');
    await expect(panel(page).getByText(/prerequisites of Pre-Fab Arcologies/)).toHaveCount(0);
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    await done(page);
    await expectTotals(page, { Resources: 8 }, 'Forecast');
  });
  await step('Imperial primary: a point for Mecatol; Psychoarchaeology named in Used gives nothing (a hint)', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '8 Imperial' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Imperial · primary ability' })).toBeVisible();
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'psychoarchaeology', 'Psychoarchaeology');
    await dump('imp4', panel(page), 9000);
    await shot(page, '56-imp4');
    await done(page);
    // BUG(cannot-do): "During the action phase, you can exhaust planets you control that have technology specialties to gain 1 trade good"
    // (Ang, Gral...) cannot be entered: Used does not add the trade good, nor exhaust the planet; only a manual adjustment can.
    await expectTotals(page, { VP: 6, 'Trade goods': 2 }, 'Forecast');
  });

  await step('Ral Nel, a rival of Thunders Edge, makes a tactical action; the map shows its colour', async () => {
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Ral Nel' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 69);
    await tapTile(page, 93);
    await tapTile(page, 69);
    await dump('ralnel-t', panel(page), 9000);
    const takes = panel(page).getByRole('button', { name: /^Take one / });
    console.log('RAL NEL takes', await takes.evaluateAll(a => a.map(x => x.getAttribute('aria-label'))));
    await takes.first().click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await shot(page, '57-ralnel');
    const before = await totals(page);
    await done(page);
    expect(await totals(page)).toEqual(before);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine' }).click();
  });

  await step('pass; status of round 4: Develop Weaponry needs two unit upgrades, I own one: warned', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'develop weaponry', 'Develop Weaponry');
    await page.waitForTimeout(600);
    await dump('status4', page.getByRole('region', { name: 'Status' }), 12000);
    await shot(page, '58-status4');
    await expect(page.getByRole('region', { name: 'Status' }).getByRole('list', { name: 'Warnings' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove Develop Weaponry' }).click();
    await expect(page.getByRole('region', { name: 'Status' }).getByRole('list', { name: 'Warnings' })).toHaveCount(0);
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
  });
  await step('tactical 8: Ang to Centauri and Gral; Rally in Used; Summit as a component action', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 34);
    await tapTile(page, 61);
    await tapTile(page, 34);
    await expect(page.getByText('Flight Ang → Centauri / Gral')).toBeVisible();
    for (const u of ['Carrier', 'Destroyer', 'Fighter', 'Fighter', 'Infantry']) await panel(page).getByRole('button', { name: `Take one ${u}` }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Gral' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'rally', 'Rally');
    await dump('t8', panel(page), 9000);
    await shot(page, '59-t8');
    await expectTotals(page, { Fleet: 8, Tactic: 1 });
    await done(page);
    await expectTotals(page, { Fleet: 8, Tactic: 1 }, 'Forecast');
    await addAction(page, 'Component action');
    await choose(page, 'summit', 'Summit');
    await dump('summit', panel(page), 9000);
    const pools = panel(page).getByRole('group', { name: 'Summit', exact: true });
    await pools.getByRole('button', { name: 'Add one Tactic pool' }).click();
    await pools.getByRole('button', { name: 'Add one Strategy pool' }).click();
    await shot(page, '60-summit');
    await expectTotals(page, { Tactic: 2, Strategy: 1, Fleet: 8 });
    await done(page);
    await dump('r4-actions', page.getByRole('region', { name: 'Actions' }), 14000);
    await expectTotals(page, { Tactic: 2, Strategy: 1, Fleet: 8 }, 'Forecast');
  });
  await step('round 4 is marked done: Now equals Forecast; the game survives a reload', async () => {
    const forecast = await (async () => { await page.getByRole('button', { name: 'Forecast', exact: true }).click().catch(() => {}); return totals(page); })();
    console.log('R4 forecast', JSON.stringify(forecast));
    for (const item of await page.getByRole('region', { name: 'Actions' }).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    for (const item of await page.getByRole('region', { name: 'Status' }).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await expectTotals(page, forecast, 'Now');
    await expectTotals(page, forecast, 'Forecast');
    await shot(page, '61-r4-done');
    await page.reload();
    await page.getByRole('button', { name: 'Plan & map' }).click().catch(() => {});
    await expect(tile(page, 57)).toBeVisible();
    await expectTotals(page, forecast, 'Forecast');
    await shot(page, '62-after-reload');
  });

  await step('Russian: the Naaz-Rokha components read in Russian and no raw key shows', async () => {
    await page.evaluate(() => localStorage.setItem('ti4.lang', 'ru'));
    await page.reload();
    await page.getByRole('button', { name: /План и карта/ }).click().catch(() => {});
    await expect(tile(page, 57).or(page.getByRole('button', { name: /Тайл 57|Tile 57/ }))).toBeVisible();
    await page.getByRole('button', { name: /^Компоненты/ }).click();
    const tabs = page.getByRole('group', { name: /Шторки|Drawers/ }).getByRole('button');
    console.log('RU tabs', await tabs.evaluateAll(a => a.map(x => (x.textContent ?? '').trim())));
    await tabs.filter({ hasText: /^Фракция/ }).click();
    await page.waitForTimeout(500);
    const text = await page.locator('body').innerText();
    writeFileSync(`${SHOTS}/ru-faction.txt`, text);
    await shot(page, '63-ru-faction');
    const raw = text.match(/(?:components|plan|stage|players|editor|unit|game|common|map|drawers|warning|rules).[a-zA-Z_.]+|(?:technology|leader|promissory|actionCard|relic|ability|mech|breakthrough):[a-z0-9_]+/g) ?? [];
    expect(raw, 'raw keys in Russian').toEqual([]);
    // BUG: the same game gives other numbers in Russian. In English the forecast has Commodities 3 (Dynamis Core was purged by its action in round 2, so the
    // commodity value is 3 again); in Russian it is 5, because src/domain/replay/holdings.ts (playComponent) tests /purge this card/, /exhaust this card/ and
    // /return this card to/ against def.text, which is the Russian translation; so no relic is purged, no technology or agent exhausted and no promissory note
    // returned while the interface is Russian.
    const commodities = text.match(/Продукция\s+([0-9]+)/);
    expect(Number(commodities?.[1])).toBe(5);
    await page.evaluate(() => localStorage.setItem('ti4.lang', 'en'));
  });
  // @@NEXT
});
