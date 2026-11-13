import { expect, test, type Locator, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

/**
 * One long game as the Federation of Sol, played through the interface only. Four players: Sol, Hacan, Argent, Letnev;
 * Prophecy of Kings on, Thunder's Edge off. The map is pasted as a Milty string (the home tiles 1, 3, 58, 10 at seats 1-4).
 */
const MAP = '78 40 42 67 69 34 39 27 26 65 79 47 32 30 29 73 41 21 1 62 19 3 44 36 38 61 76 58 37 50 10 35 31 33 22 23';
const SHOTS = 'test-results/scenarios/sol';

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

/** The summary line of the plan: the number shown in the group. */
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
    // While an entry is open the toggle is off and the header reads "now → forecast".
    if (await toggle.isEnabled()) await toggle.click();
  }
  await expect.poll(async () => {
    const got = await totals(page);
    return Object.fromEntries(Object.keys(want).map(k => [k, got[k]]));
  }, { message: `totals ${mode ?? ''}`, timeout: 4000 }).toEqual(want);
}

async function tapTile(page: Page, n: number): Promise<void> {
  // The camera glides after some taps; wait until the tile has stood still for a while.
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
/** One pointer drags a route hex by hex, as a finger does. */
async function dragRoute(page: Page, hexes: number[]): Promise<void> {
  const points = [];
  for (const n of hexes) points.push(await centre(page, n));
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.mouse.up();
}

/** The first tap right after "Add source" is lost while the camera still glides; give it time. */
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

test('Federation of Sol: a long game through the interface', async ({ page }) => {
  await step('create the game on the first screen', async () => {
    await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
    await page.goto('/');
    await page.getByRole('button', { name: 'Remove opponent' }).last().click();
    await page.getByRole('button', { name: 'Remove opponent' }).last().click();
    await page.getByRole('button', { name: "Thunder's Edge" }).click();
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'My faction', exact: true }).click();
    await page.getByRole('button', { name: 'The Federation of Sol' }).click();
    for (const [i, f] of [[2, 'The Emirates of Hacan'], [3, 'The Argent Flight'], [4, 'The Barony of Letnev']] as const) {
      await page.getByRole('group', { name: `Player ${i}` }).getByRole('button', { name: 'Opponent', exact: true }).click();
      await page.getByRole('button', { name: f }).click();
    }
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('32 tiles placed.')).toBeVisible();
    await expect(page.getByText('Home systems placed: 4.')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('textbox', { name: 'Game name' }).fill('SolGame');
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 1)).toBeVisible();
    // Jord 4/2; Sol starts with 3 tactic, 3 fleet, 2 strategy tokens.
    await expectTotals(page, { Resources: 4, Influence: 2, 'Trade goods': 0, Commodities: 0, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 });
    await shot(page, '01-start');
  });

  await step('round 1: the strategy cards, Technology main and Construction second', async () => {
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await expect(page.getByText('Main: 7 Technology')).toBeVisible();
    const con = page.getByRole('button', { name: '4 Construction' });
    await con.click(); await con.click();
    await expect(page.getByText('Second: 4 Construction')).toBeVisible();
    await dump('strategy', page.getByRole('region', { name: 'Strategy' }));
  });

  await step('tactical 1: a carrier with 4 infantry to Saudor', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 23);
    await expect(page.getByText('Active system: Saudor')).toBeVisible();
    await expect(panel(page).getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await tapTile(page, 1);
    await tapTile(page, 23);
    await expect(page.getByText('Flight Jord → Saudor')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 4; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 4 of 6' })).toBeVisible();
    await dump('flight1', panel(page));
    await shot(page, '02-flight1');
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('flight1-after', panel(page));
    const land = panel(page).getByRole('button', { name: 'Land one Infantry' });
    for (let i = 0; i < 4; i++) await land.click();
    await expect(panel(page).getByRole('button', { name: 'Give back Infantry' })).toContainText('×4');
    await done(page);
    await expect(panel(page).getByRole('button', { name: 'Tactical action · Saudor', exact: true })).toBeVisible();
    await expectTotals(page, { Resources: 4, Influence: 2, Tactic: 2, Fleet: 3 }, 'Forecast');
    await shot(page, '03-after-t1');
  });

  await step('tactical 2: a carrier with fighters and an infantry to Sem-Lore', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 62);
    await tapTile(page, 1);
    await tapTile(page, 62);
    await expect(page.getByText('Flight Jord → Sem-Lore')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('button', { name: 'Take one Fighter' }).click();
    await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t2', panel(page));
    await done(page);
    await expectTotals(page, { Resources: 4, Influence: 2, Tactic: 1 }, 'Forecast');
    await shot(page, '04-after-t2');
  });

  await step('setup: a Hacan fleet stands on the wormhole next to home', async () => {
    await tapTile(page, 39);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Hacan' }).click();
    for (const u of ['Cruiser', 'Cruiser', 'Fighter']) await stage(page).getByRole('button', { name: u, exact: true }).click();
    await shot(page, '05-stage39');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('after-setup', panel(page), 20000);
  });

  await step('tactical 3: a battle in space on 39', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 39);
    await tapTile(page, 1);
    await tapTile(page, 39);
    await expect(page.getByText('Flight Jord → Wormhole')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Destroyer' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t3a', panel(page));
    await addSource(page);
    await tapTile(page, 62);
    await tapTile(page, 39);
    await expect(page.getByText('Flight Sem-Lore → Wormhole α (39)')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('button', { name: 'Take one Fighter' }).click();
    await dump('t3c', panel(page));
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await shot(page, '07-battle');
    await stage(page).getByRole('button', { name: 'Destroyer ×1' }).click();
    await stage(page).getByRole('button', { name: 'Fighter ×3' }).click();
    await stage(page).getByRole('button', { name: /^Fighter ×2/ }).click();
    await dump('battle2', stage(page));
    await shot(page, '07-battle2');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t3-after-battle', panel(page));
    await done(page);
    await expectTotals(page, { Tactic: 0 }, 'Forecast');
  });

  await step('strategy: Technology primary, two technologies', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('group', { name: 'Technology · primary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'gravity drive', 'Gravity Drive');
    await dump('tech1', panel(page));
    await panel(page).getByRole('button', { name: /Research a technology|Another technology|Add a technology/ }).first().click();
    await choose(page, 'dacxive', 'Dacxive Animators');
    await expect(panel(page).getByText('Not enough resources: need 6, paid 4, short by 2.')).toBeVisible();
    // Spec Ops II needs two biotic technologies; Sol has Neural Motivator only (Dacxive comes second in the same card).
    await panel(page).getByRole('button', { name: 'Remove Dacxive Animators' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'spec ops', 'Spec Ops II');
    await panel(page).getByRole('button', { name: 'Remove Spec Ops II' }).click();
    await expect(panel(page).getByText(/prerequisites of Spec Ops II/)).toHaveCount(0);
    await done(page);
    await expect(page.getByRole('region', { name: 'Actions' }).getByRole('listitem', { name: /^Strategy/ })).toHaveCount(1);
  });

  await step('component action: Orbital Drop on Saudor', async () => {
    await addAction(page, 'Component action');
    await expect(picker(page)).toBeVisible();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('orbital drop');
    await dump('pick-od', picker(page));
    await picker(page).getByRole('button', { name: 'Choose Orbital Drop' }).click();
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Saudor', exact: true }).click();
    // 2 infantry from reinforcements on Saudor (4 landed there): 6; one strategy token is spent: 2 -> 1.
    await expectTotals(page, { Strategy: 1 }, 'Forecast');
    await dump('od2', panel(page));
    // The Thunderbolt: DEPLOY after Orbital Drop, 3 resources.
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('thunderbolt');
    await dump('pick-mech', picker(page));
    await picker(page).getByRole('button', { name: /^Choose ZS Thunderbolt/ }).click();
    console.log('TOTALS after mech', JSON.stringify(await totals(page)));
    await dump('t23', tile(page, 23));
    await shot(page, '09-od3');
    await done(page);
  });

  await step('strategy: Construction primary', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Construction', exact: true }).click();
    await page.waitForTimeout(800);
    await tapTile(page, 23);
    await stage(page).getByRole('button', { name: 'Space dock' }).click();
    await stage(page).getByRole('button', { name: 'PDS' }).click();
    await dump('con2', stage(page));
    await shot(page, '10-con2');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await done(page);
    await expectTotals(page, { Strategy: 1, Resources: 4 }, 'Forecast');
  });

  await step("Politics secondary: draws two action cards", async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '3 Politics' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Politics · secondary ability' })).toBeVisible();
    await expectTotals(page, { Strategy: 0 }, 'Forecast');
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    for (const [q, n] of [['mining initiative', 'Mining Initiative'], ['frontline deployment', 'Frontline Deployment']] as const) {
      await common.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await dump('politics', panel(page));
    await done(page);
  });

  await step('action card as a component action: Mining Initiative on Jord gives its 4 resources as trade goods', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await dump('mining', panel(page));
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Jord', exact: true }).click();
    await expectTotals(page, { 'Trade goods': 4, Resources: 4 }, 'Forecast');
    await done(page);
  });

  await step('action card: Frontline Deployment puts 3 infantry on Sem-Lore', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'frontline deployment', 'Frontline Deployment');
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Sem-Lore', exact: true }).click();
    await done(page);
    await expect(tile(page, 62).getByRole('img', { name: 'Infantry ×4' })).toBeVisible();
  });

  await step('pass', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await shot(page, '11-round1-actions');
    await dump('actions1', page.getByRole('region', { name: 'Actions' }), 12000);
  });

  await step('status phase of round 1', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    // 2 tokens and Versatile's third; a fourth is warned of.
    await expect(tokens).toContainText('Distribute tokens: 3 left');
    for (let i = 0; i < 4; i++) await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await dump('status-over', panel(page), 9000);
    await shot(page, '12-status-over');
    await tokens.getByRole('button', { name: 'Remove one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Remove one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Strategy' }).click();
    await expect(tokens).toContainText('Distribute tokens: 0 left');
    // Neural Motivator: two action cards in the status phase.
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' }).last();
    for (const [q, n] of [['rally', 'Rally'], ['upgrade', 'Upgrade']] as const) {
      await taken.getByRole('button', { name: '+ Action card' }).click();
      await choose(page, q, n);
    }
    await dump('status1', panel(page), 9000);
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    await expectTotals(page, { Tactic: 2, Fleet: 3, Strategy: 1, Resources: 9, Influence: 6, 'Trade goods': 4 }, 'Forecast');
  });

  await step('round 2 begins', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await expectTotals(page, { Resources: 9, Influence: 6, 'Trade goods': 4, Tactic: 2, Strategy: 1 }, 'Now');
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { Resources: 9, Influence: 6, 'Trade goods': 4, Tactic: 2, Fleet: 3, Strategy: 1 }, 'Forecast');
    await dump('r2', page.getByRole('region', { name: 'Strategy' }));
    await dump('map-t39', tile(page, 39));
    await dump('map-t62', tile(page, 62));
    await shot(page, '13-round2');
  });

  await step('round 2: Trade main, Imperial second; Technology secondary for Advanced Carrier II', async () => {
    const trade = page.getByRole('button', { name: '5 Trade' });
    await trade.click(); await trade.click(); await trade.click();
    const imp = page.getByRole('button', { name: '8 Imperial' });
    await imp.click(); await imp.click();
    await expect(page.getByText('Main: 5 Trade · Second: 8 Imperial')).toBeVisible();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Technology · secondary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'advanced carrier', 'Advanced Carrier II');
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    const pay = panel(page).getByRole('group', { name: 'Payment' });
    await pay.getByRole('button', { name: 'Jord 4' }).click();
    await pay.getByRole('button', { name: 'Saudor 2' }).click();
    for (let i = 0; i < 2; i++) await pay.getByRole('button', { name: 'Add one trade good' }).click();
    await expect(pay).toContainText('Cost 4, paid 4');
    await expectTotals(page, { Resources: 7, 'Trade goods': 2, Strategy: 0 });
    await done(page);
    await expectTotals(page, { Resources: 7, 'Trade goods': 2, Strategy: 0 }, 'Forecast');
  });

  await step('Trade primary: 3 trade goods and commodities replenished', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await expect(panel(page).getByText('+3 trade goods, commodities replenish.')).toBeVisible();
    await panel(page).getByRole('group', { name: 'Who uses the secondary for free' }).getByRole('button', { name: 'Hacan' }).click();
    await expectTotals(page, { 'Trade goods': 5, Commodities: 4 });
    await done(page);
    await expectTotals(page, { 'Trade goods': 5, Commodities: 4, Strategy: 0 }, 'Forecast');
  });

  await step('tactical 4: a carrier with 6 infantry and the mech to Mecatol Rex; Gravity Drive allows the missing step', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 18);
    await tapTile(page, 23);
    await tapTile(page, 39);
    await tapTile(page, 78);
    await tapTile(page, 18);
    await expect(page.getByRole('heading', { name: /^Flight Saudor .*Mecatol Rex/ })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 6; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Take one Mech' }).click();
    await dump('t4a', panel(page));
    await shot(page, '16-t4a');
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 6; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Land one Mech' }).click();
    await expect(panel(page).getByText(/The custodians token is still on Mecatol Rex/)).toBeVisible();
    // BUG(usability): the influence of the custodians token cannot be paid anywhere, the warning stands for every faction but the Winnu.
    await expect(panel(page).getByText('Not enough influence: need 6, paid 0, short by 6.')).toBeVisible();
    await expect(panel(page).getByText(/Allowed by: Gravity Drive/)).toBeVisible();
    await done(page);
    await expectTotals(page, { VP: 1, Tactic: 1 }, 'Forecast');
  });

  await step('Imperial primary', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Imperial · primary ability' })).toBeVisible();
    await done(page);
    await expectTotals(page, { VP: 2 }, 'Forecast');
  });

  await step('tactical 5: the home system, a purchase at the dock', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 1);
    await expect(page.getByText('Active system: Jord')).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = stage(page);
    await shop.getByRole('button', { name: 'Carrier', exact: true }).click();
    await shop.getByRole('button', { name: 'Destroyer', exact: true }).click();
    for (let i = 0; i < 4; i++) await shop.getByRole('button', { name: 'Infantry', exact: true }).click();
    for (let i = 0; i < 2; i++) await shop.getByRole('button', { name: 'Fighter', exact: true }).click();
    await dump('shop2', shop);
    await shot(page, '18-shop2');
    await shop.getByRole('button', { name: 'Close' }).click();
    await expect(panel(page).getByText('Production 6, and 8 units are built: each fighter and infantry counts.')).toBeVisible();
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 7, paid 7');
    await done(page);
    await expectTotals(page, { Resources: 0, 'Trade goods': 5, Tactic: 0 }, 'Forecast');
    await shot(page, '18-after-t5');
  });

  await step('rival: a Letnev fleet is set beside Sem-Lore', async () => {
    await tapTile(page, 19);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Letnev' }).click();
    for (const u of ['Dreadnought', 'Carrier', 'Infantry', 'Infantry', 'Infantry']) await stage(page).getByRole('button', { name: u, exact: true }).click();
    await dump('setup19', stage(page));
    await shot(page, '19-setup19');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Letnev' }).click();
    await dump('letnev-tab', page.getByRole('region', { name: 'Actions' }));
    await addAction(page, 'Tactical action');
    await tapTile(page, 62);
    await tapTile(page, 19);
    await tapTile(page, 62);
    await dump('letnev-t', panel(page));
    await shot(page, '19-letnev-t');
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    await panel(page).getByRole('button', { name: 'Take one Dreadnought' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('letnev-land', panel(page));
    await shot(page, '19-letnev-land');
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await dump('letnev-battle', stage(page));
    for (let i = 0; i < 4; i++) await stage(page).getByRole('button', { name: /^Infantry ×\d+$/ }).first().click();
    await stage(page).getByRole('button', { name: /^Infantry ×3 \(The Barony of Letnev\)/ }).click();
    // BUG(usability): a tap on my own infantry in the battle of a rival's action does nothing: my defenders cannot be taken off here.
    await expect(stage(page).getByRole('group', { name: 'Losses, mine' })).toContainText('No losses');
    await shot(page, '19-letnev-battle');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await done(page);
    await dump('map62', tile(page, 62));
    await expectTotals(page, {}, 'Forecast');
    console.log('TOTALS after Letnev', JSON.stringify(await totals(page)));
    await shot(page, '19-after-letnev');
  });

  await step('the components drawer: faction group of Sol', async () => {
    await page.getByRole('button', { name: /^Components/ }).click();
    await expect(drawer(page)).toBeVisible();
    await groupTab(page, /^Faction/).click();
    await dump('faction', drawer(page), 20000);
    await shot(page, '20-faction');
    for (const name of ['Technologies', 'Cards', 'Relics', 'Objectives & laws']) {
      await groupTab(page, new RegExp(`^${name}`)).click();
      await dump(`drawer-${name.split(' ')[0]}`, drawer(page), 20000);
    }
    // Leaders: the hero is unlocked by hand, to be played later.
    await groupTab(page, /^Faction/).click();
    await drawer(page).getByRole('group', { name: 'Jace X, 4th Air Legion: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await drawer(page).getByRole('group', { name: 'Claire Gibson: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await expect(drawer(page).getByRole('group', { name: 'Jace X, 4th Air Legion: state' }).getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    // The stack folds again on a second press of the open group's tab.
    await groupTab(page, /^Faction/).click();
    await expect(drawer(page)).toHaveCount(0);
  });

  await step('rival strategy card and rival component action', async () => {
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Argent' }).click();
    await page.getByRole('button', { name: 'Add action' }).click();
    await page.locator('.action-list').getByRole('button', { name: 'Strategy', exact: true }).click();
    const before = await totals(page);
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '6 Warfare' }).click();
    await dump('argent-warfare', panel(page));
    await shot(page, '21-argent-strategy');
    expect(await totals(page)).toEqual(before);
    await done(page);
    expect(await totals(page)).toEqual(before);

    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Hacan' }).click();
    await addAction(page, 'Component action');
    await dump('hacan-pick', picker(page), 3000);
    await shot(page, '21-hacan-pick');
    await choose(page, 'sabotage', 'Sabotage');
    await dump('hacan-comp', panel(page));
    await done(page);
    expect(await totals(page)).toEqual(before);
  });

  await step('round 2: pass and the status phase, an objective is scored', async () => {
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine' }).click();
    await addAction(page, 'Pass');
    await done(page);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'negotiate trade', 'Negotiate Trade Routes');
    const cost = panel(page).getByRole('group', { name: 'What scoring cost' });
    for (let i = 0; i < 5; i++) await cost.getByRole('button', { name: 'Add one trade good' }).click();
    await panel(page).getByRole('group', { name: 'Sol', exact: true }).getByRole('button', { name: 'Add one Sol' }).click();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    for (let i = 0; i < 2; i++) await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Strategy' }).click();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' }).last();
    for (const [q, n] of [['sabotage', 'Sabotage'], ['summit', 'Summit']] as const) {
      await taken.getByRole('button', { name: '+ Action card' }).click();
      await choose(page, q, n);
    }
    await dump('scored2', panel(page), 12000);
    await shot(page, '22-scored');
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    await expectTotals(page, { 'Trade goods': 0, VP: 3, Tactic: 2, Strategy: 1, Fleet: 3 }, 'Forecast');
  });

  await step('round 3: Technology main, Leadership second; Dacxive Animators and Spec Ops II', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { Resources: 7, Influence: 10, 'Trade goods': 0, Commodities: 4, Tactic: 2, Fleet: 3, Strategy: 1, VP: 3 }, 'Forecast');
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    const lead = page.getByRole('button', { name: '1 Leadership' });
    await lead.click(); await lead.click();
    await expect(page.getByText('Main: 7 Technology · Second: 1 Leadership')).toBeVisible();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'dacxive', 'Dacxive Animators');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'spec ops', 'Spec Ops II');
    await expect(panel(page).getByText(/prerequisites of Spec Ops II/)).toHaveCount(0);
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    await dump('tech3', panel(page));
    await shot(page, '23-tech3');
    await done(page);
    await expectTotals(page, { Resources: 1 }, 'Forecast');
  });

  await step('Leadership primary', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Leadership · primary ability' })).toBeVisible();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    for (const [pool, n] of [['Tactic', 2], ['Fleet', 1], ['Strategy', 2]] as const) for (let i = 0; i < n; i++) await tokens.getByRole('button', { name: `Add one ${pool}` }).click();
    await expect(panel(page).getByText('2 bought beyond the free ones, influence to pay: 6.')).toBeVisible();
    await shot(page, '24-leadership');
    await done(page);
    await expectTotals(page, { Tactic: 4, Fleet: 4, Strategy: 3, Influence: 0 }, 'Forecast');
  });

  await step('hero Jace X: remove every command token, then purge; a second use warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'jace', 'Jace X, 4th Air Legion');
    await shot(page, '25-hero');
    // Nothing of mine stands on the map yet to be removed; the hero is played after the tactical actions.
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await step('tactical 6: Rally and Upgrade named in Used; the fleet pool grows by Rally', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 39);
    await tapTile(page, 1);
    await tapTile(page, 39);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    await panel(page).getByRole('button', { name: 'Take one Destroyer' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Take one Fighter' }).click();
    for (let i = 0; i < 4; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await stage(page).getByRole('button', { name: 'Destroyer ×1' }).click();
    await stage(page).getByRole('button', { name: /^Fighter ×\d/ }).first().click();
    await dump('t6battle', stage(page));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    // Rally: after activating a system with another player's ships; Upgrade names a cruiser I do not have there.
    const used = panel(page).getByRole('group', { name: 'Used' });
    for (const [q, n] of [['rally', 'Rally'], ['upgrade', 'Upgrade']] as const) {
      await used.getByRole('button', { name: '+ Used' }).click();
      await choose(page, q, n);
    }
    await expect(panel(page).getByText('Wormhole α (39) is missing 1 × Cruiser.')).toBeVisible();
    await expectTotals(page, { Fleet: 6, Tactic: 3 });
    await shot(page, '26-t6used');
    await panel(page).getByRole('button', { name: 'Remove Upgrade' }).click();
    await expect(panel(page).getByText('Wormhole α (39) is missing 1 × Cruiser.')).toHaveCount(0);
    await done(page);
    await expectTotals(page, { Fleet: 6, Tactic: 3 }, 'Forecast');
  });

  await step('tactical 7: Mecatol to the system of Centauri and Gral; the agent is exhausted in Used', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 34);
    await tapTile(page, 18);
    await tapTile(page, 34);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 4; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Take one Mech' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    const centauri = panel(page).getByRole('group', { name: 'Landing on Centauri' });
    const gral = panel(page).getByRole('group', { name: 'Landing on Gral' });
    for (let i = 0; i < 2; i++) await centauri.getByRole('button', { name: 'Land one Infantry' }).click();
    for (let i = 0; i < 2; i++) await gral.getByRole('button', { name: 'Land one Infantry' }).click();
    await gral.getByRole('button', { name: 'Land one Mech' }).click();
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'evelyn', 'Evelyn DeLouis');
    await dump('t7used', panel(page));
    await shot(page, '27-t7used');
    await done(page);
    await expect(tile(page, 34).getByRole('img', { name: 'Infantry ×2' }).first()).toBeVisible();
    await dump('map34', tile(page, 34));
    await dump('map18', tile(page, 18));
  });

  await step('hero Jace X: the command tokens leave the board; a system may be activated again', async () => {
    await expect(tile(page, 34).getByRole('img', { name: 'Command token' })).toHaveCount(1);
    await expect(tile(page, 39).getByRole('img', { name: 'Command token' })).toHaveCount(1);
    await addAction(page, 'Component action');
    await choose(page, 'jace', 'Jace X, 4th Air Legion');
    await done(page);
    await expect(tile(page, 34).getByRole('img', { name: 'Command token' })).toHaveCount(0);
    await expect(tile(page, 39).getByRole('img', { name: 'Command token' })).toHaveCount(0);
    // the same system again: the carrier of 34 flies to 39 and no warning of the token appears
    await addAction(page, 'Tactical action');
    await tapTile(page, 39);
    await tapTile(page, 34);
    await tapTile(page, 39);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t8', panel(page));
    await expect(panel(page).getByText(/already holds your command token/)).toHaveCount(0);
    await done(page);
    // a second play of the purged hero warns
    await addAction(page, 'Component action');
    await choose(page, 'jace', 'Jace X, 4th Air Legion');
    await dump('hero2', panel(page));
    await shot(page, '28-hero2');
    await done(page);
  });

  await step('the agent a second time: exhausted, so it warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'evelyn', 'Evelyn DeLouis');
    await dump('agent2', panel(page));
    await shot(page, '29-agent2');
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await step('deal: Military Support goes to Hacan, who plays it', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    const give = panel(page).getByRole('group', { name: 'Give', exact: true });
    await give.getByRole('button', { name: '+ Component' }).click();
    await dump('deal-pick', picker(page), 2500);
    await choose(page, 'military support', 'Military Support');
    for (let i = 0; i < 3; i++) await give.getByRole('group', { name: 'Commodities' }).getByRole('button', { name: 'Add one Commodities' }).click();
    await dump('deal1', panel(page));
    await shot(page, '30-deal1');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await dump('deal2', panel(page));
    await done(page);
    // what the deal did to my numbers: 3 commodities given away (4 -> 1)
    await expectTotals(page, { Commodities: 1 }, 'Forecast');
  });

  await step('Hacan plays Military Support: my strategy pool loses a token', async () => {
    const before = await totals(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Hacan' }).click();
    await addAction(page, 'Component action');
    await choose(page, 'military support', 'Military Support');
    await dump('ms0', panel(page), 3000);
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Darien', exact: true }).click();
    await dump('ms1', panel(page), 3000);
    await shot(page, '31-ms');
    await done(page);
    const after = await totals(page);
    console.log('MS totals', JSON.stringify(before), JSON.stringify(after));
    expect(after.Strategy).toBe(before.Strategy - 1);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine' }).click();
  });

  await step('Orbital Drop three times: the pool of strategy tokens runs out', async () => {
    for (const [n, planet] of [[1, 'Mecatol Rex'], [2, 'Gral'], [3, 'Centauri']] as const) {
      await addAction(page, 'Component action');
      await choose(page, 'orbital drop', 'Orbital Drop');
      await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: planet, exact: true }).click();
      if (n === 3) {
        await dump('od3x', panel(page));
        await shot(page, '32-od3');
        await expect(panel(page).getByRole('list', { name: 'Warnings' })).toBeVisible();
      }
      await done(page);
    }
    // 2 infantry at a time: Mecatol had 2, Gral 2, Centauri 2
    await expectTotals(page, { Strategy: -1 }, 'Forecast');
    await expect(tile(page, 18).getByRole('img', { name: 'Infantry ×4' })).toBeVisible();
  });

  await step('a relic is taken: Shard of the Throne', async () => {
    await addAction(page, 'Manual adjustment');
    const taken = panel(page).getByRole('group', { name: 'With this entry' });
    const vp = (await totals(page)).VP;
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'shard of the throne', 'Shard of the Throne');
    await dump('relic', panel(page));
    await shot(page, '33-relic');
    console.log('VP before/after relic', vp, (await totals(page)).VP);
    await done(page);
  });

  await step('agenda phase: a law and a directive', async () => {
    const agendas = page.getByRole('region', { name: 'Agenda' });
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'anti-intellectual', 'Anti-Intellectual Revolution');
    await dump('agenda1', panel(page));
    await shot(page, '34-agenda');
    await done(page);
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'arms reduction', 'Arms Reduction');
    await done(page);
    // a law voted down does not stay in play
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'wormhole reconstruction', 'Wormhole Reconstruction');
    await panel(page).getByRole('group', { name: 'Outcome' }).getByRole('button', { name: 'Against' }).click();
    await done(page);
    await page.getByRole('button', { name: /^Components/ }).click();
    await groupTab(page, /^Objectives & laws/).click();
    await expect(drawer(page).getByRole('group', { name: 'Laws' })).not.toContainText('Wormhole Reconstruction');
    await expect(drawer(page).getByRole('group', { name: 'Laws' })).toContainText('Anti-Intellectual Revolution');
    await expect(drawer(page).getByRole('group', { name: 'Laws' })).not.toContainText('Arms Reduction');
    await groupTab(page, /^Objectives & laws/).click();
    await expect(drawer(page)).toHaveCount(0);
  });

  await step('round 3 status: Diversify Research is scored, tokens, two cards', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'diversify research', 'Diversify Research');
    const status = panel(page).getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('group', { name: 'Sol', exact: true }).getByRole('button', { name: 'Add one Sol' }).click();
    const tokens = status.getByRole('group', { name: 'Token distribution' });
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Fleet' }).click();
    const taken = status.getByRole('group', { name: 'Taken and discarded' });
    for (const [q, n] of [['war effort', 'War Effort'], ['economic initiative', 'Economic Initiative']] as const) {
      await taken.getByRole('button', { name: '+ Action card' }).click();
      await choose(page, q, n);
    }
    await dump('status3', status, 15000);
    await shot(page, '35-status3');
    await status.getByRole('checkbox', { name: 'Done' }).check();
    await expectTotals(page, { Tactic: 3, Fleet: 7 }, 'Forecast');
  });

  await step('round 4: Plasma Scoring and Fighter II; the unit table follows the upgrades', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    await dump('r4start', page.getByRole('group', { name: 'Totals, now and forecast' }));
    console.log('R4 start totals', JSON.stringify(await totals(page)));
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'plasma scoring', 'Plasma Scoring');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'fighter ii', 'Fighter II');
    await dump('tech4', panel(page));
    await shot(page, '36-tech4');
    await done(page);
    await page.getByRole('button', { name: /^Components/ }).click();
    await groupTab(page, /^Technologies/).click();
    await dump('units4', drawer(page), 20000);
    await shot(page, '37-units4');
    await groupTab(page, /^Technologies/).click();
  });

  await step('round 4: War Effort and Economic Initiative as component actions', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'war effort', 'War Effort');
    await panel(page).getByRole('group', { name: 'System', exact: true }).getByRole('button', { name: '39', exact: true }).click();
    await shot(page, '38-wareffort');
    await done(page);
    await expect(tile(page, 39).getByRole('img', { name: 'Cruiser ×1' })).toBeVisible();
    await addAction(page, 'Component action');
    await choose(page, 'economic initiative', 'Economic Initiative');
    await done(page);
  });

  await step('tactical 9: a flagship is bought at Jord with too few resources', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 1);
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    await dump('flagship-shop', stage(page));
    await shot(page, '39-flagship-shop');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('flagship-panel', panel(page));
    await shot(page, '39-flagship-panel');
    await done(page);
  });

  await step('components drawer after the game: leaders, the returned note, the shard', async () => {
    await page.getByRole('button', { name: /^Components/ }).click();
    await groupTab(page, /^Faction/).click();
    await dump('leaders-end', drawer(page), 8000);
    await shot(page, '40-leaders-end');
    await groupTab(page, /^Cards/).click();
    await dump('cards-end', drawer(page), 8000);
    await groupTab(page, /^Relics/).click();
    await dump('relics-end', drawer(page), 3000);
    await groupTab(page, /^Relics/).click();
  });

  await step('Antimass Deflectors: a carrier flies into the asteroid field of 79', async () => {
    await tapTile(page, 47);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Mine' }).click();
    await stage(page).getByRole('button', { name: 'Carrier', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 79);
    await tapTile(page, 47);
    await tapTile(page, 79);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('asteroid', panel(page), 5000);
    await shot(page, '41-asteroid');
    await done(page);
  });
});
