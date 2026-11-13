import { expect, test, type Locator, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

/**
 * One long game as the Yin Brotherhood, played through the interface only. Six players: Yin (seat 1, tile 3), Letnev,
 * Argent, Deepwrought Scholarate (Thunder's Edge), Hacan, Titans of Ul. Prophecy of Kings and Thunder's Edge on.
 * Homes are written into the Milty string: 3 10 58 95 16 55 at seats 1..6.
 */
const MAP = '78 40 42 67 69 34 39 27 26 65 79 47 32 30 29 73 41 21 3 20 62 10 19 64 58 44 36 95 38 61 16 76 24 55 37 50';
const SHOTS = 'test-results/scenarios/yin';
const DEBUG = process.env.DUMP;

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const stage = (page: Page) => page.locator('.stage-dialog');
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const summary = (page: Page, name: string) => page.getByRole('group', { name: 'Totals, now and forecast' }).getByRole('group', { name, exact: true });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });
const actions = (page: Page) => page.getByRole('region', { name: 'Actions' });
const waived = (scope: Locator, code: string) => scope.locator(`li.warning-waived[data-code="${code}"]`);
const standing = (scope: Locator, code: string) => scope.locator(`li[data-code="${code}"]:not(.warning-waived)`);

test.use({ actionTimeout: 10_000 });
expect.configure({ timeout: 6000 });
test.setTimeout(290_000);

async function dump(label: string, loc: Locator) {
  const text = await loc.ariaSnapshot();
  writeFileSync(`${SHOTS}/dump-${label.replace(/[^a-z0-9]+/gi, '_')}.txt`, text);
  if (DEBUG && (DEBUG === 'all' || DEBUG === label)) console.log(`--- ${label}\n${text.slice(0, 9000)}`);
}
async function shot(page: Page, name: string) { await page.screenshot({ path: `${SHOTS}/${name}.png` }); }
async function warnings(scope: Locator): Promise<string[]> {
  const items = scope.locator('li[data-code]');
  const out: string[] = [];
  for (const li of await items.all()) out.push(`${(await li.getAttribute('data-code'))}${(await li.getAttribute('class'))?.includes('waived') ? ' (waived)' : ''}: ${((await li.innerText()) ?? '').replace(/\s+/g, ' ')}`);
  return out;
}

async function pair(page: Page, name: string): Promise<{ now: number; forecast: number }> {
  const text = ((await summary(page, name).textContent()) ?? '').replace(name, '').replace(/\s+/g, '').trim();
  const m = text.match(/^(-?\d+)(?:→(-?\d+))?$/);
  if (!m) throw new Error(`no numbers in "${text}" for ${name}`);
  return { now: Number(m[1]), forecast: Number(m[2] ?? m[1]) };
}
const NAMES = ['Resources', 'Influence', 'Trade goods', 'Commodities', 'Tactic', 'Fleet', 'Strategy', 'VP'];
async function totals(page: Page) {
  const out: Record<string, number> = {};
  for (const n of NAMES) out[n] = (await pair(page, n)).forecast;
  return out;
}
async function nowTotals(page: Page) {
  const out: Record<string, number> = {};
  for (const n of NAMES) out[n] = (await pair(page, n)).now;
  return out;
}
async function expectTotals(page: Page, expected: Partial<Record<string, number>>, label = '') {
  await expect.poll(async () => {
    const got = await totals(page);
    return Object.keys(expected).every(k => got[k] === expected[k]);
  }, { timeout: 4000, message: label }).toBe(true).catch(async () => {
    const got = await totals(page);
    for (const [k, v] of Object.entries(expected)) expect(got[k], `${label} ${k} (all: ${JSON.stringify(got)})`).toBe(v);
  });
}
async function expectNow(page: Page, expected: Partial<Record<string, number>>, label = '') {
  await expect.poll(async () => {
    const got = await nowTotals(page);
    return Object.keys(expected).every(k => got[k] === expected[k]);
  }, { timeout: 4000, message: label }).toBe(true).catch(async () => {
    const got = await nowTotals(page);
    for (const [k, v] of Object.entries(expected)) expect(got[k], `now ${label} ${k} (all: ${JSON.stringify(got)})`).toBe(v);
  });
}

async function tapTile(page: Page, n: number) {
  let last = '';
  await expect.poll(async () => {
    const now = JSON.stringify(await tile(page, n).boundingBox());
    const still = now === last;
    last = now;
    return still;
  }, { intervals: [150] }).toBe(true);
  await tile(page, n).click();
}
async function addAction(page: Page, type: string) {
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.locator('.action-list').getByRole('button', { name: type, exact: true }).click();
}
async function choose(page: Page, query: string, name: string) {
  await picker(page).getByRole('searchbox', { name: 'Search components' }).fill(query);
  await picker(page).getByRole('button', { name: `Choose ${name}` }).click();
  await expect(picker(page)).toHaveCount(0);
}
async function done(page: Page) { await panel(page).getByRole('button', { name: 'Done', exact: true }).click(); }
const takeOne = (scope: Locator, unit: string) => scope.getByRole('button', { name: `Take one ${unit}` }).first().click();
async function take(scope: Locator, unit: string, n = 1) { for (let i = 0; i < n; i++) await takeOne(scope, unit); }
async function landOn(scope: Locator, unit: string, n = 1) { for (let i = 0; i < n; i++) await scope.getByRole('button', { name: `Land one ${unit}` }).first().click(); }
async function whose(page: Page, who: string) { await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: who, exact: true }).click(); }
async function openGroup(page: Page, name: RegExp) {
  if (await drawer(page).count() === 0) await page.getByRole('button', { name: /^Components/ }).first().click();
  await expect(drawer(page)).toBeVisible();
  const tab = groupTab(page, name);
  if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-pressed', 'true');
}
async function closeDrawer(page: Page) {
  if (await drawer(page).count() === 0) return;
  await page.locator('.tab-fan > button[aria-pressed="true"]').first().click();
  await expect(drawer(page)).toHaveCount(0);
}

const RAW = new Set<string>();
async function rawKeys(page: Page) {
  const found = await page.evaluate(() => {
    const re = /\b(?:components|plan|stage|players|editor|unit|ships|game|common|map|legend|drawers|expedition|fracture|layout|mapImport|thundersEdge|menu|warning|rules)\.[a-zA-Z_]+(?:\.[a-zA-Z_]+)*\b|\b(?:technology|leader|promissory|actionCard|agenda|relic|ability|mech|breakthrough|legendary|publicObjective|secretObjective|exploration):[a-z0-9_]+/g;
    const out = new Set<string>();
    for (const m of document.body.innerText.matchAll(re)) out.add(m[0]);
    for (const el of document.querySelectorAll('[aria-label],[title],[placeholder]')) {
      for (const a of ['aria-label', 'title', 'placeholder']) for (const m of (el.getAttribute(a) ?? '').matchAll(re)) out.add(m[0]);
    }
    return [...out];
  });
  for (const key of found) RAW.add(key);
}

