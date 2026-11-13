import { expect, test, type Locator, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

/**
 * One long game as the Council Keleres (Xxcha), played through the interface only. Six players: Keleres, Sol, Hacan,
 * Argent, Muaat, Yin. Prophecy of Kings on, Thunder's Edge off. Homes at the corners of ring 3.
 */
const R1 = [19, 20, 21, 22, 23, 24];
const R2 = [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];
// seats: 14 Keleres, 1 Sol, 16 Hacan, 58 Argent, 4 Muaat, 3 Yin
const R3 = [14, 37, 38, 1, 39, 40, 16, 41, 42, 58, 43, 44, 4, 45, 46, 3, 47, 48];
const MAP = [...R1, ...R2, ...R3].join(' ');
const SHOTS = 'test-results/scenarios/keleresx';

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
  writeFileSync(`${SHOTS}/dump-${label}.txt`, text, 'utf8');
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
async function header(page: Page) { return (await page.getByRole('group', { name: 'Totals, now and forecast' }).innerText()).replace(/\s+/g, ' '); }
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
async function centre(page: Page, n: number) {
  let last = '';
  await expect.poll(async () => { const now = JSON.stringify(await tile(page, n).boundingBox()); const still = now === last; last = now; return still; }, { intervals: [150] }).toBe(true);
  const box = (await tile(page, n).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function dragRoute(page: Page, hexes: number[]): Promise<void> {
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
async function choose(page: Page, query: string, name: string): Promise<void> {
  await picker(page).getByRole('searchbox', { name: 'Search components' }).fill(query);
  await picker(page).getByRole('button', { name: `Choose ${name}` }).click();
  await expect(picker(page)).toHaveCount(0);
}
async function done(page: Page) { await panel(page).getByRole('button', { name: 'Done', exact: true }).click(); }
async function openGroup(page: Page, group: RegExp) {
  if (!(await drawer(page).count())) await page.getByRole('button', { name: /^Components/ }).click();
  await expect(drawer(page)).toBeVisible();
  const tab = groupTab(page, group);
  if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click();
}
async function closeDrawer(page: Page) {
  if (await drawer(page).count()) {
    const open = page.getByRole('group', { name: 'Drawers' }).getByRole('button', { pressed: true }).first();
    await open.click();
    await expect(drawer(page)).toHaveCount(0);
  }
}
async function step(title: string, body: () => Promise<void>) {
  const t = Date.now();
  console.log('>>', title);
  await test.step(title, body);
  console.log('   ok', ((Date.now() - t) / 1000).toFixed(1) + 's');
}

test.beforeEach(({ page }) => {
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
});
test.afterEach(() => { expect(errors, 'console errors').toEqual([]); });

test('Council Keleres: a long game through the interface', async ({ page }) => {
  await step('create the game', async () => {
    await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
    await page.goto('/');
    await page.getByRole('button', { name: "Thunder's Edge" }).click();
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'My faction', exact: true }).click();
    await page.getByRole('button', { name: /Keleres.*Xxcha/ }).click();
    const rivals = ['The Federation of Sol', 'The Emirates of Hacan', 'The Argent Flight', 'The Embers of Muaat', 'The Yin Brotherhood'];
    for (let i = 0; i < rivals.length; i++) {
      await page.getByRole('group', { name: 'Player ' + (i + 2) }).getByRole('button', { name: 'Opponent', exact: true }).click();
      await page.getByRole('button', { name: rivals[i] }).click();
    }
    await page.getByRole('textbox', { name: 'Game name' }).fill('KeleresGame');
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('Home systems placed: 6.')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await shot(page, '01-map-built');
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 14)).toBeVisible();
    await shot(page, '02-start');
    // Archon Ren 2/3 and Archon Tau 1/1; the Keleres start with 3 tactic, 3 fleet, 2 strategy tokens.
    await expectTotals(page, { Resources: 3, Influence: 4, 'Trade goods': 0, Commodities: 0, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 });
  });

  await step('the components drawer at the start: only the hero of the faction group is the Keleres own', async () => {
    await openGroup(page, /^Faction/);
    await page.waitForTimeout(500);
    await dump('drawer0-faction', drawer(page), 20000);
    // BUG: the shared Keleres components (agent, commander, mech, abilities, both technologies) are listed under the first of the three
    // Keleres factions (Mentak): the Xxcha one sees only its hero in the Faction group and has to find the rest by search, labelled "Mentak".
    await expect(drawer(page).getByRole('group', { name: 'Leaders' }).getByRole('button', { name: /Agent ·|Commander ·/ })).toHaveCount(0);
    await shot(page, '03-drawer-faction');
    const search = drawer(page).getByRole('searchbox', { name: 'Search components' });
    await search.fill('xander');
    await dump('search-xander', drawer(page).getByRole('group', { name: 'Search results' }));
    // BUG: the agent starts "Locked" although agents are open from the start (LRR 51.4; the Sol agent starts Unlocked).
    await expect(drawer(page).getByRole('group', { name: 'Xander Alexin Victori III: state' }).getByRole('button', { name: 'Locked', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await search.fill('artemiris');
    await expect(drawer(page).getByText('Nothing found.')).toBeVisible();
    await search.fill('');
  });

  await step('starting holdings through the search: two starting technologies, the agent opened', async () => {
    const search = drawer(page).getByRole('searchbox', { name: 'Search components' });
    for (const [q, n] of [['sarween', 'Sarween Tools'], ['antimass', 'Antimass Deflectors']] as const) {
      await search.fill(q);
      await drawer(page).getByRole('button', { name: `Add ${n}` }).click();
    }
    await search.fill('xander');
    await drawer(page).getByRole('group', { name: 'Xander Alexin Victori III: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await search.fill('');
    await groupTab(page, /^Technologies/).click();
    await dump('drawer1-tech', drawer(page), 20000);
    await shot(page, '04-start-techs');
    await groupTab(page, /^Technologies/).click();
    await expect(drawer(page)).toHaveCount(0);
  });

  await step('round 1: strategy card Technology (main)', async () => {
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click();
    await tech.click();
    await tech.click();
    await expect(page.getByText('Main: 7 Technology')).toBeVisible();
  });

  await step('round 1 action: Technology primary: ASN first warns, then I.I.H.Q. and ASN; the agent pays the trade goods', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'agency supply', 'Agency Supply Network');
    // Only Sarween Tools is yellow: one yellow is missing.
    await expect(panel(page).getByText('The prerequisites of Agency Supply Network are not met: 1 missing (cybernetic ×1).')).toBeVisible();
    await shot(page, '05-asn-first');
    await panel(page).getByRole('button', { name: 'Remove Agency Supply Network' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'modernization', 'I.I.H.Q. Modernization');
    await expect(panel(page).getByText(/prerequisites of I.I.H.Q./)).toHaveCount(0);
    await panel(page).getByRole('button', { name: /Research a technology|Another technology|Add a technology/ }).first().click();
    await choose(page, 'agency supply', 'Agency Supply Network');
    await expect(panel(page).getByText(/prerequisites of Agency Supply Network/)).toHaveCount(0);
    await shot(page, '06-tech-two');
    // Council Patronage at the start of the round: commodities 2 and 1 trade good; the planets (3 resources) and that trade good pay 4 of the 6.
    const pay = panel(page).getByRole('group', { name: 'Payment' });
    await expect(pay).toContainText('Cost 6, paid 4');
    await pay.getByRole('button', { name: 'Choose manually' }).click();
    for (let i = 0; i < 2; i++) await pay.getByRole('button', { name: 'Add one trade good' }).click();
    await expect(pay).toContainText('Cost 6, paid 6');
    await expect(pay.getByText('Not enough trade goods: need 3, have 1.')).toBeVisible();
    await shot(page, '07-pay-short-tg');
    // The agent turns the two commodities into trade goods.
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'xander', 'Xander Alexin Victori III');
    await expect(pay.locator('li.warning-waived')).toContainText('Allowed by: Xander Alexin Victori III');
    await shot(page, '08-agent-used');
    // BUG: the commodities the agent turns into trade goods are spent (2 -> 0) but not counted as paid: the payment is 3 + 3 = 6, the warning still says paid 4.
    // (src/domain/replay/payment.ts applyPayment: the worth counts only min(trade goods paid, trade goods held).)
    await expect(pay.getByText('Not enough resources: need 6, paid 4, short by 2.')).toBeVisible();
    await done(page);
    await expectTotals(page, { Resources: 0, Influence: 0, 'Trade goods': 0, Commodities: 0, Tactic: 3, Strategy: 2 }, 'Forecast');
  });

  await step('I.I.H.Q. Modernization: the Custodia Vigilia of its text is not gained', async () => {
    await openGroup(page, /^Technologies/);
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('custodia');
    await page.waitForTimeout(400);
    await dump('custodia-search', drawer(page).getByRole('group', { name: 'Search results' }), 4000);
    // BUG: "Gain the Custodia Vigilia planet card and its legendary planet ability card" (the PoK I.I.H.Q.) is not applied; only the TE breakthrough gains it.
    await expect(drawer(page).getByRole('button', { name: "Remove Custodian's Favour" })).toHaveCount(0);
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await closeDrawer(page);
  });

  await step('tactical 1: a carrier with two infantry from home to Quann', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 25);
    await expect(page.getByText('Active system: Quann')).toBeVisible();
    await expect(panel(page).getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await tapTile(page, 14);
    await tapTile(page, 25);
    await expect(page.getByText('Flight Archon Ren / Archon Tau → Quann')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 2 of 4' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t1', panel(page), 9000);
    await shot(page, '11-t1');
    await done(page);
    await expectTotals(page, { Tactic: 2 }, 'Forecast');
    await expect(tile(page, 25).getByRole('img', { name: 'Infantry ×2' })).toBeVisible();
    console.log('TOTALS after t1', JSON.stringify(await totals(page)));
  });

  await step('setup: a Hacan cruiser sits in Arinam (37)', async () => {
    await tapTile(page, 37);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Hacan' }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(tile(page, 37).getByRole('img', { name: /Cruiser/ })).toHaveCount(1);
  });

  await step('tactical 2: a carrier with two fighters and a cruiser into Arinam; a space battle with losses', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 37);
    await expect(page.getByText('Active system: Arinam / Meer')).toBeVisible();
    await tapTile(page, 14);
    await tapTile(page, 37);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    await panel(page).getByRole('button', { name: 'Take one Cruiser' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Fighter' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await dump('battle1', stage(page), 8000);
    await shot(page, '12-battle1');
    await stage(page).getByRole('button', { name: 'Fighter ×2' }).click();
    await stage(page).getByRole('button', { name: 'Cruiser ×1 (The Emirates of Hacan)' }).click();
    await dump('battle1b', stage(page), 8000);
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t2', panel(page), 9000);
    await done(page);
    await expectTotals(page, { Tactic: 1, Fleet: 3 }, 'Forecast');
    await dump('map37', tile(page, 37));
  });

  await step('manual adjustment: two action cards taken (Frontline Deployment, Mining Initiative)', async () => {
    await addAction(page, 'Manual adjustment');
    const taken = panel(page).getByRole('group', { name: 'With this entry' });
    for (const [q, n] of [['frontline deployment', 'Frontline Deployment'], ['mining initiative', 'Mining Initiative']] as const) {
      await taken.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await dump('manual1', panel(page), 6000);
    await done(page);
  });

  await step('component action: Frontline Deployment on Quann, which holds my command token', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'frontline deployment', 'Frontline Deployment');
    await dump('fd0', panel(page), 6000);
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Quann', exact: true }).click();
    await dump('fd1', panel(page), 6000);
    await done(page);
    await expect(tile(page, 25).getByRole('img', { name: 'Infantry ×5' })).toBeVisible();
  });

  await step('pass; the status phase of round 1: tokens, an objective, two cards', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const status = panel(page).getByRole('listitem', { name: 'Tokens and points' });
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    await expect(tokens).toContainText('Distribute tokens: 2 left');
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Strategy' }).click();
    await expect(tokens).toContainText('Distribute tokens: 0 left');
    await dump('status1', panel(page), 9000);
    await shot(page, '13-status1');
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await dump('score-pick', picker(page), 3000);
    await shot(page, '14-score-pick');
    await choose(page, 'expand borders', 'Expand Borders');
    await dump('status1b', panel(page), 9000);
    await dump('status1c', panel(page), 9000);
    await shot(page, '15-status1c');
  });

  await step('status 1 closes: a point for the objective, two action cards drawn', async () => {
    const status = panel(page).getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('group', { name: 'Keleres', exact: true }).getByRole('button', { name: 'Add one Keleres' }).click();
    const taken = status.getByRole('group', { name: 'Taken and discarded' });
    for (const [q, n] of [['sabotage', 'Sabotage'], ['direct hit', 'Direct Hit']] as const) {
      await taken.getByRole('button', { name: '+ Action card' }).click();
      await choose(page, q, n);
    }
    await status.getByRole('checkbox', { name: 'Done' }).check();
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    // Quann is ready again (2/1): 5 resources, 5 influence, tactic 1 left + 1, strategy 2 + 1.
    await expectTotals(page, { Resources: 5, Influence: 5, Tactic: 2, Strategy: 3, Fleet: 3, VP: 1, 'Trade goods': 0, Commodities: 0 }, 'Now');
    await shot(page, '16-round1-done');
  });

  await step('round 2 begins: Council Patronage shows with the first entry of the round', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    console.log('R2 START', await header(page));
    await dump('r2-start-header', page.getByRole('group', { name: 'Totals, now and forecast' }));
  });

  await step('setup: a Sol cruiser stands next to Mecatol Rex in Wellon (19)', async () => {
    await tapTile(page, 19);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  await step('round 2: Trade main; primary ability with a deal', async () => {
    const trade = page.getByRole('button', { name: '5 Trade' });
    await trade.click(); await trade.click(); await trade.click();
    await expect(page.getByText('Main: 5 Trade')).toBeVisible();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await dump('trade0', panel(page), 9000);
    console.log('TRADE header', await header(page));
    await panel(page).getByRole('group', { name: 'Who uses the secondary for free' }).getByRole('button', { name: 'Hacan' }).click();
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await dump('deal0', panel(page), 9000);
    await shot(page, '17-deal0');
  });

  await step('deal with Sol (a cruiser next to Mecatol): 2 trade goods and my Keleres Rider for their Military Support', async () => {
    const give = panel(page).getByRole('group', { name: 'Give', exact: true });
    const get = panel(page).getByRole('group', { name: 'Get', exact: true });
    for (let i = 0; i < 2; i++) await give.getByRole('group', { name: 'Trade goods' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    await give.getByRole('button', { name: '+ Component' }).click();
    await dump('deal-pick', picker(page), 5000);
    await choose(page, 'keleres rider', 'Keleres Rider');
    await get.getByRole('button', { name: '+ Component' }).click();
    await dump('deal-pick-get', picker(page), 5000);
    await choose(page, 'military support', 'Military Support');
    await dump('deal1', panel(page), 9000);
    await shot(page, '18-deal1');
    console.log('DEAL header', await header(page));
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
  });

  await step('deals 2 and 3: Muaat is near Mecatol and I.I.H.Q. makes us neighbours; Yin is not and warns', async () => {
    await tapTile(page, 22);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Muaat' }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await panel(page).getByRole('button', { name: '+ Transaction', exact: true }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Muaat' }).click();
    await panel(page).getByRole('group', { name: 'Give', exact: true }).getByRole('button', { name: '+ Component' }).click();
    await choose(page, 'sabotage', 'Sabotage');
    await dump('deal-muaat', panel(page), 9000);
    await shot(page, '19-deal-muaat');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await panel(page).getByRole('button', { name: '+ Transaction', exact: true }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Yin' }).click();
    await panel(page).getByRole('group', { name: 'Give', exact: true }).getByRole('group', { name: 'Trade goods' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    await dump('deal-yin', panel(page), 9000);
    await shot(page, '20-deal-yin');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await dump('trade-after-deals', panel(page), 9000);
    await done(page);
    console.log('AFTER TRADE+DEALS', await header(page));
  });

  await step('round 2: Technology secondary (a rival chose it): Gravity Drive for 1 strategy token and 4 resources', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Technology · secondary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'gravity drive', 'Gravity Drive');
    const pay = panel(page).getByRole('group', { name: 'Payment' });
    await expect(pay).toContainText('Cost 4');
    await pay.getByRole('button', { name: 'Choose manually' }).click();
    for (const [name, on] of [['Archon Ren 2', true], ['Quann 2', true], ['Archon Tau 1', false]] as const) {
      const b = pay.getByRole('button', { name });
      if (((await b.getAttribute('aria-pressed')) === 'true') !== on) await b.click();
    }
    await dump('gd-pay', panel(page), 9000);
    await shot(page, '21-gd');
    await expect(pay).toContainText('Cost 4, paid 4');
    await done(page);
    await expectTotals(page, { Resources: 1, Influence: 1, Strategy: 2 }, 'Forecast');
    console.log('AFTER GD', await header(page));
  });

  await step('tactical 3: the carrier of Arinam takes a fighter, picks up three infantry in Quann and lands them on Lodor; Gravity Drive allows the second step', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 26);
    await expect(page.getByText('Active system: Lodor')).toBeVisible();
    await dragRoute(page, [37, 25, 26]);
    await expect(page.getByText(/Flight Arinam \/ Meer .* Lodor/)).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    await panel(page).getByRole('button', { name: 'Take one Fighter' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('group', { name: 'Quann' }).getByRole('button', { name: 'Take one Infantry' }).first().click();
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 4 of 4' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t3', panel(page), 12000);
    await shot(page, '22-t3');
    await expect(panel(page).getByText(/Allowed by: Gravity Drive/)).toBeVisible();
    await done(page);
    await expect(tile(page, 26).getByRole('img', { name: 'Infantry ×3' })).toBeVisible();
    await expect(tile(page, 25).getByRole('img', { name: 'Infantry ×2' })).toBeVisible();
    await expectTotals(page, { Tactic: 1 }, 'Forecast');
  });

  await step('tactical 4: production at home: the shop, a mech (Omniopiares) and a flagship are offered', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 14);
    await expect(page.getByText('Active system: Archon Ren / Archon Tau')).toBeVisible();
    await expect(panel(page).getByText('Tactic tokens: 1 → 0')).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await dump('shop0', stage(page), 9000);
    await shot(page, '23-shop0');
    await stage(page).getByRole('button', { name: 'Mech, Archon Ren', exact: true }).click();
    await dump('shop1', stage(page), 9000);
    await shot(page, '24-shop1');
    const shopText = (await stage(page).innerText()).replace(/\s+/g, ' ');
    console.log('SHOP', shopText.slice(0, 600));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t4', panel(page), 12000);
    await shot(page, '25-t4');
    await done(page);
    await expectTotals(page, { Resources: 0, 'Trade goods': 0, Tactic: 0 }, 'Forecast');
    console.log('AFTER T4', await header(page));
    await expect(tile(page, 14).getByRole('img', { name: 'Mech' })).toBeVisible();
  });

  await step('rival Sol lands two infantry on Archon Ren where my mech stands: Omniopiares asks 1 influence', async () => {
    await tapTile(page, 37);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    for (const u of ['Carrier', 'Infantry', 'Infantry']) await stage(page).getByRole('button', { name: u, exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Sol' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 14);
    await tapTile(page, 37);
    await tapTile(page, 14);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('sol-t-fly', panel(page), 9000);
    for (let i = 0; i < 2; i++) await panel(page).getByRole('group', { name: 'Landing on Archon Ren' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('sol-t', panel(page), 12000);
    await shot(page, '26-sol-landing');
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await dump('sol-ground-battle', stage(page), 9000);
    await shot(page, '27-sol-ground-battle');
    await stage(page).getByRole('button', { name: /^Infantry ×2 \(The Federation of Sol\)/ }).click();
    await stage(page).getByRole('button', { name: /^Infantry ×1 \(The Federation of Sol\)/ }).click();
    await dump('sol-ground-battle2', stage(page), 9000);
    await shot(page, '28-sol-ground-battle2');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('sol-t2', panel(page), 12000);
    await done(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine' }).click();
    await dump('map14-after-sol', tile(page, 14));
    console.log('AFTER SOL', await header(page));
  });

  await step('component action: Mining Initiative (an action card) on Archon Ren; the commander Suffi An is unlocked after it', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Archon Ren', exact: true }).click();
    await dump('mining', panel(page), 9000);
    await shot(page, '29-mining');
    // Mining Initiative: gain trade goods equal to the resource value of a planet you control: Archon Ren 2.
    await expectTotals(page, { 'Trade goods': 2 });
    await dump('mining-hints', panel(page), 9000);
    await done(page);
    await openGroup(page, /^Faction/);
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('suffi');
    await drawer(page).getByRole('group', { name: 'Suffi An: state' }).first().getByRole('button', { name: 'Unlocked' }).click();
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await shot(page, '30-commander');
    await closeDrawer(page);
  });

  await step('the commander allows an additional action after a component action: War Effort-type second action is a hint only', async () => {
    await addAction(page, 'Component action');
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('suffi');
    await dump('pick-suffi', picker(page), 4000);
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('xander');
    await dump('pick-xander', picker(page), 4000);
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('omniopiares');
    await dump('pick-mech', picker(page), 4000);
    await picker(page).getByRole('button', { name: 'Close' }).click();
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await step('pass; the status phase of round 2: Diversify Research is scored without a warning', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const status = panel(page).getByRole('listitem', { name: 'Tokens and points' }).last();
    const tokens = status.getByRole('group', { name: 'Token distribution' });
    await tokens.getByRole('button', { name: 'Add one Fleet' }).click();
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'diversify research', 'Diversify Research');
    await expect(status.getByText(/Diversify Research is scored without/)).toHaveCount(0);
    await status.getByRole('group', { name: 'Keleres', exact: true }).getByRole('button', { name: 'Add one Keleres' }).click();
    const taken = status.getByRole('group', { name: 'Taken and discarded' });
    for (const [q, n] of [['war effort', 'War Effort'], ['skilled retreat', 'Skilled Retreat']] as const) {
      await taken.getByRole('button', { name: '+ Action card' }).click();
      await choose(page, q, n);
    }
    await dump('status2', status, 12000);
    await shot(page, '31-status2');
    await status.getByRole('checkbox', { name: 'Done' }).check();
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    // Planets ready: Ren 2/3, Tau 1/1, Quann 2/1, Lodor 3/1: 8 resources, 6 influence; Mech on Ren.
    await expectTotals(page, { Resources: 8, Influence: 6, VP: 2, Tactic: 1, Fleet: 4, Strategy: 2 }, 'Now');
  });

  await step('round 3: Leadership main; primary ability: 3 free tactic tokens and one bought; Council Patronage replenishes', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    const lead = page.getByRole('button', { name: '1 Leadership' });
    await lead.click(); await lead.click(); await lead.click();
    await expect(page.getByText('Main: 1 Leadership')).toBeVisible();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Leadership · primary ability' })).toBeVisible();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    for (let i = 0; i < 3; i++) await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await dump('lead', panel(page), 9000);
    await shot(page, '32-leadership');
    await expect(panel(page).getByText(/1 bought beyond the free ones, influence to pay: 3\./)).toBeVisible();
    await done(page);
    // Council Patronage: commodities replenished to 2, +1 trade good (2 left from Mining Initiative). Tactic 1 + 4, influence 6 - 3.
    await expectTotals(page, { Tactic: 5, 'Trade goods': 3, Commodities: 2, Influence: 3 }, 'Forecast');
    console.log('R3 after leadership', await header(page));
  });

  await step('Technology secondary: Carrier II (a unit upgrade) needs two blue technologies', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'carrier ii', 'Carrier II');
    await expect(panel(page).getByText(/prerequisites of Carrier II/)).toHaveCount(0);
    await dump('carrier2', panel(page), 12000);
    await shot(page, '33-carrier2');
    console.log('CARRIER2 header', await header(page));
    await done(page);
    await openGroup(page, /^Technologies/);
    await dump('units3', drawer(page), 20000);
    await shot(page, '34-units3');
    await closeDrawer(page);
  });

  await step('tactical 5: the carrier of Quann attacks the Sol cruiser in Wellon and lands two infantry', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 19);
    await expect(page.getByText('Active system: Wellon')).toBeVisible();
    await tapTile(page, 25);
    await tapTile(page, 19);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await stage(page).getByRole('button', { name: 'Cruiser ×1 (The Federation of Sol)' }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t5', panel(page), 12000);
    await shot(page, '35-t5');
    await done(page);
    await expect(tile(page, 19).getByRole('img', { name: 'Infantry ×2' })).toBeVisible();
    console.log('AFTER T5', await header(page));
  });

  await step('tactical 6: the carrier and two infantry go from Wellon to Mecatol Rex; the custodians token', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 18);
    await expect(page.getByText('Active system: Mecatol Rex')).toBeVisible();
    await tapTile(page, 19);
    await tapTile(page, 18);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t6', panel(page), 12000);
    await shot(page, '36-t6');
    await expect(panel(page).getByText(/The custodians token is still on Mecatol Rex/)).toBeVisible();
    await done(page);
    console.log('AFTER T6', await header(page));
  });

  await step('the deal had its effect: the drawer shows Sol\'s Military Support in my hand and my Keleres Rider with Sol', async () => {
    await openGroup(page, /^Cards/);
    await page.waitForTimeout(400);
    await dump('cards3', drawer(page), 20000);
    await shot(page, '37-cards3');
    await expect(drawer(page).getByRole('group', { name: 'Notes of other players' })).toContainText('Military Support');
    await expect(drawer(page).getByRole('group', { name: 'My promissory notes' })).toContainText('Keleres Rider');
    await closeDrawer(page);
  });

  await step('component action: Sol\'s Military Support puts two infantry on Wellon and goes back to Sol', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'military support', 'Military Support');
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Wellon', exact: true }).click();
    await dump('ms', panel(page), 9000);
    await shot(page, '38-ms');
    await done(page);
    await expect(tile(page, 19).getByRole('img', { name: /Infantry ×2/ }).first()).toBeVisible();
    await openGroup(page, /^Cards/);
    await dump('cards3b', drawer(page), 20000);
    await closeDrawer(page);
  });

  await step('pass; the status phase of round 3: Erect a Monument (spend 8 resources) is the third objective', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const status = panel(page).getByRole('listitem', { name: 'Tokens and points' }).last();
    const tokens = status.getByRole('group', { name: 'Token distribution' });
    await tokens.getByRole('button', { name: 'Add one Strategy' }).click();
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'erect a monument', 'Erect a Monument');
    await dump('status3', status, 12000);
    await status.getByRole('group', { name: 'Keleres', exact: true }).getByRole('button', { name: 'Add one Keleres' }).first().click();
    await shot(page, '39-status3');
    await status.getByRole('checkbox', { name: 'Done' }).check();
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    console.log('R3 END', await header(page));
  });

  await step('round 3 agenda phase: a law, Fleet Regulations', async () => {
    await dump('r3-end-panel', panel(page), 12000);
    await openGroup(page, /^Faction/);
    await drawer(page).getByRole('group', { name: 'Odlynn Myrr: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await closeDrawer(page);
    await panel(page).getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'fleet regulations', 'Fleet Regulations');
    await panel(page).getByRole('group', { name: 'Outcome' }).getByRole('button', { name: 'For', exact: true }).click();
    // Odlynn Myrr: 1 trade good and 1 command token for each of the two players that voted another way.
    const resolved = panel(page).getByRole('group', { name: 'What was resolved' });
    for (let i = 0; i < 2; i++) {
      await resolved.getByRole('group', { name: 'Trade goods' }).getByRole('button', { name: 'Add one Trade goods' }).click();
      await resolved.getByRole('group', { name: 'Tactic' }).getByRole('button', { name: 'Add one Tactic' }).click();
    }
    await dump('agenda1', panel(page), 9000);
    await shot(page, '40-agenda-law');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await dump('agenda-used-pick', picker(page), 5000);
    await choose(page, 'odlynn', 'Odlynn Myrr');
    await dump('agenda2', panel(page), 9000);
    await shot(page, '41-agenda-hero');
    await done(page);
    await expectTotals(page, { 'Trade goods': 5, Tactic: 6, Fleet: 4, VP: 4 }, 'Forecast');
    console.log('AFTER AGENDA', await header(page));
    await openGroup(page, /^Faction/);
    await dump('hero-after', drawer(page), 9000);
    await closeDrawer(page);
    await openGroup(page, /^Objectives/);
    await dump('laws-after', drawer(page), 9000);
    await closeDrawer(page);
  });

  await step('second agenda of round 3: Conventions of War is voted down; two relics are taken', async () => {
    await panel(page).getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'conventions of war', 'Conventions of War');
    await panel(page).getByRole('group', { name: 'Outcome' }).getByRole('button', { name: 'Against', exact: true }).click();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    for (const [q, n] of [['dynamis', 'Dynamis Core'], ['nano-forge', 'Nano-Forge']] as const) {
      await taken.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await dump('agenda-b', panel(page), 9000);
    await shot(page, '42-agenda-b');
    await done(page);
    await openGroup(page, /^Objectives/);
    await dump('laws-after-b', drawer(page), 9000);
    // BUG-CHECK: a law voted Against does not stay in play.
    await expect(drawer(page).getByRole('group', { name: 'Laws' })).not.toContainText('Conventions of War');
    await closeDrawer(page);
    await openGroup(page, /^Relics/);
    await dump('relics-b', drawer(page), 9000);
    await closeDrawer(page);
    console.log('AFTER AGENDA B', await header(page));
  });

  await step('round 4: Council Patronage with Dynamis Core: commodities up to 4, one trade good', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    console.log('R4 START', await header(page));
    await dump('r4-start-header', page.getByRole('group', { name: 'Totals, now and forecast' }));
  });

  await step('round 4: Technology main: Neural Motivator (green) is free, Plasma Scoring (red) costs 6', async () => {
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await addAction(page, 'Strategy');
    await dump('r4-tech0', panel(page), 9000);
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'neural motivator', 'Neural Motivator');
    await dump('r4-tech1', panel(page), 9000);
    console.log('R4 TECH1', await header(page));
    await panel(page).getByRole('button', { name: /Research a technology|Another technology|Add a technology/ }).first().click();
    await choose(page, 'plasma scoring', 'Plasma Scoring');
    await dump('r4-tech2', panel(page), 12000);
    await shot(page, '43-r4-tech');
    console.log('R4 TECH2', await header(page));
    await expect(panel(page).getByText('The first is free, the second costs 6 resources. To pay: 6.')).toBeVisible();
    await done(page);
    await expectTotals(page, { Resources: 4, Influence: 9, 'Trade goods': 6, Commodities: 4, Strategy: 2 }, 'Forecast');
  });

  await step('round 4 component action: Dynamis Core gains trade goods equal to my commodity value (2 + 2)', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'dynamis', 'Dynamis Core');
    await dump('dynamis', panel(page), 9000);
    await shot(page, '44-dynamis');
    await expectTotals(page, { 'Trade goods': 10 }, 'Forecast');
    console.log('DYNAMIS', await header(page));
    await done(page);
    await openGroup(page, /^Relics/);
    await dump('relics-c', drawer(page), 5000);
    await closeDrawer(page);
  });

  await step('round 4 component action: Nano-Forge on Quann (2/1 becomes 4/3, legendary); a deal with Sol: my Rider back, 2 commodities for Hacan', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'nano-forge', 'Nano-Forge');
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Quann', exact: true }).click();
    await dump('nano', panel(page), 9000);
    await shot(page, '45-nano');
    // BUG: Nano-Forge raises Quann by +2 resources and +2 influence (attached, 4/3 when ready), but the summary totals still show the printed values
    // (expected Resources 6, Influence 11): src/ui/plan/SummaryBar.tsx:15-16 reads readyResources(state, pack) without a PayView, so planetValue
    // (src/domain/payment.ts:48) returns the printed number and no planet modifier applies to the totals (the payment block does count them).
    await expectTotals(page, { Resources: 4, Influence: 9 }, 'Forecast');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sol' }).click();
    await panel(page).getByRole('group', { name: 'Get', exact: true }).getByRole('button', { name: '+ Component' }).click();
    await dump('deal-back-pick', picker(page), 6000);
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('keleres rider');
    await dump('deal-back-pick2', picker(page), 6000);
    await picker(page).getByRole('button', { name: 'Choose Keleres Rider' }).first().click();
    await dump('deal-back', panel(page), 9000);
    await shot(page, '46-deal-back');
    console.log('DEAL BACK', await header(page));
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await panel(page).getByRole('button', { name: '+ Transaction', exact: true }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Hacan' }).click();
    const give = panel(page).getByRole('group', { name: 'Give', exact: true });
    for (let i = 0; i < 2; i++) await give.getByRole('group', { name: 'Commodities' }).getByRole('button', { name: 'Add one Commodities' }).click();
    await panel(page).getByRole('group', { name: 'Get', exact: true }).getByRole('button', { name: '+ Component' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('trade convoys');
    await dump('deal-hacan-pick', picker(page), 6000);
    await picker(page).getByRole('button', { name: 'Choose Trade Convoys' }).click();
    await dump('deal-hacan', panel(page), 9000);
    console.log('DEAL HACAN', await header(page));
    await shot(page, '47-deal-hacan');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page);
    // Dynamis Core is purged: the value falls back to 2 and the commodities beyond it go back (its note 1); the 2 given to Hacan leave 0.
    await expectTotals(page, { Commodities: 0, 'Trade goods': 10 }, 'Forecast');
    console.log('AFTER DEALS R4', await header(page));
    await openGroup(page, /^Cards/);
    await dump('cards4', drawer(page), 9000);
    await closeDrawer(page);
  });

  await step('round 4 tactical 7: the flagship Artemiris (8) is built at home and paid with a planet and trade goods', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 14);
    await expect(panel(page).getByText('Tactic tokens: 6 → 5')).toBeVisible();
    // The Sol carrier that landed two infantry still stands in my home system: a battle needs ships of mine there, so it is a true blockade (LRR 17.2).
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    await dump('flagship-shop', stage(page), 9000);
    await expect(stage(page).getByText(/blockaded/)).toHaveCount(1);
    await shot(page, '48-flagship-shop');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t7', panel(page), 12000);
    await shot(page, '49-t7');
    console.log('T7', await header(page));
    await expect(panel(page).getByText(/blockaded/)).toHaveCount(1);
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('law');
    await dump('laws-order-pick', picker(page), 6000);
    await choose(page, "law's order", "Law's Order");
    await dump('t7b', panel(page), 12000);
    await shot(page, '50-laws-order');
    // 1 trade good paid for Law's Order: 10 - 2 (payment) - 1.
    await expectTotals(page, { 'Trade goods': 7 }, 'Forecast');
    await done(page);
  });

  await step('round 4 component action: War Effort (an action card, kept from round 2) and Direct Hit and Skilled Retreat in "Used"', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'war effort', 'War Effort');
    await dump('war-effort0', panel(page), 9000);
    await shot(page, '51-war-effort');
    const used = panel(page).getByRole('group', { name: 'Used' });
    for (const [q, n] of [['direct hit', 'Direct Hit'], ['skilled retreat', 'Skilled Retreat']] as const) {
      await used.getByRole('button', { name: '+ Used' }).click();
      await choose(page, q, n);
    }
    await dump('war-effort1', panel(page), 9000);
    await shot(page, '52-used-cards');
    console.log('WAR EFFORT', await header(page));
    await done(page);
    await openGroup(page, /^Cards/);
    await dump('cards4b', drawer(page), 12000);
    await closeDrawer(page);
  });

  await step('round 4: the agent twice in one round: the second use warns', async () => {
    await addAction(page, 'Manual adjustment');
    let used = panel(page).getByRole('group', { name: 'With this entry' }).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'xander', 'Xander Alexin Victori III');
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toHaveCount(0);
    await done(page);
    await addAction(page, 'Manual adjustment');
    used = panel(page).getByRole('group', { name: 'With this entry' }).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'xander', 'Xander Alexin Victori III');
    await dump('agent-twice', panel(page), 9000);
    await shot(page, '53-agent-twice');
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toContainText(/exhausted/i);
    await done(page);
  });

  await step('pass; status phase of round 4: a fifth fleet token breaks Fleet Regulations; Negotiate Trade Routes', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const status = panel(page).getByRole('listitem', { name: 'Tokens and points' }).last();
    const tokens = status.getByRole('group', { name: 'Token distribution' });
    await tokens.getByRole('button', { name: 'Add one Fleet' }).click();
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await dump('status4a', status, 12000);
    await shot(page, '54-status4');
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'negotiate trade routes', 'Negotiate Trade Routes');
    await dump('status4b', status, 12000);
    await status.getByRole('group', { name: 'Keleres', exact: true }).getByRole('button', { name: 'Add one Keleres' }).first().click();
    await status.getByRole('checkbox', { name: 'Done' }).check();
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    console.log('R4 END', await header(page));
  });

  await step('round 5: Imperial main; Mecatol Rex is mine: one point; a deal each way with Sol; Council Patronage without Dynamis Core', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    const imp = page.getByRole('button', { name: '8 Imperial' });
    await imp.click(); await imp.click(); await imp.click();
    await expect(page.getByText('Main: 8 Imperial')).toBeVisible();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Imperial · primary ability' })).toBeVisible();
    await dump('imp0', panel(page), 9000);
    await shot(page, '55-imperial');
    console.log('IMPERIAL', await header(page));
    // 0 commodities replenished to 2 (the Dynamis Core is gone), 1 trade good from Council Patronage; Imperial: 1 point for Mecatol Rex.
    await expectTotals(page, { Commodities: 2, VP: 6 }, 'Forecast');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sol' }).click();
    const give = panel(page).getByRole('group', { name: 'Give', exact: true });
    await give.getByRole('group', { name: 'Commodities' }).getByRole('button', { name: 'Add one Commodities' }).click();
    await give.getByRole('button', { name: '+ Component' }).click();
    await choose(page, 'support for the throne', 'Support for the Throne');
    const get = panel(page).getByRole('group', { name: 'Get', exact: true });
    await get.getByRole('group', { name: 'Trade goods' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    await dump('deal5', panel(page), 9000);
    await shot(page, '56-deal5');
    console.log('DEAL5', await header(page));
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page);
  });

  await step('round 5: the notes of other players: Trade Convoys played from the "Used" block; the hero a second time warns', async () => {
    await addAction(page, 'Manual adjustment');
    const used = panel(page).getByRole('group', { name: 'With this entry' }).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'trade convoys', 'Trade Convoys');
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'odlynn', 'Odlynn Myrr');
    await dump('used5', panel(page), 9000);
    await shot(page, '57-used5');
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toContainText('Odlynn Myrr: you do not hold this component at this point.');
    await done(page);
  });

  await step('round 5: eight action cards taken: the hand limit', async () => {
    await addAction(page, 'Manual adjustment');
    const taken = panel(page).getByRole('group', { name: 'With this entry' }).getByRole('group', { name: 'Taken and discarded' });
    for (const [q, n] of [['plague', 'Plague'], ['uprising', 'Uprising'], ['sabotage', 'Sabotage'], ['reparations', 'Reparations'], ['ghost ship', 'Ghost Ship'], ['insider information', 'Insider Information'], ['rise of a messiah', 'Rise of a Messiah'], ['unexpected action', 'Unexpected Action']] as const) {
      await taken.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await dump('hand', panel(page), 12000);
    await shot(page, '58-hand');
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toContainText('The hand holds 8 action cards and the limit is 7');
    await done(page);
  });

  await step('round 5 closes: pass and the status phase', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const status = panel(page).getByRole('listitem', { name: 'Tokens and points' }).last();
    await status.getByRole('checkbox', { name: 'Done' }).check();
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await shot(page, '59-round5-end');
    console.log('R5 END', await header(page));
  });
});