test('Yin Brotherhood: a long game through the interface', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  const step = async (title: string, body: () => Promise<void>) => {
    const t = Date.now();
    await test.step(title, body);
    console.log(`ok ${((Date.now() - t) / 1000).toFixed(0)}s  ${title}`);
    await rawKeys(page);
  };

  await step('create the game on the first screen', async () => {
    await page.goto('/');
    const names = ['The Yin Brotherhood', 'The Barony of Letnev', 'The Argent Flight', 'The Deepwrought Scholarate', 'The Emirates of Hacan', 'The Titans of Ul'];
    for (let i = 0; i < 6; i++) {
      await page.getByRole('group', { name: `Player ${i + 1}` }).getByRole('button', { name: i === 0 ? 'My faction' : 'Opponent', exact: true }).click();
      await page.getByRole('button', { name: names[i] }).first().click();
    }
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('textbox', { name: 'Game name' }).fill('Yin long game');
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('Home systems placed: 6.')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await shot(page, '01-game-screen');
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 3)).toBeVisible();
    // Darien 4/4; Yin: 3 tactic, 3 fleet, 2 strategy tokens; commodity value 2, none held at start.
    await expectTotals(page, { Resources: 4, Influence: 4, 'Trade goods': 0, Commodities: 0, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 }, 'start');
    await dump('start-home', tile(page, 3));
    await shot(page, '02-start');
  });

  await step('R1: the strategy card Technology as main', async () => {
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await expect(page.getByText('Main: 7 Technology')).toBeVisible();
  });

  await step('R1 tactical 1: a carrier with four infantry from Darien to Vefut II (20)', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 20);
    await expect(page.getByText('Active system: Vefut II')).toBeVisible();
    await expect(panel(page).getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await tapTile(page, 3);
    await tapTile(page, 20);
    await expect(page.getByText('Flight Darien → Vefut II')).toBeVisible();
    await take(panel(page), 'Carrier');
    await take(panel(page), 'Infantry', 4);
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 4 of 4' })).toBeVisible();
    await dump('t1-flight', panel(page));
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t1-after-fly', panel(page));
    await landOn(panel(page), 'Infantry', 4);
    await dump('t1-landed', panel(page));
    await shot(page, '03-t1');
    await done(page);
    await expectTotals(page, { Resources: 4, Influence: 4, Tactic: 2 }, 'after t1 (Vefut II is taken exhausted)');
  });

  await step('R1 strategy: Technology primary, Impulse Core first lacks a yellow prerequisite', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Technology · primary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'impulse core', 'Impulse Core');
    await dump('tech-ic-first', panel(page));
    await expect(panel(page).getByText('The prerequisites of Impulse Core are not met: 1 missing (cybernetic ×1).')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove Impulse Core' }).click();
    await expect(standing(panel(page), 'prerequisitesMissing')).toHaveCount(0);
    // Scanlink Drone Network has no prerequisite; with Sarween Tools it makes the two yellow of Impulse Core.
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'scanlink', 'Scanlink Drone Network');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'impulse core', 'Impulse Core');
    await expect(standing(panel(page), 'prerequisitesMissing')).toHaveCount(0);
    // The second technology costs 6 resources; Darien gives 4 (Vefut II was taken exhausted).
    await dump('tech-ic-second', panel(page));
    console.log('WARN ic second', await warnings(panel(page)));
    await expect(panel(page).getByText('Not enough resources: need 6, paid 4, short by 2.')).toBeVisible();
    await shot(page, '04-tech-r1');
    // Not affordable now: Impulse Core waits for the Technology secondary of round 2.
    await panel(page).getByRole('button', { name: 'Remove Impulse Core' }).click();
    await expect(standing(panel(page), 'shortResources')).toHaveCount(0);
    await done(page);
    await expectTotals(page, { Resources: 4, Strategy: 2, Tactic: 2 }, 'after tech r1');
  });

  await step('R1 tactical 2: ships may not leave Vefut II, my command token stands there', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 62);
    await tapTile(page, 20);
    await tapTile(page, 62);
    await expect(page.getByText('Flight Vefut II → Sem-Lore')).toBeVisible();
    await take(panel(page), 'Carrier');
    await take(panel(page), 'Infantry', 3);
    await expect(panel(page).getByText('Vefut II already holds your command token: by the rules ships cannot move out of it.')).toBeVisible();
    await expect(standing(panel(page), 'sourceActivated')).toHaveCount(1);
    await dump('t2-flight', panel(page));
    await shot(page, '05-t2-token-warning');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
    await expect(tile(page, 62).getByRole('img', { name: 'Infantry ×3' })).toHaveCount(0);
    await expectTotals(page, { Tactic: 2, Resources: 4 }, 'tactical 2 removed');
  });

  await step('R1 setup: a Hacan fleet stands on the wormhole 39 next to Darien', async () => {
    await tile(page, 39).click();
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Hacan' }).click();
    for (const u of ['Cruiser', 'Cruiser', 'Fighter']) await stage(page).getByRole('button', { name: u, exact: true }).click();
    await shot(page, '06-stage39');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  await step('R1 tactical 2: a fleet from Darien to the wormhole 39, a battle in space, the Devotion', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 39);
    await tapTile(page, 3);
    await tapTile(page, 39);
    await expect(page.getByText('Flight Darien → Wormhole')).toBeVisible();
    await take(panel(page), 'Carrier');
    await take(panel(page), 'Destroyer');
    await take(panel(page), 'Fighter', 3);
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t2b-after-fly', panel(page));
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await shot(page, '07-battle');
    await dump('battle1', stage(page));
    // Round 1: Devotion destroys my destroyer for a hit on a Hacan cruiser; a fighter of mine and their fighter fall too.
    await stage(page).getByRole('button', { name: 'Destroyer ×1' }).click();
    await stage(page).getByRole('button', { name: 'Fighter ×3' }).click();
    await stage(page).getByRole('button', { name: /^Cruiser ×2/ }).click();
    await stage(page).getByRole('button', { name: 'Fighter ×1 (The Emirates of Hacan)', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Cruiser ×1 (The Emirates of Hacan)', exact: true }).click();
    await dump('battle2', stage(page));
    await shot(page, '07-battle2');
    await expect(stage(page).getByRole('group', { name: 'Losses, mine' }).getByRole('button', { name: 'Give back Destroyer' })).toBeVisible();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t2b-after-battle', panel(page));
    await expect(panel(page).getByText(/Brother Milor|Devotion/).first()).toBeVisible();
    // The ability can also be named in Used.
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await dump('used-picker', picker(page));
    await choose(page, 'devotion', 'Devotion');
    await dump('t2b-used-devotion', panel(page));
    console.log('WARN used devotion', await warnings(panel(page)));
    await shot(page, '08-devotion-used');
    await done(page);
    await expect(tile(page, 39).getByRole('img', { name: 'Carrier ×1' })).toBeVisible();
    await expectTotals(page, { Tactic: 1, Fleet: 3 }, 'after battle');
  });

  await step('R1 tactical 3: the home system, production at the dock: a mech and infantry', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 3);
    await expect(page.getByText('Active system: Darien')).toBeVisible();
    await expect(panel(page).getByText('Tactic tokens: 1 → 0')).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await dump('shop1', stage(page));
    await shot(page, '09-shop1');
    const shop = stage(page);
    await shop.getByRole('group', { name: 'Darien' }).getByRole('button', { name: 'Mech', exact: true }).click();
    await shop.getByRole('group', { name: 'Darien' }).getByRole('button', { name: 'Infantry', exact: true }).click();
    await shop.getByRole('group', { name: 'Darien' }).getByRole('button', { name: 'Infantry', exact: true }).click();
    await dump('shop2', shop);
    await shot(page, '09-shop2');
    await shop.getByRole('button', { name: 'Close' }).click();
    await dump('t3-after-shop', panel(page));
    console.log('WARN t3', await warnings(panel(page)));
    await done(page);
    await expect(tile(page, 3).getByRole('img', { name: 'Mech ×1' })).toBeVisible();
    await expect(tile(page, 3).getByRole('img', { name: 'Infantry ×2' })).toBeVisible();
    await expectTotals(page, { Resources: 0, Tactic: 0 }, 'after production (the whole of Darien was paid)');
  });

  await step('R1: Politics secondary draws two action cards (Frontline Deployment, Rise of a Messiah)', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '3 Politics' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Politics · secondary ability' })).toBeVisible();
    await expectTotals(page, { Strategy: 1 }, 'secondary costs a token');
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    for (const [q, n] of [['frontline', 'Frontline Deployment'], ['messiah', 'Rise of a Messiah']] as const) {
      await common.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await dump('politics', panel(page));
    await done(page);
  });

  await step('R1: Frontline Deployment puts 3 infantry on Vefut II', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'frontline', 'Frontline Deployment');
    await dump('fd-pick', panel(page));
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Vefut II', exact: true }).click();
    await done(page);
    await expect(tile(page, 20).getByRole('img', { name: 'Infantry ×7' })).toBeVisible();
  });

  await step('R1: pass', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await shot(page, '10-round1-actions');
    await dump('actions1', actions(page));
  });

  await step('R1: the status phase, two tokens to distribute', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    await expect(tokens).toContainText('Distribute tokens: 2 left');
    await dump('status1-open', panel(page));
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Fleet' }).click();
    await expect(tokens).toContainText('Distribute tokens: 0 left');
    await shot(page, '11-status1');
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    await expectTotals(page, { Tactic: 1, Fleet: 4, Strategy: 1, Resources: 6, Influence: 6 }, 'after status r1');
  });

  await step('R1 is done: every entry checked, round 2 added', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await expectNow(page, { Resources: 6, Influence: 6, Tactic: 1, Fleet: 4, Strategy: 1 }, 'now after r1');
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { Resources: 6, Influence: 6, 'Trade goods': 0, Tactic: 1, Fleet: 4, Strategy: 1 }, 'r2 start');
    await shot(page, '12-round2');
  });

  await step('R2: the Trade card as main; Trade primary gives 3 trade goods and replenishes the commodities', async () => {
    const trade = page.getByRole('button', { name: '5 Trade' });
    await trade.click(); await trade.click(); await trade.click();
    await expect(page.getByText('Main: 5 Trade')).toBeVisible();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await dump('trade1', panel(page));
    await panel(page).getByRole('group', { name: 'Who uses the secondary for free' }).getByRole('button', { name: 'Argent' }).click();
    // 3 trade goods; Yin commodity value is 2.
    await expectTotals(page, { 'Trade goods': 3, Commodities: 2, Strategy: 1 }, 'trade primary');
    await done(page);
    await expectTotals(page, { 'Trade goods': 3, Commodities: 2, Strategy: 1 }, 'trade primary done');
  });

  await step('R2 tactical 4: the flagship Van Hauge is bought at the dock (8 - 1 Sarween Tools), paid by hand', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 3);
    await expect(page.getByText('Active system: Darien')).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = stage(page);
    await shop.getByRole('group', { name: 'Space' }).getByRole('button', { name: 'Flagship', exact: true }).click();
    await dump('shop-flag', shop);
    await shot(page, '13-shop-flagship');
    await shop.getByRole('button', { name: 'Close' }).click();
    await dump('t4-after-shop', panel(page));
    console.log('WARN t4', await warnings(panel(page)));
    // Sarween Tools: the combined cost of the production is reduced by 1, so 7 resources pay for the flagship (LRR: Sarween Tools).
    const pay = panel(page).getByRole('group', { name: 'Payment' });
    await pay.getByRole('button', { name: 'Choose manually' }).click();
    await dump('pay-manual', pay);
    await shot(page, '13-pay-manual');
    await pay.getByRole('button', { name: 'Remove one trade good' }).click();
    await dump('pay-seven', panel(page));
    console.log('WARN pay 7', await warnings(panel(page)));
    await expectTotals(page, { 'Trade goods': 2 }, 'one trade good paid');
    // BUG: the payment block shows "Cost 8" while Sarween Tools makes it 7 (the replay agrees: no shortResources warning;
    // TacticalEditor.tsx:75 prices with productionCost, not with costOf), and the automatic payment above took 2 trade goods, not 1.
    await expect(pay).toContainText('Cost 8, paid 7');
    await expect(standing(panel(page), 'shortResources')).toHaveCount(0);
    await done(page);
    await expect(tile(page, 3).getByRole('img', { name: 'Flagship ×1' })).toBeVisible();
    await expectTotals(page, { Resources: 0, 'Trade goods': 2, Tactic: 0, Fleet: 4 }, 'after the flagship');
    await dump('home-after-flag', tile(page, 3));
  });

  await step('R2: Rise of a Messiah puts an infantry on each planet I control', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'messiah', 'Rise of a Messiah');
    await dump('messiah', panel(page));
    console.log('WARN messiah', await warnings(panel(page)));
    await done(page);
    await dump('map20-after-messiah', tile(page, 20));
    await dump('map3-after-messiah', tile(page, 3));
  });

  await step('R2: a transaction needs a neighbour; the warning stands for Argent, far away', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Argent', exact: true }).click();
    await expect(panel(page).getByText('A transaction is only with a neighbour')).toBeVisible();
    await dump('deal-far', panel(page));
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page);
  });

  await step('R2: the status phase; Lead From the Front is entered with one token in the pools of three, and taken back', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'lead from', 'Lead From the Front');
    await dump('score-lead', panel(page));
    // One strategy token stands in the pool: 1 of 3.
    await expect(panel(page).getByText('Objective Lead From the Front is scored without its requirement: 1 of 3.')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove Lead From the Front' }).click();
    await expect(panel(page).getByText(/scored without its requirement/)).toHaveCount(0);
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    for (let i = 0; i < 2; i++) await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await shot(page, '14-status2');
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    await expectTotals(page, { VP: 0, Tactic: 2, Fleet: 4, Strategy: 1 }, 'after status r2');
  });

  await step('R2 is done, round 3 begins', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { Resources: 6, Influence: 6, 'Trade goods': 2, Commodities: 2, Tactic: 2, Fleet: 4, Strategy: 1, VP: 0 }, 'r3 start');
    await shot(page, '15-round3');
    for (const n of [3, 20, 39]) await dump('r3start-tile' + n, tile(page, n));
  });

  await step('R3: Technology main; Neural Motivator free, Yin Spinner Omega second lacks one green prerequisite', async () => {
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await expect(page.getByText('Main: 7 Technology')).toBeVisible();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'neural motivator', 'Neural Motivator');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'yin spinner', 'Yin Spinner Omega');
    await dump('tech3-yso', panel(page));
    // Yin Spinner Omega needs two green; Neural Motivator is one.
    await expect(panel(page).getByText('The prerequisites of Yin Spinner Omega are not met: 1 missing (biotic ×1).')).toBeVisible();
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    await shot(page, '16-tech3-missing');
  });

  await step('R3: the commander Brother Omar is unlocked (a faction ability was used) and covers a green prerequisite', async () => {
    // The drawer opens over the editor; the entry stays open.
    await openGroup(page, /^Faction/);
    const omar = drawer(page).getByRole('group', { name: 'Brother Omar: state' });
    await omar.getByRole('button', { name: 'Unlocked' }).click();
    await expect(omar.getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await shot(page, '17-omar-unlocked');
    await closeDrawer(page);
    await dump('tech3-after-omar', panel(page));
    console.log('WARN after omar', await warnings(panel(page)));
    await expect(panel(page).getByText(/prerequisites of Yin Spinner Omega/)).toHaveCount(0);
    await expect(standing(panel(page), 'prerequisitesMissing')).toHaveCount(0);
    await done(page);
    await expectTotals(page, { Resources: 0, Tactic: 2, Strategy: 1 }, 'after tech r3');
  });

  await step('R3 setup: Letnev ground forces stand on Sem-Lore (62)', async () => {
    await tile(page, 62).click();
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Letnev' }).click();
    for (let i = 0; i < 3; i++) await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await dump('setup62', stage(page));
    await shot(page, '18-setup62');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  await step('R3 tactical 5: infantry from Vefut II on a carrier invade Sem-Lore; Indoctrination and the mech are named', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 62);
    await tapTile(page, 20);
    await tapTile(page, 62);
    await expect(page.getByText('Flight Vefut II → Sem-Lore')).toBeVisible();
    await take(panel(page), 'Carrier');
    await take(panel(page), 'Infantry', 4);
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t5-after-fly', panel(page));
    await landOn(panel(page), 'Infantry', 4);
    await dump('t5-landed', panel(page));
    await shot(page, '19-t5-landed');
    await panel(page).getByRole('group', { name: 'Landing on Sem-Lore' }).getByRole('img', { name: 'Infantry ×3' }).click().catch(e => console.log('click defenders failed', String(e).slice(0, 200)));
    await dump('t5-after-defender-click', panel(page));
    const battleBtn = panel(page).getByRole('button', { name: /^Battle/ });
    console.log('battle button', await battleBtn.innerText());
    await battleBtn.click();
    await dump('t5-battle-stage', stage(page));
    await shot(page, '19-t5-battle');
    // Ground combat: Indoctrination swaps one Letnev infantry for mine (2 influence), the rest is rolled: Letnev loses its three,
    // I lose one infantry.
    for (const n of [3, 2, 1]) await stage(page).getByRole('button', { name: `Infantry ×${n} (The Barony of Letnev)`, exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry ×4', exact: true }).click();
    await dump('t5-battle-after', stage(page));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'indoctrination', 'Indoctrination');
    await dump('t5-used-indoc', panel(page));
    console.log('WARN t5', await warnings(panel(page)));
    await shot(page, '20-t5-used');
    await done(page);
    await expect(tile(page, 62).getByRole('img', { name: 'Infantry ×3' })).toBeVisible();
    // Both planets were exhausted for the technology: no influence is left for Indoctrination's 2, and nothing says so (hint only).
    await expectTotals(page, { Tactic: 1, Influence: 0, Resources: 0 }, 'after t5');
    expect(await warnings(actions(page))).toEqual(expect.not.arrayContaining([expect.stringMatching(/influence/i)]));
    await dump('map62-after', tile(page, 62));
  });

  await step('R3 tactical 6: home production (a mech, 1 trade good), then Yin Spinner Omega places two infantry; a deal gives Greyfire Mutagen to Letnev', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 3);
    await expect(panel(page).getByText('Tactic tokens: 1 → 0')).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('group', { name: 'Darien' }).getByRole('button', { name: 'Mech', exact: true }).click();
    await dump('shop3', stage(page));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    const pay = panel(page).getByRole('group', { name: 'Payment' });
    await dump('t6-pay', pay);
    // BUG (same as the flagship): Sarween Tools makes the mech 1, the block says "Cost 2".
    await expect(pay).toContainText('Cost 2, paid 2');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'yin spinner', 'Yin Spinner Omega');
    await dump('t6-yso', panel(page));
    await shot(page, '21-t6-yso');
    const spin = panel(page).getByRole('group', { name: 'Yin Spinner Omega', exact: true });
    await spin.getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Darien', exact: true }).click();
    await spin.getByRole('button', { name: 'Add one How many infantry' }).click();
    await dump('t6-yso2', panel(page));
    console.log('WARN yso', await warnings(panel(page)));
    // The deal: Greyfire Mutagen and two commodities to Letnev, whose home is next to Sem-Lore, which is mine now.
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Letnev', exact: true }).click();
    await expect(panel(page).getByText('A transaction is only with a neighbour')).toHaveCount(0);
    const give = panel(page).getByRole('group', { name: 'Give' });
    await give.getByRole('button', { name: '+ Component' }).click();
    await dump('deal-picker', picker(page));
    await choose(page, 'greyfire', 'Greyfire Mutagen');
    await give.getByRole('group', { name: 'Commodities' }).getByRole('button', { name: 'Add one Commodities' }).click();
    await give.getByRole('group', { name: 'Commodities' }).getByRole('button', { name: 'Add one Commodities' }).click();
    await dump('deal-give', panel(page));
    await shot(page, '22-deal');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await dump('t6-after-deal', panel(page));
    console.log('WARN t6', await warnings(panel(page)));
    await done(page);
    await expectTotals(page, { Commodities: 0, Tactic: 0 }, 'after t6');
    await dump('map3-after-t6', tile(page, 3));
  });

  await step('R3: Letnev holds Greyfire Mutagen now, plays it, and the note returns to me', async () => {
    await openGroup(page, /^Cards/);
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Letnev' }).click();
    await dump('letnev-cards', drawer(page));
    await expect(drawer(page)).toContainText('Greyfire Mutagen');
    await shot(page, '23-letnev-cards');
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Mine', exact: true }).click();
    await dump('mine-cards-after-deal', drawer(page));
    await expect(drawer(page).getByRole('button', { name: /^Greyfire Mutagen with Letnev/ })).toHaveCount(1);
    await closeDrawer(page);
    await whose(page, 'Letnev');
    await addAction(page, 'Component action');
    await dump('letnev-pick', picker(page));
    await choose(page, 'greyfire', 'Greyfire Mutagen');
    await dump('letnev-greyfire', panel(page));
    console.log('WARN letnev greyfire', await warnings(panel(page)));
    await done(page);
    await whose(page, 'Mine');
    await openGroup(page, /^Cards/);
    await dump('mine-cards-after-play', drawer(page));
    // LRR 69.3: the note returns to its owner after it is played.
    await expect(drawer(page).getByRole('button', { name: /^Greyfire Mutagen in hand/ })).toHaveCount(1);
    await closeDrawer(page);
    // Letnev does not hold it any more: a second play warns.
    await whose(page, 'Letnev');
    await addAction(page, 'Component action');
    await choose(page, 'greyfire', 'Greyfire Mutagen');
    await dump('letnev-greyfire2', panel(page));
    console.log('WARN letnev greyfire 2', await warnings(panel(page)));
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
    await whose(page, 'Mine');
  });

  await step('R3: Diplomacy secondary readies Darien and Vefut II', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '2 Diplomacy' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Diplomacy · secondary ability' })).toBeVisible();
    await dump('diplomacy', panel(page));
    const ready = panel(page).getByRole('group', { name: 'Ready planets' });
    await ready.getByRole('button', { name: /^Darien/ }).click();
    await ready.getByRole('button', { name: /^Sem-Lore/ }).click();
    await expectTotals(page, { Strategy: 0, Resources: 7, Influence: 6 }, 'planets readied');
    await done(page);
  });

  await step('R3: the agent Brother Milor is exhausted by use; a second use in the round warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'milor', 'Brother Milor');
    await dump('milor1', panel(page));
    console.log('WARN milor 1', await warnings(panel(page)));
    await done(page);
    await addAction(page, 'Component action');
    await choose(page, 'milor', 'Brother Milor');
    await dump('milor2', panel(page));
    console.log('WARN milor 2', await warnings(panel(page)));
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toBeVisible();
    await shot(page, '24-milor2');
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await step('R3: pass; the status phase: Lead From the Front cannot be paid (the pools are empty), two tokens are given', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'lead from', 'Lead From the Front');
    await dump('score-lead3', panel(page));
    // Scoring spends tokens that stand in the pools at that moment (before the new ones): none left after this round's actions.
    await expect(panel(page).getByText('Objective Lead From the Front is scored without its requirement: 0 of 3.')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove Lead From the Front' }).click();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    for (let i = 0; i < 2; i++) await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await shot(page, '25-status3');
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    await expectTotals(page, { VP: 0, Tactic: 2, Strategy: 0 }, 'after status r3');
  });

  await step('R3 is done, round 4 begins; the exhausted agent is ready again', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    // Darien 4, Vefut II 2, Sem-Lore 3 resources; 4+2+2 influence; the two trade goods went into the mech.
    await expectTotals(page, { Resources: 9, Influence: 8, 'Trade goods': 0, Commodities: 0, Tactic: 2, Fleet: 4, Strategy: 0, VP: 0 }, 'r4 start');
    await openGroup(page, /^Faction/);
    await expect(drawer(page).getByRole('group', { name: 'Brother Milor: state' }).getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await expect(drawer(page).getByRole('group', { name: 'Brother Omar: state' }).getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await shot(page, '26-round4-faction');
    await closeDrawer(page);
  });

  await step('R4: Technology main; Letnev researches Light/Wave Deflector first (a rival action)', async () => {
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await whose(page, 'Letnev');
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await dump('letnev-tech', panel(page));
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'light/wave', 'Light/Wave Deflector');
    await dump('letnev-tech2', panel(page));
    console.log('WARN letnev tech', await warnings(panel(page)));
    await shot(page, '27-letnev-tech');
    await done(page);
    await whose(page, 'Mine');
  });

  await step('R4: Technology primary: Impulse Core free, Light/Wave Deflector (owned by Letnev) second; the commander waives the missing prerequisite', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Technology · primary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'impulse core', 'Impulse Core');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'light/wave', 'Light/Wave Deflector');
    await dump('tech4', panel(page));
    console.log('WARN tech4', await warnings(panel(page)));
    await shot(page, '28-tech4');
    await page.screenshot({ path: SHOTS + '/28-topbar.png', clip: { x: 56, y: 0, width: 760, height: 60 } });
    await expect(waived(panel(page), 'prerequisitesMissing')).toHaveCount(1);
    await expect(waived(panel(page), 'prerequisitesMissing')).toContainText('Allowed by: Brother Omar');
    await done(page);
    await expectTotals(page, { Resources: 3, Influence: 2 }, 'after tech r4');
  });

  await step('R4: a manual adjustment takes Gravity Drive, Plasma Scoring (technologies), three action cards and a relic', async () => {
    await addAction(page, 'Manual adjustment');
    await dump('manual0', panel(page));
    const taken = panel(page).getByRole('group', { name: 'With this entry' });
    const vp0 = (await totals(page)).VP;
    for (const [q, n] of [['gravity drive', 'Gravity Drive'], ['plasma scoring', 'Plasma Scoring'], ['mining initiative', 'Mining Initiative'], ['rally', 'Rally'], ['sabotage', 'Sabotage'], ['shard of the throne', 'Shard of the Throne']] as const) {
      await taken.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await dump('manual1', panel(page));
    console.log('WARN manual', await warnings(panel(page)), 'VP', vp0, (await totals(page)).VP);
    await shot(page, '29-manual');
    await done(page);
    await expectTotals(page, { VP: 1 }, 'relic gives a point');
  });

  await step('R4 tactical 7: two destroyers are built at home, paid with Sem-Lore (3) and Darien is not needed', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 3);
    await expect(panel(page).getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    for (let i = 0; i < 2; i++) await stage(page).getByRole('group', { name: 'Space' }).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await dump('shop4', stage(page));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t7-after-shop', panel(page));
    console.log('WARN t7', await warnings(panel(page)));
    await done(page);
    await expect(tile(page, 3).getByRole('img', { name: 'Destroyer ×2' })).toBeVisible();
  });

  await step('R4 setup: a Titans fleet stands in the empty system 78 next to Mecatol Rex', async () => {
    await tile(page, 78).click();
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Titans' }).click();
    for (const u of ['Cruiser', 'Cruiser', 'Dreadnought', 'Fighter']) await stage(page).getByRole('button', { name: u, exact: true }).click();
    await shot(page, '30-stage78');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  await step('R4 tactical 8 (tried): the new ships cannot leave Darien this round; the missing speed of the flagship is allowed by Gravity Drive', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 78);
    await expect(panel(page).getByText('Tactic tokens: 1 → 0')).toBeVisible();
    await tapTile(page, 39);
    await tapTile(page, 78);
    await take(panel(page), 'Carrier');
    await take(panel(page), 'Fighter', 2);
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: 'Add source' }).click();
    await page.waitForTimeout(1000);
    await tapTile(page, 3);
    await tapTile(page, 39);
    await tapTile(page, 78);
    await dump('t8-route2', panel(page));
    await take(panel(page), 'Flagship');
    await take(panel(page), 'Destroyer', 2);
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t8-ships', panel(page));
    console.log('WARN t8 ships', await warnings(panel(page)));
    await shot(page, '31-t8-ships');
    await expect(standing(panel(page), 'sourceActivated')).toHaveCount(1);
    await expect(waived(panel(page), 'speedShort')).toContainText('Allowed by: Gravity Drive');
    await expect(panel(page).getByText('Reminders for this step').first()).toBeVisible();
    // Not played: the home carries my command token from the production, so the attack waits for round 5.
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
    await expectTotals(page, { Tactic: 1 }, 'tactical 8 removed');
  });

  await step('R4: the hero Dannel of the Tenth: locked it warns, and its state cannot be set while the entry names it', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'dannel', 'Dannel of the Tenth');
    await dump('hero-locked', panel(page));
    await expect(standing(panel(page), 'componentNotHeld')).toHaveCount(1);
    await shot(page, '32-hero-locked');
    await openGroup(page, /^Faction/);
    const hero = drawer(page).getByRole('group', { name: 'Dannel of the Tenth: state' });
    // BUG (usability): the state buttons of a leader are disabled while an entry of the plan names the leader
    // (ComponentsPanel.tsx: `fixed = source !== undefined || ...`), so the "you do not hold this" warning cannot be cured from the open entry.
    await expect(hero.getByRole('button', { name: 'Unlocked' })).toBeDisabled();
    await closeDrawer(page);
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
    await openGroup(page, /^Faction/);
    await hero.getByRole('button', { name: 'Unlocked' }).click();
    await expect(hero.getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await closeDrawer(page);
  });

  await step('R4: Dannel commits three infantry to Vefut II, Sem-Lore and Mecatol Rex, and is purged', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'dannel', 'Dannel of the Tenth');
    await expect(standing(panel(page), 'componentNotHeld')).toHaveCount(0);
    const g = panel(page).getByRole('group', { name: 'Dannel of the Tenth', exact: true });
    await g.getByRole('group', { name: 'Planet 1' }).getByRole('button', { name: 'Vefut II', exact: true }).click();
    await g.getByRole('group', { name: 'Planet 2' }).getByRole('button', { name: 'Sem-Lore', exact: true }).click();
    await g.getByRole('group', { name: 'Planet 3' }).getByRole('button', { name: 'Mecatol Rex', exact: true }).click();
    await dump('hero-open', panel(page));
    console.log('WARN hero', await warnings(panel(page)));
    console.log('HERO panel', JSON.stringify(await panel(page).evaluate(e => ({ sw: e.scrollWidth, cw: e.clientWidth, st: e.scrollTop, sl: e.scrollLeft, h: e.scrollHeight, ch: e.clientHeight }))));
    console.log('HERO rows', JSON.stringify(await g.getByRole('group', { name: 'Planet 1' }).evaluate(e => ({ sw: e.scrollWidth, cw: e.clientWidth, flex: getComputedStyle(e).flexWrap, ov: getComputedStyle(e).overflowX, disp: getComputedStyle(e).display }))));
    // BUG (layout): the 35 planet buttons of each choice stand in one nowrap flex row (theme.css:229 `.segment`), 1478 px in a 363 px group;
    // choosing a far planet scrolls the whole editor sideways and the panel looks empty (33-hero.png).
    expect(await g.getByRole('group', { name: 'Planet 1' }).evaluate(e => e.scrollWidth > e.clientWidth * 2)).toBe(true);
    await shot(page, '33-hero');
    await done(page);
    await dump('map20-after-hero', tile(page, 20));
    await expect(tile(page, 20).getByRole('img', { name: 'Infantry ×5' })).toBeVisible();
    await dump('map112-after-hero', tile(page, 112));
    await openGroup(page, /^Faction/);
    await dump('faction-after-hero', drawer(page));
    await expect(drawer(page).getByRole('group', { name: 'Dannel of the Tenth: state' }).getByRole('button', { name: 'Purged' })).toHaveAttribute('aria-pressed', 'true');
    await closeDrawer(page);
    // The card is gone: a second use warns.
    await addAction(page, 'Component action');
    await choose(page, 'dannel', 'Dannel of the Tenth');
    console.log('WARN hero 2', await warnings(panel(page)));
    await expect(standing(panel(page), 'componentNotHeld')).toHaveCount(1);
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await step('R4: Mining Initiative (a component action) gives trade goods equal to the resources of Sem-Lore', async () => {
    const before = await totals(page);
    console.log('TOTALS before mining', JSON.stringify(before));
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await dump('mining', panel(page));
    const g = panel(page).getByRole('group', { name: 'Mining Initiative', exact: true });
    await g.getByRole('button', { name: 'Sem-Lore', exact: true }).click();
    console.log('WARN mining', await warnings(panel(page)));
    await done(page);
    // Sem-Lore gives 3 resources (3/2): +3 trade goods.
    await expectTotals(page, { 'Trade goods': before['Trade goods'] + 3 }, 'mining initiative +3');
    // the card has left the hand
    await openGroup(page, /^Cards/);
    await dump('cards-after-mining', drawer(page));
    await expect(drawer(page).getByRole('button', { name: /^Mining Initiative/ })).toHaveCount(0);
    await closeDrawer(page);
  });

  await step('R4: Rally and Sabotage are named in Used of a pass; the breakthrough Yin Ascendant is taken', async () => {
    await addAction(page, 'Pass');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await dump('used-picker2', picker(page));
    await choose(page, 'sabotage', 'Sabotage');
    await dump('pass-sabotage', panel(page));
    console.log('WARN sabotage used', await warnings(panel(page)));
    // The "Took" picker has no breakthroughs at all (HELD_KINDS = HOLDING_FIELD kinds, no `breakthrough`).
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('yin ascendant');
    // BUG: a breakthrough cannot be taken in an entry: Took finds nothing.
    await expect(picker(page).getByText('Nothing found.')).toBeVisible();
    await picker(page).getByRole('button', { name: 'Close' }).click();
    await done(page);
    await openGroup(page, /^Faction/);
    await dump('faction-bt0', drawer(page));
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('ascendant');
    await dump('faction-bt-search', drawer(page));
    await drawer(page).getByRole('button', { name: 'Add Yin Ascendant' }).click();
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await dump('faction-bt-added', drawer(page));
    await shot(page, '35-faction-bt');
    await closeDrawer(page);
    // Now it can be named in Used / as a component action: a hint in the status step.
    await addAction(page, 'Component action');
    await choose(page, 'yin ascendant', 'Yin Ascendant');
    await dump('bt-action', panel(page));
    console.log('WARN bt action', await warnings(panel(page)));
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await step('R4: the status phase scores Diversify Research with two yellow and two blue technologies', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'diversify', 'Diversify Research');
    await dump('score-diversify', panel(page));
    console.log('WARN score', await warnings(panel(page)));
    await dump('status4', panel(page));
    await shot(page, '36-status4');
  });

  await step('R4 status: VP, the hint of the breakthrough, two tokens, round 5 begins', async () => {
    // Scoring an objective does not raise the VP: the point is entered with the stepper of the round (NOTE: by design, probably).
    await expectTotals(page, { VP: 1 }, 'relic 1, the objective alone adds no point');
    await panel(page).getByRole('group', { name: 'Yin', exact: true }).getByRole('button', { name: 'Add one Yin' }).click();
    await expectTotals(page, { VP: 2 }, 'relic 1 + Diversify Research 1');
    await dump('status4-hint', panel(page));
    console.log('STATUS has bt hint', await panel(page).getByText(/Yin Ascendant|alliance ability/).count());
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    await tokens.getByRole('button', { name: 'Add one Strategy' }).click();
    await tokens.getByRole('button', { name: 'Add one Fleet' }).click();
    await expect(tokens).toContainText('Distribute tokens: 0 left');
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    console.log('TOTALS end r4', JSON.stringify(await totals(page)));
    await expectTotals(page, { VP: 2, Strategy: 1, Fleet: 5 }, 'end r4');
    await page.getByRole('button', { name: 'Add round' }).click();
    console.log('TOTALS start r5', JSON.stringify(await totals(page)));
    await shot(page, '37-round5');
  });

  await step('R5: Imperial as main; the primary gives a point for Mecatol Rex', async () => {
    for (const n of [3, 39, 78, 20, 62, 112]) await dump('r5start-tile' + n, tile(page, n));
    const imp = page.getByRole('button', { name: '8 Imperial' });
    await imp.click(); await imp.click(); await imp.click();
    await expect(page.getByText('Main: 8 Imperial')).toBeVisible();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Imperial · primary ability' })).toBeVisible();
    await dump('imperial', panel(page));
    console.log('WARN imperial', await warnings(panel(page)));
    console.log('TOTALS imperial', JSON.stringify(await totals(page)));
    await shot(page, '38-imperial');
  });

  await step('R5 tactical 9: both fleets go to 78; the Titans are destroyed there; Impulse Core and Devotion are hinted', async () => {
    await done(page);
    await expectTotals(page, { VP: 3, Strategy: 1 }, 'imperial primary is free on my card');
    await addAction(page, 'Tactical action');
    await tapTile(page, 78);
    await tapTile(page, 39);
    await tapTile(page, 78);
    await expect(page.getByText(/^Flight Wormhole/)).toBeVisible();
    await take(panel(page), 'Carrier');
    await take(panel(page), 'Fighter', 2);
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: 'Add source' }).click();
    await page.waitForTimeout(1000);
    await tapTile(page, 3);
    await tapTile(page, 39);
    await tapTile(page, 78);
    await take(panel(page), 'Flagship');
    await take(panel(page), 'Destroyer', 2);
    await dump('t9-route2', panel(page));
    console.log('WARN t9 route', await warnings(panel(page)));
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t9-after-fly', panel(page));
    console.log('WARN t9 fly', await warnings(panel(page)));
    await shot(page, '39-t9');
  });

  await step('R5 tactical 9: the battle at 78, losses, then the entry is done', async () => {
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await dump('t9-battle', stage(page));
    await shot(page, '40-t9-battle');
    // Impulse Core and Devotion: two of my destroyers die for two hits; the Titans lose everything.
    await stage(page).getByRole('button', { name: 'Destroyer ×2', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Destroyer ×1', exact: true }).click();
    for (const b of [/^Cruiser ×2 \(The Titans/, /^Cruiser ×1 \(The Titans/, /^Dreadnought ×1 \(The Titans/, /^Fighter ×1 \(The Titans/]) await stage(page).getByRole('button', { name: b }).click();
    await dump('t9-battle-after', stage(page));
    await shot(page, '41-t9-battle-after');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t9-after-battle', panel(page));
    console.log('WARN t9 battle', await warnings(panel(page)));
    await done(page);
    await dump('map78-after-t9', tile(page, 78));
    await expect(tile(page, 78).getByRole('img', { name: 'Flagship ×1' })).toBeVisible();
    await expect(tile(page, 78).getByRole('img', { name: /Cruiser/ })).toHaveCount(0);
    await expectTotals(page, { Tactic: 0 }, 'after t9');
  });

  await step('R5: Technology secondary researches the unit upgrade Carrier II (two blue prerequisites)', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Technology · secondary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'carrier ii', 'Carrier II');
    await dump('carrier2', panel(page));
    console.log('WARN carrier2', await warnings(panel(page)));
    console.log('TOTALS carrier2', JSON.stringify(await totals(page)));
    await shot(page, '42-carrier2');
    await expect(standing(panel(page), 'prerequisitesMissing')).toHaveCount(0);
    await done(page);
  });

  await step('R5 tactical 10: no token is left; the dock builds a carrier and infantry past its production value', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 3);
    await expect(panel(page).getByText('Tactic tokens: 0 → -1')).toBeVisible();
    await dump('t10-start', panel(page));
    console.log('WARN t10 start', await warnings(panel(page)));
    await shot(page, '43-t10-no-token');
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = stage(page);
    await shop.getByRole('group', { name: 'Space' }).getByRole('button', { name: 'Carrier', exact: true }).click();
    for (let i = 0; i < 6; i++) await shop.getByRole('group', { name: 'Darien' }).getByRole('button', { name: 'Infantry', exact: true }).click();
    await dump('shop5', shop);
    await shot(page, '44-shop5');
    await shop.getByRole('button', { name: 'Close' }).click();
    await dump('t10-after-shop', panel(page));
    console.log('WARN t10', await warnings(panel(page)));
    console.log('TOTALS t10', JSON.stringify(await totals(page)));
  });

  await step('R5: the dock entry is done; a manual adjustment takes action cards past the hand limit of 7', async () => {
    await done(page);
    await expect(tile(page, 3).getByRole('img', { name: 'Carrier ×1' })).toBeVisible();
    await expect(tile(page, 3).getByRole('img', { name: 'Infantry ×11' })).toBeVisible();
    await addAction(page, 'Manual adjustment');
    const taken = panel(page).getByRole('group', { name: 'With this entry' });
    for (const [q, n] of [['reparations', 'Reparations'], ['unexpected action', 'Unexpected Action'], ['economic initiative', 'Economic Initiative'], ['bribery', 'Bribery'], ['veto', 'Veto'], ['plague', 'Plague'], ['parley', 'Parley']] as const) {
      await taken.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await dump('manual-hand', panel(page));
    console.log('WARN hand', await warnings(panel(page)));
    await shot(page, '45-hand-limit');
    await openGroup(page, /^Cards/);
    await dump('cards-hand', drawer(page));
    await closeDrawer(page);
  });

  await step('R5: pass, the status phase, and a law in the agenda phase (Fleet Regulations, for): 5 fleet tokens are over its 4', async () => {
    await done(page);
    await addAction(page, 'Pass');
    await done(page);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    console.log('TOTALS status5', JSON.stringify(await totals(page)));
    const agendas = panel(page).getByRole('region', { name: 'Agenda' });
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'fleet regulations', 'Fleet Regulations');
    await dump('agenda1', panel(page));
    console.log('WARN agenda', await warnings(panel(page)));
    await shot(page, '46-agenda');
    await panel(page).getByRole('button', { name: 'For', exact: true }).click().catch(e => console.log('no For button', String(e).slice(0, 120)));
    await dump('agenda2', panel(page));
    console.log('WARN agenda2', await warnings(panel(page)));
    console.log('TOTALS agenda', JSON.stringify(await totals(page)));
  });

  await step('Two plan tabs: copy the plan, change the copy, the tabs do not affect each other', async () => {
    const tabs = page.getByRole('tablist', { name: 'Plans' });
    const before = await totals(page);
    console.log('TOTALS plan1', JSON.stringify(before));
    await tabs.getByRole('button', { name: 'Copy' }).click();
    await expect(tabs.getByRole('tab')).toHaveCount(2);
    await shot(page, '47-two-tabs');
    await page.screenshot({ path: SHOTS + '/47-topbar.png', clip: { x: 56, y: 0, width: 760, height: 60 } });
    // BUG (layout): at 1180 px the strip of plan tabs is 65 px wide (theme.css:458 `flex: 1 1 0`): only Copy and a sliver of the tabs show (47-topbar.png).
    expect((await tabs.boundingBox())!.width).toBeLessThan(100);
    console.log('TABBOX', JSON.stringify(await tabs.boundingBox()), JSON.stringify(await tabs.getByRole('tab').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [e.textContent, Math.round(r.x), Math.round(r.width)]; }))), JSON.stringify(await page.locator('.plan-top').evaluate(e => [e.scrollWidth, e.clientWidth])));
    console.log('tabs', await tabs.getByRole('tab').allInnerTexts());
    const copy = tabs.getByRole('tab', { selected: true });
    await expect(copy).toContainText('Plan 2');
    // the copy starts equal
    expect(await totals(page)).toEqual(before);
    await expect(page.getByText('Main: 8 Imperial')).toBeVisible();
    // change the copy in round 5: Imperial is no longer the main card, and the Imperial entry goes
    await panel(page).getByRole('listitem', { name: 'Strategy: Imperial' }).getByRole('button', { name: 'Delete' }).click();
    await dump('plan2-after-delete', panel(page));
    await expectTotals(page, { VP: 2 }, 'the copy lost the Imperial point');
    // the first plan is untouched
    await tabs.getByRole('tab', { name: /Plan 1/ }).click();
    await expect(tabs.getByRole('tab', { selected: true })).toContainText('Plan 1');
    await expectTotals(page, before, 'plan 1 as it was');
    await expect(panel(page).getByRole('listitem', { name: 'Strategy: Imperial' })).toHaveCount(1);
    // change the first plan: a new pass in round 5 is not in the copy; the tactic pool changes
    await tabs.getByRole('tab', { name: /Plan 2/ }).click();
    await expect(panel(page).getByRole('listitem', { name: 'Strategy: Imperial' })).toHaveCount(0);
    await expectTotals(page, { VP: 2 }, 'copy still lost the point');
    await tabs.getByRole('tab', { name: /Plan 1/ }).click();
    const t1 = await totals(page);
    // an edit of plan 1: a manual entry of one trade good, which the copy does not have
    await addAction(page, 'Manual adjustment');
    await panel(page).getByRole('group', { name: 'Trade goods' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    await done(page);
    await expectTotals(page, { 'Trade goods': t1['Trade goods'] + 1 }, 'plan 1 gains a trade good');
    await tabs.getByRole('tab', { name: /Plan 2/ }).click();
    await expectTotals(page, { VP: 2, 'Trade goods': t1['Trade goods'] }, 'plan 2 unaffected by the entry of plan 1');
    await tabs.getByRole('tab', { name: /Plan 1/ }).click();
    await expectTotals(page, { VP: 3, 'Trade goods': t1['Trade goods'] + 1 }, 'plan 1 again');
    await shot(page, '48-plan1-again');
  });

  await step('R5 is done, round 6 begins; Leadership as main gives three tokens', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    const start = await totals(page);
    console.log('TOTALS r6 start', JSON.stringify(start));
    const lead = page.getByRole('button', { name: '1 Leadership' });
    await lead.click(); await lead.click(); await lead.click();
    await expect(page.getByText('Main: 1 Leadership')).toBeVisible();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Leadership · primary ability' })).toBeVisible();
    await dump('leadership', panel(page));
    console.log('WARN leadership', await warnings(panel(page)));
    console.log('TOTALS leadership', JSON.stringify(await totals(page)));
    await shot(page, '49-leadership');
    const dist = panel(page).getByRole('group', { name: 'Token distribution' });
    await dist.getByRole('button', { name: 'Add one Tactic' }).click();
    await dist.getByRole('button', { name: 'Add one Tactic' }).click();
    await dist.getByRole('button', { name: 'Add one Strategy' }).click();
    await expect(dist).toContainText('Distribute tokens: 0 left');
    await expectTotals(page, { Tactic: 3, Strategy: 1, Influence: start.Influence }, 'three free tokens');
    // a fourth token costs 3 influence
    await dist.getByRole('button', { name: 'Add one Strategy' }).click();
    await dump('leadership2', panel(page));
    console.log('WARN leadership2', await warnings(panel(page)));
    console.log('TOTALS leadership2', JSON.stringify(await totals(page)));
    await shot(page, '50-leadership2');
  });

  await step('R6 tactical 11: the Carrier II carries six infantry (capacity 6) three steps to Mecatol Rex (move 2 + Gravity Drive)', async () => {
    await done(page);
    await addAction(page, 'Tactical action');
    await tapTile(page, 112);
    await tapTile(page, 3);
    await tapTile(page, 39);
    await tapTile(page, 78);
    await tapTile(page, 112);
    await expect(page.getByText(/^Flight Darien/)).toBeVisible();
    await take(panel(page), 'Carrier');
    await take(panel(page), 'Infantry', 6);
    await dump('t11-cargo6', panel(page));
    console.log('WARN t11 cargo6', await warnings(panel(page)));
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 6 of 6' })).toBeVisible();
    await take(panel(page), 'Infantry', 1);
    await dump('t11-cargo7', panel(page));
    console.log('WARN t11 cargo7', await warnings(panel(page)));
    await shot(page, '51-t11-cargo7');
  });

  await step('R6 tactical 11: the seventh infantry is returned, the carrier flies and six infantry land on Mecatol Rex', async () => {
    await panel(page).getByRole('button', { name: 'Return one Infantry' }).first().click();
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 6 of 6' })).toBeVisible();
    await expect(standing(panel(page), 'capacityGroup')).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await landOn(panel(page), 'Infantry', 6);
    await dump('t11-landed', panel(page));
    console.log('WARN t11 landed', await warnings(panel(page)));
    await done(page);
    await dump('map112-after-t11', tile(page, 112));
    await expect(tile(page, 112).getByRole('img', { name: 'Infantry ×7' })).toBeVisible();
    await expectTotals(page, { Tactic: 2 }, 'after t11');
  });

  await step('R6: Technology secondary: War Sun is owned by nobody, so Brother Omar does not lift its missing prerequisites', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'war sun', 'War Sun');
    await dump('warsun', panel(page));
    console.log('WARN warsun', await warnings(panel(page)));
    await shot(page, '52-warsun');
    await expect(standing(panel(page), 'prerequisitesMissing')).toHaveCount(1);
    await expect(waived(panel(page), 'prerequisitesMissing')).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Remove War Sun' }).click();
    await expect(standing(panel(page), 'prerequisitesMissing')).toHaveCount(0);
    // Dreadnought II instead (two blue and one yellow, which I hold): nothing is missing.
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'dreadnought ii', 'Dreadnought II');
    console.log('WARN dread2', await warnings(panel(page)));
    await expect(standing(panel(page), 'prerequisitesMissing')).toHaveCount(0);
    await dump('dread2', panel(page));
    await done(page);
    await expectTotals(page, { Strategy: 1 }, 'the secondary took a token');
  });

  await step('R6 setup and tactical 12: a Hacan cruiser stands at 78; my flagship is a loss: its ability is not applied', async () => {
    await tile(page, 78).click();
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Hacan' }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 78);
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await stage(page).getByRole('button', { name: 'Flagship ×1', exact: true }).click();
    await stage(page).getByRole('button', { name: /^Cruiser ×1 \(The Emirates of Hacan/ }).click();
    await dump('t12-battle', stage(page));
    await shot(page, '53-t12-flagship-lost');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t12-after', panel(page));
    console.log('WARN t12', await warnings(panel(page)));
    await done(page);
    await dump('map78-after-t12', tile(page, 78));
    // The rule of Van Hauge (destroy all ships in the system) is not applied or hinted: the carrier and fighters stay.
    await expect(tile(page, 78).getByRole('img', { name: 'Carrier ×1' })).toBeVisible();
  });

  await step('R6 status: two fleet tokens break the 4 of Fleet Regulations (a law in force); everything is checked off, Now equals Forecast', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    await tokens.getByRole('button', { name: 'Add one Fleet' }).click();
    await tokens.getByRole('button', { name: 'Add one Fleet' }).click();
    await dump('status6', panel(page));
    console.log('WARN status6', await warnings(panel(page)));
    await shot(page, '54-status6');
    await expect(standing(panel(page), 'fleetPoolTokens')).toHaveCount(1);
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    const fc = await totals(page);
    console.log('TOTALS end r6', JSON.stringify(fc));
    await page.getByRole('button', { name: 'Now', exact: true }).click();
    await expectNow(page, { Fleet: fc.Fleet, VP: fc.VP, Tactic: fc.Tactic, 'Trade goods': fc['Trade goods'] }, 'now = forecast when all is done');
    await page.getByRole('button', { name: 'Forecast', exact: true }).click();
    await shot(page, '55-end');
    expect(fc.Fleet).toBe(7);
  });

  // STEPS-HERE

  if (RAW.size) console.log('RAW KEYS', [...RAW]);
  expect(errors, 'console errors').toEqual([]);
});
