import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * One long game of the Council Keleres (Mentak), seven players, Prophecy of Kings and Thunder's Edge on.
 * Findings are kept as steps that assert the actual behaviour, marked `// BUG:`.
 */
const SHOTS = 'test-results/scenarios/keleresm';
const MAP = '19 20 21 22 23 24 25 26 27 28 29 30 86A0 31 32 33 34 35 36 37 38 39 40 41 42 43 88A0 44 87A0 45 46 47 48 49 50 59 2 60 61 1 62 63 16 64 65 10 66 83A0 85A0 84A0 67 55 68 69 56 70 71 92 72 73';

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const stage = (page: Page) => page.locator('.stage-dialog');
const summary = (page: Page, name: string) => page.getByRole('group', { name: 'Totals, now and forecast' }).getByRole('group', { name, exact: true });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });
const done = (page: Page) => panel(page).getByRole('button', { name: 'Done', exact: true });

const problems: string[] = [];
let shotNo = 0;
async function shot(page: Page, name: string): Promise<void> {
  shotNo += 1;
  await page.screenshot({ path: `${SHOTS}/${String(shotNo).padStart(2, '0')}-${name}.png` });
}
async function dump(label: string, target: Locator, max = 3000): Promise<string> {
  const text = (await target.innerText()).replace(/\s+/g, ' ').trim();
  if (process.env.DUMP) console.log(`DUMP ${label}: ${text.slice(0, max)}`);
  return text;
}
async function closeDrawer(page: Page): Promise<void> {
  await page.locator('.tab-fan > button[aria-pressed="true"]').first().click();
  await expect(drawer(page)).toHaveCount(0);
}
async function openGroup(page: Page, name: RegExp): Promise<void> {
  if (await drawer(page).count() === 0) await page.getByRole('button', { name: /^Components/ }).click();
  await expect(drawer(page)).toBeVisible();
  if ((await groupTab(page, name).getAttribute('aria-pressed')) !== 'true') await groupTab(page, name).click();
  await expect(groupTab(page, name)).toHaveAttribute('aria-pressed', 'true');
}
async function total(page: Page, name: string): Promise<number> {
  const text = (await summary(page, name).innerText()).replace(/\s+/g, ' ').trim();
  const m = text.match(/(-?\d+)\s*$/);
  if (!m) throw new Error(`no number in ${name}: ${text}`);
  return Number(m[1]);
}
async function totals(page: Page): Promise<Record<string, number>> {
  await expect(page.locator('.summary-forecast-leaving')).toHaveCount(0);
  const out: Record<string, number> = {};
  for (const n of ['Resources', 'Influence', 'Trade goods', 'Commodities', 'Tactic', 'Fleet', 'Strategy', 'VP']) out[n] = await total(page, n);
  return out;
}
async function setMode(page: Page, mode: 'Forecast' | 'Now'): Promise<void> {
  await page.getByRole('group', { name: 'The map shows' }).getByRole('button', { name: mode, exact: true }).click();
}
async function still(target: Locator): Promise<{ x: number; y: number }> {
  let last = '';
  await expect.poll(async () => {
    const now = JSON.stringify(await target.boundingBox());
    const same = now === last;
    last = now;
    return same;
  }, { intervals: [150] }).toBe(true);
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function tapTile(page: Page, n: number): Promise<void> {
  await still(tile(page, n));
  await tile(page, n).click();
}
async function dragRoute(page: Page, hexes: number[]): Promise<void> {
  const points = [];
  for (const n of hexes) points.push(await still(tile(page, n)));
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

test.describe.configure({ mode: 'serial' });

test('keleresm: the whole game', async ({ page }) => {
  for (const f of (await import('node:fs')).readdirSync(SHOTS)) if (f.endsWith('.png')) (await import('node:fs')).unlinkSync(`${SHOTS}/${f}`);
  test.setTimeout(540_000);
  page.setDefaultTimeout(10_000);
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');

  await test.step('create the game on the first screen', async () => {
    await page.getByRole('button', { name: 'Add opponent' }).click();
    const rivals = ['The Council Keleres - Mentak', 'The Federation of Sol', 'The Emirates of Hacan', 'The Barony of Letnev', 'The Titans of Ul', 'The Empyrean', 'Last Bastion'];
    for (let i = 0; i < 7; i += 1) {
      await page.getByRole('group', { name: `Player ${i + 1}` }).getByRole('button').first().click();
      await page.getByRole('button', { name: rivals[i], exact: true }).click();
    }
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('textbox', { name: 'Game name' }).fill('Keleres long');
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    await dump('after-map', page.locator('.players-aside'), 700);
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 2)).toBeVisible();
    await shot(page, 'start');
    await shot(page, 'start');
  });

  await test.step('s1: the starting technologies of the Tribunii are added in the components drawer', async () => {
    await openGroup(page, /^Technologies/);
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('sarween');
    const results = drawer(page).getByRole('group', { name: 'Search results' });
    await dump('search', results);
    await results.getByRole('button', { name: 'Add Sarween Tools' }).click();
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('plasma scoring');
    await results.getByRole('button', { name: 'Add Plasma Scoring' }).click();
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('');
    await dump('techs', drawer(page).getByRole('group', { name: 'Researched technologies' }));
    await shot(page, 'start-techs');
    await closeDrawer(page);
    console.log(JSON.stringify(await totals(page)));
  });

  await test.step('r1-e1: Technology, primary: Scanlink Drone Network free, Executive Order for 6 resources over the 4 I have', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'scanlink', 'Scanlink Drone Network');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'executive order', 'Executive Order');
    await dump('after-research', panel(page), 4000);
    await shot(page, 'tech-1');
  });

  await test.step('r1-e1b: the agent lets the second trade good be a commodity; the payment still warns', async () => {
    const pay = panel(page).getByRole('group', { name: 'Payment' });
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'xander', 'Xander Alexin Victori III');
    await pay.getByRole('button', { name: 'Choose manually' }).click();
    await pay.getByRole('button', { name: 'Add one trade good' }).click();
    await expect(pay).toContainText('Cost 6, paid 6');
    // BUG: the agent spends the commodity (Commodities 2 -> 1) and the header says paid 6, but the list still warns of resources "need 6, paid 5" (payment.ts: applyPayment caps the trade goods at those held).
    await expect(pay).toContainText('Not enough resources: need 6, paid 5, short by 1');
    await expect(pay).toContainText('Allowed by: Xander Alexin Victori III');
    await shot(page, 'tech-agent');
    await done(page).click();
    expect(await totals(page)).toMatchObject({ Resources: 0, 'Trade goods': 0, Commodities: 1, Strategy: 2, Tactic: 3 });
  });

  await test.step('r1-setup: two infantry of mine on Perimeter (60), two Letnev destroyers in Arnor/Lor (36)', async () => {
    await tapTile(page, 60);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await tapTile(page, 36);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Let' }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(tile(page, 36).getByRole('img', { name: /Destroyer ×2.*Letnev/ })).toBeVisible();
  });

  await test.step('r1-e2: tactical action on 36: the whole home fleet and two infantry; battle; two landings', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 36);
    await expect(page.getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await dragRoute(page, [2, 36]);
    for (const u of ['Carrier', 'Carrier', 'Cruiser', 'Fighter', 'Fighter', 'Infantry', 'Infantry']) await page.getByRole('button', { name: `Take one ${u}` }).click();
    await expect(panel(page).getByText('Cargo on board: 4 of 8')).toBeVisible();
    await page.getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await stage(page).getByRole('button', { name: 'Fighter ×2' }).click();
    await stage(page).getByRole('button', { name: /^Destroyer ×2 [(]The Barony of Letnev[)]/ }).click();
    await stage(page).getByRole('button', { name: /^Destroyer ×1 [(]The Barony of Letnev[)]/ }).click();
    await shot(page, 'battle');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Arnor' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Lor' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('before-done', panel(page), 3000);
    await shot(page, 'landed');
    await done(page).click();
    await expect(tile(page, 36).getByRole('img', { name: /Destroyer/ })).toHaveCount(0);
    await expect(tile(page, 36).getByRole('img', { name: 'Fighter ×1' })).toBeVisible();
    await expect(tile(page, 36).getByRole('group', { name: /Arnor: 2[/]1.*yours/ })).toBeVisible();
    console.log(JSON.stringify(await totals(page)));
  });
  await test.step('r1-e3: tactical action on the home system: the shop builds over the production limit, the fleet pool and the resources', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 2);
    await expect(page.getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await page.getByRole('button', { name: /^Production/ }).click();
    console.log('BTNS', JSON.stringify(await stage(page).getByRole('button').evaluateAll(b => b.map(x => x.getAttribute('aria-label') ?? x.textContent))));
    await shot(page, 'shop-empty');
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Mech', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Mech', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await dump('shop', stage(page), 3000);
    await shot(page, 'shop-over');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('after-shop', panel(page), 4000);
    await shot(page, 'after-shop');
    await done(page).click();
    console.log(JSON.stringify(await totals(page)));
  });

  await test.step('r1-e4: component action: Executive Order (hint, exhausted by the action); a second use warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'executive order', 'Executive Order');
    await dump('exec-order', panel(page), 3000);
    await shot(page, 'exec-order');
    await done(page).click();
    await addAction(page, 'Component action');
    await choose(page, 'executive order', 'Executive Order');
    await dump('exec-order-2', panel(page), 3000);
    await shot(page, 'exec-order-2');
    await done(page).click();
  });
  await test.step('r1-e5: pass with a transaction: the faction promissory note Keleres Rider and a commodity to Sol (not a neighbour)', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sol' }).click();
    await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: '+ Component' }).click();
    await dump('picker', picker(page), 1500);
    await choose(page, 'keleres rider', 'Keleres Rider');
    await dump('transaction', panel(page), 4000);
    await shot(page, 'transaction');
    console.log(JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page).click();
    await openGroup(page, /^Cards/);
    await dump('cards', drawer(page), 2500);
    await shot(page, 'cards-after-deal');
    await drawer(page).getByRole('button', { name: 'Sol', exact: true }).click();
    await dump('cards-sol', drawer(page), 2500);
    await shot(page, 'cards-sol');
    await closeDrawer(page);
  });
  await test.step('r1-e6: status phase: two command tokens, an action card, the objective is scored without its requirement', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Strategy' }).click();
    await expect(status).toContainText('Distribute tokens: 0 left');
    await dump('status', panel(page), 4000);
    await shot(page, 'status-1');
    await status.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'mining initiative', 'Mining Initiative');
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'expand borders', 'Expand Borders');
    await dump('status-scored', panel(page), 4000);
    await shot(page, 'status-1b');
    expect(await totals(page)).toMatchObject({ Tactic: 2, Strategy: 3, Fleet: 3 });
  });

  await test.step('round 2 begins: the planets are ready, the agent too', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    console.log(JSON.stringify(await totals(page)));
    await shot(page, 'round2');
  });
  await test.step('r2-e1: Trade, primary (my card): Council Patronage and the card give 1 + 3 trade goods; commodities are 2', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '5 Trade' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await dump('trade', panel(page), 3000);
    await shot(page, 'r2-trade');
    console.log('TRADE', JSON.stringify(await totals(page)));
    await done(page).click();
    console.log('TRADE-done', JSON.stringify(await totals(page)));
  });

  await test.step('r2-e2: Technology, secondary (a rival chose it): one strategy token and 4 resources for Gravity Drive', async () => {
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Technology · secondary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'gravity drive', 'Gravity Drive');
    await dump('tech2', panel(page), 3000);
    await done(page).click();
    console.log('TECH2-done', JSON.stringify(await totals(page)));
  });

  await test.step('r2-e3: component action: Mining Initiative on Arnor', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await dump('mining', panel(page), 3000);
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Arnor' }).click();
    await shot(page, 'mining');
    await done(page).click();
    console.log('MINING-done', JSON.stringify(await totals(page)));
  });
  await test.step('r2-e4: tactical action on Ang (61): the flagship flies two systems with Gravity Drive and picks up the two infantry on Perimeter on the way', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 61);
    await expect(page.getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await dragRoute(page, [2, 60, 61]);
    await page.getByRole('button', { name: 'Take one Flagship' }).click();
    await panel(page).getByRole('group', { name: 'Perimeter' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Perimeter' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await page.getByRole('button', { name: 'Take one Mech' }).click();
    await dump('fly', panel(page), 3000);
    console.log('SPEED', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await shot(page, 'flagship-route');
    await page.getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Ang' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Ang' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Ang' }).getByRole('button', { name: 'Land one Mech' }).click();
    await dump('landing', panel(page), 3000);
    await shot(page, 'ang-landing');
    console.log('LAND', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await done(page).click();
    console.log('E4', JSON.stringify(await totals(page)));
  });
  await test.step('r2-sol: Sol (expected) lands on Moll Primus where my mech stands: Omniopiares asks it for influence', async () => {
    await tapTile(page, 73);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    console.log('BTNS73', JSON.stringify(await stage(page).getByRole('button').evaluateAll(b => b.map(x => x.getAttribute('aria-label') ?? x.textContent))));
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    await stage(page).getByRole('button', { name: 'Carrier', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Sol' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 2);
    await dragRoute(page, [73, 2]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await dump('sol-route', panel(page), 3000);
    await page.getByRole('button', { name: 'Take one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Take one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Moll Primus' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Moll Primus' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('sol-act', panel(page), 3500);
    await shot(page, 'sol-act');
    console.log('SOLWARN', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
  });
  await test.step('r2-sol-done', async () => {
    console.log('SOLWARN0', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.textContent]))));
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await stage(page).getByRole('button', { name: /^Infantry ×2 [(]The Federation of Sol[)]/ }).click();
    await stage(page).getByRole('button', { name: /^Infantry ×1 [(]The Federation of Sol[)]/ }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    console.log('SOLWARN1', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.textContent]))));
    await dump('sol-after-ground', panel(page), 3500);
    await done(page).click();
    console.log('T2', JSON.stringify(await tile(page, 2).getByRole('group').evaluateAll(els => els.map(e => e.getAttribute('aria-label')))), JSON.stringify(await tile(page, 2).getByRole('img').evaluateAll(els => els.map(e => e.getAttribute('aria-label')))));
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine' }).click();
  });
  await test.step('r2-e5: component action: Executive Order is ready again; the ability Laws Order is named in Used; seven action cards are taken', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'executive order', 'Executive Order');
    await expect(panel(page).locator('li[data-code="componentExhausted"]')).toHaveCount(0);
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, "law's order", "Law's Order");
    const taken = panel(page).getByRole('group', { name: 'In this turn' }).getByRole('group', { name: 'Taken and discarded' });
    for (const [q, n] of [['industrial initiative', 'Industrial Initiative'], ['economic initiative', 'Economic Initiative'], ['rise of a messiah', 'Rise of a Messiah'], ['focused research', 'Focused Research'], ['uprising', 'Uprising'], ['upgrade', 'Upgrade'], ['scuttle', 'Scuttle']] as const) {
      await taken.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await dump('cards7', panel(page), 4000);
    console.log('E5W', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await shot(page, 'r2-cards');
    await done(page).click();
    console.log('E5', JSON.stringify(await totals(page)));
  });
  await test.step('r2-e6: component action: Rise of a Messiah puts an infantry on each planet I control', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'rise of a messiah', 'Rise of a Messiah');
    await dump('messiah', panel(page), 3000);
    await shot(page, 'messiah');
    console.log('E6W', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await done(page).click();
    for (const n of [2, 36, 61]) console.log('UNITS', n, JSON.stringify(await tile(page, n).getByRole('img').evaluateAll(els => els.map(e => e.getAttribute('aria-label')))));
  });

  await test.step('r2-e7: component action: Focused Research spends 4 trade goods for Neural Motivator', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'focused research', 'Focused Research');
    await dump('focused', panel(page), 3000);
    await shot(page, 'focused');
    const grp = panel(page).getByRole('group', { name: 'Focused Research' });
    // BUG: the technology list of Focused Research is squeezed into one clipped horizontal row, and lists the replaced PoK technology as the raw id technology:iihq (actionCard/f_researched.ts options are not filtered by the catalog).
    await expect(grp).toContainText('technology:iihq');
    console.log('FRHTML', (await grp.evaluate(e => e.outerHTML)).slice(0, 1200));
    console.log('FRBOX', JSON.stringify(await grp.evaluate(e => ({ sw: e.scrollWidth, cw: e.clientWidth, ox: getComputedStyle(e).overflowX, first: e.firstElementChild?.tagName + '.' + e.firstElementChild?.className, n: e.children.length }))));
    await grp.getByRole('button', { name: 'Neural Motivator' }).click();
    console.log('FRCHAIN', JSON.stringify(await grp.evaluate(e => { const out = []; for (let p: Element | null = e; p && p !== document.body; p = p.parentElement) { const c = getComputedStyle(p); out.push([p.className, c.overflowX, p.scrollWidth, p.clientWidth, p.scrollLeft]); } return out; })));
    console.log('E7W', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await shot(page, 'focused2');
    await done(page).click();
    console.log('E7', JSON.stringify(await totals(page)));
  });
  await test.step('r2-e8: pass', async () => {
    await addAction(page, 'Pass');
    await done(page).click();
  });

  await test.step('r2-e9: status phase: tokens, three action cards (the hand goes to eight), a secret objective', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    for (const [q, n] of [['rally', 'Rally'], ['sabotage', 'Sabotage'], ['direct hit', 'Direct Hit']] as const) {
      await status.getByRole('button', { name: '+ Action card' }).click();
      await choose(page, q, n);
    }
    console.log('R2STATUS', JSON.stringify(await status.locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await dump('status2', status, 3000);
    await shot(page, 'status-2');
    console.log('R2S', JSON.stringify(await totals(page)));
  });

  await test.step('round 3 begins', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
    console.log('R3', JSON.stringify(await totals(page)));
    await shot(page, 'round3');
  });
  await test.step('r3-setup: Mecatol Rex is mine (Control), Sol stands on Wellon next to it', async () => {
    await tapTile(page, 112);
    await stage(page).getByRole('button', { name: 'Control', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Mine', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await tapTile(page, 19);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await shot(page, 'r3-setup');
  });

  await test.step('r3-e1: Imperial, primary: the point for Mecatol Rex; the breakthrough I.I.H.Q. Modernization is taken', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '8 Imperial' }).click();
    await addAction(page, 'Strategy');
    await dump('imperial', panel(page), 3000);
    console.log('R3E1a', JSON.stringify(await totals(page)));
    await dump('imperial2', panel(page), 3500);
    console.log('R3E1b', JSON.stringify(await totals(page)));
    console.log('R3E1W', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await shot(page, 'r3-imperial');
    await done(page).click();
    console.log('R3E1c', JSON.stringify(await totals(page)));
  });
  await test.step('r3-e1b: the breakthrough is added in the drawer: Custodia Vigilia comes with it', async () => {
    await openGroup(page, /^Faction/);
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('modernization');
    const results = drawer(page).getByRole('group', { name: 'Search results' });
    await page.waitForTimeout(500);
    console.log('BTRES', JSON.stringify(await results.getByRole('button').evaluateAll(b => b.map(x => x.getAttribute('aria-label')))));
    await results.getByRole('button', { name: 'Add I.I.H.Q. Modernization' }).click();
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await dump('bt-group', drawer(page), 2500);
    await shot(page, 'r3-bt');
    await closeDrawer(page);
    console.log('BT', JSON.stringify(await totals(page)));
  });
  await test.step('r3-e2: Technology, secondary: Agency Supply Network (two cybernetic prerequisites), 4 resources and a strategy token', async () => {
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'agency supply', 'Agency Supply Network');
    console.log('E2W', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await dump('asn', panel(page), 3000);
    await shot(page, 'r3-asn');
    await done(page).click();
    console.log('E2', JSON.stringify(await totals(page)));
  });

  await test.step('r3-e3: tactical action on the home system: Upgrade, Agency Supply Network as a reminder, over the production limit and the unit supply', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 2);
    await expect(page.getByText('Tactic tokens: 3 → 2')).toBeVisible();
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'upgrade', 'Upgrade');
    await dump('tac-home', panel(page), 4000);
    await page.getByRole('button', { name: /^Production/ }).click();
    await shot(page, 'r3-shop');
    await dump('shop3', stage(page), 2500);
    for (let k = 0; k < 12; k += 1) await stage(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    await dump('shop3b', stage(page), 2500);
    await shot(page, 'r3-shop-over');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('tac-home2', panel(page), 4500);
    console.log('E3W', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await shot(page, 'r3-tac-home');
  });
  await test.step('r3-e3b: the action is done; the production over limits stays in the forecast', async () => {
    await done(page).click();
    console.log('E3', JSON.stringify(await totals(page)));
  });
  await test.step('r3-f1: Faction drawer: the leaders of the Keleres', async () => {
    await openGroup(page, /^Faction/);
    await dump('faction', drawer(page), 5000);
    await shot(page, 'r3-faction');
  });
  await test.step('r3-f2: the commander and the hero are unlocked in the drawer', async () => {
    const leaders = drawer(page);
    console.log('LBTN', JSON.stringify(await leaders.getByRole('button').evaluateAll(b => b.map(x => [x.getAttribute('aria-label') ?? x.textContent, x.getAttribute('aria-pressed')]))));
    await leaders.getByRole('group', { name: /Suffi An/ }).getByRole('button', { name: 'Unlocked' }).click();
    await leaders.getByRole('group', { name: /Harka Leeds/ }).getByRole('button', { name: 'Unlocked' }).click();
    await dump('faction2', leaders, 5000);
    await shot(page, 'r3-faction2');
    await closeDrawer(page);
  });
  await test.step('r3-e4: component action: the hero Harka Leeds, three action cards with a component action are taken', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'harka', 'Harka Leeds');
    await dump('hero', panel(page), 3500);
    const taken = panel(page).getByRole('group', { name: 'In this turn' }).getByRole('group', { name: 'Taken and discarded' });
    for (const [q, n] of [['mining initiative', 'Mining Initiative'], ['rise of a messiah', 'Rise of a Messiah'], ['uprising', 'Uprising']] as const) {
      await taken.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    console.log('HEROW', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await shot(page, 'r3-hero');
    await done(page).click();
    console.log('HERO', JSON.stringify(await totals(page)));
  });
  await test.step('r3-e5: the hero is purged: a second use warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'harka', 'Harka Leeds');
    console.log('HERO2W', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await shot(page, 'r3-hero2');
    await dump('hero2', panel(page), 2500);
  });
  await test.step('r3-e5b: the empty action is removed', async () => {
    await panel(page).getByRole('button', { name: 'Done' }).click();
    console.log('E5b', JSON.stringify(await totals(page)));
  });
  await test.step('r3-e6: Technology secondary: Carrier II needs two blue prerequisites; the specialty of Ang (warfare) does not help; warns', async () => {
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'carrier ii', 'Advanced Carrier II');
    // BUG: Advanced Carrier II is a Sol faction technology; no warning says the Keleres cannot research it (LRR 90.2: only the own technology deck is owned).
    expect(await panel(page).locator('li[data-code="factionTech"]').count()).toBe(0);
    console.log('E6TW', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await dump('carrier2', panel(page), 3500);
    await shot(page, 'r3-carrier2');
    await done(page).click();
    console.log('E6T', JSON.stringify(await totals(page)));
  });
  await test.step('r3-e7: pass; status: tokens over the limit of the pool', async () => {
    await addAction(page, 'Pass');
    await done(page).click();
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    for (let i = 0; i < 4; i += 1) await status.getByRole('button', { name: 'Add one Fleet' }).click();
    for (let i = 0; i < 4; i += 1) await status.getByRole('button', { name: 'Add one Strategy' }).click();
    console.log('R3STATUS', JSON.stringify(await status.locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await dump('status3', status, 3000);
    await shot(page, 'status-3');
    console.log('R3S', JSON.stringify(await totals(page)));
  });
  await test.step('round 4 begins; the agenda phase', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 4', exact: true })).toHaveAttribute('aria-pressed', 'true');
    // BUG: an empty round does not apply Council Patronage (+1 trade good at the start of the strategy phase; LRR: faction ability): Trade goods stay 0 here and become 1 only with the first entry (replay/timeline.ts:244 fires onRoundStart lazily).
    expect((await totals(page))['Trade goods']).toBe(0);
    console.log('PBTN', JSON.stringify(await panel(page).getByRole('button').evaluateAll(b => b.map(x => x.getAttribute('aria-label') ?? x.textContent?.trim()))));
    await shot(page, 'round4');
  });
  await test.step('r4-a1: agenda phase: a law is passed (Mecatol is mine), a second one over the limit', async () => {
    await panel(page).getByRole('button', { name: '+ Agenda' }).click();
    console.log('ABTN', JSON.stringify(await panel(page).getByRole('button').evaluateAll(b => b.map(x => x.getAttribute('aria-label') ?? x.textContent?.trim()))));
    await dump('agenda', panel(page), 3000);
    await shot(page, 'r4-agenda');
  });
  await test.step('r4-a2: the law is chosen; the entry gives a point; the law stands in the drawer under Objectives and laws', async () => {
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await dump('agenda-picker', picker(page), 1200);
    await choose(page, 'fleet regulations', 'Fleet Regulations');
    await dump('agenda2', panel(page), 3000);
    await shot(page, 'r4-agenda2');
    console.log('AW', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await panel(page).getByRole('button', { name: 'Done' }).click();
    await openGroup(page, /^(Objectives|Goals)/);
    await dump('laws', drawer(page), 2500);
    await shot(page, 'r4-laws');
    await closeDrawer(page);
  });
  await test.step('r4-r1: a relic is added in the drawer', async () => {
    await openGroup(page, /^Relics/);
    await dump('relics', drawer(page), 2500);
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('crown of emphidia');
    await drawer(page).getByRole('group', { name: 'Search results' }).getByRole('button', { name: 'Add The Crown of Emphidia' }).click();
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await dump('relics2', drawer(page), 2500);
    await shot(page, 'r4-relic');
    await closeDrawer(page);
    console.log('R4relic', JSON.stringify(await totals(page)));
  });
  await test.step('r4-e1: Construction primary: a PDS on Arnor and a space dock on Lor; the second structure on a planet warns', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: '4 Construction' }).click().catch(() => {});
    await dump('constr', panel(page), 3500);
    console.log('CW', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await shot(page, 'r4-constr');
  });
  await test.step('r4-e1b: Construction secondary: the structure is placed through the map', async () => {
    await panel(page).getByRole('button', { name: 'Construction', exact: true }).click();
    await shot(page, 'r4-constr-pick');
    await tapTile(page, 36);
    const arnor = stage(page).getByRole('group', { name: /Arnor/ });
    console.log('ARN', JSON.stringify(await stage(page).getByRole('button').evaluateAll(b => b.map(x => x.getAttribute('aria-label') ?? x.textContent))));
    await stage(page).getByRole('button', { name: /PDS.*Arnor|Arnor.*PDS/ }).first().click();
    await stage(page).getByRole('button', { name: /PDS.*Arnor|Arnor.*PDS/ }).first().click();
    await shot(page, 'r4-constr3');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('constr2', panel(page), 3500);
    await shot(page, 'r4-constr2');
    console.log('CW2', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
  });
  await test.step('r4-e2: tactical action at home: 24 infantry bought (the unit supply holds 22 and I stand with 6), the Crown of Emphidia and Law\'s Order named', async () => {
    await done(page).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 2);
    await page.getByRole('button', { name: /^Production/ }).click();
    for (let k = 0; k < 24; k += 1) await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await dump('shop4', stage(page), 2500);
    await shot(page, 'r4-shop');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, "law's order", "Law's Order");
    await used.getByRole('button', { name: '+ Used' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('crown of emphidia');
    console.log('CROWN', JSON.stringify(await picker(page).getByRole('button').evaluateAll(b => b.map(x => x.textContent))));
    await picker(page).getByRole('button', { name: 'Choose The Crown of Emphidia' }).first().click();
    await dump('tac4', panel(page), 4500);
    console.log('E4W', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await shot(page, 'r4-tac');
    await done(page).click();
    console.log('R4E2', JSON.stringify(await totals(page)));
  });
  await test.step('r4-e3: five mechs bought: the reinforcements hold 4 mechs and one stands already; the warning stands in the production block', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 2);
    await page.getByRole('button', { name: /^Production/ }).click();
    for (let k = 0; k < 5; k += 1) await stage(page).getByRole('button', { name: 'Mech', exact: true }).click();
    await dump('shop5', stage(page), 2500);
    await stage(page).getByRole('button', { name: 'Close' }).click();
    console.log('E5W2', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(l => l.map(x => [x.getAttribute('data-code'), x.className, x.textContent]))));
    await shot(page, 'r4-mechs');
    await done(page).click();
  });
  await test.step('r4-e4: pass; the status phase of round 4 and the agent readies', async () => {
    await addAction(page, 'Pass');
    await done(page).click();
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await shot(page, 'status-4');
    await setMode(page, 'Now');
    console.log('R4NOW', JSON.stringify(await totals(page)));
    await setMode(page, 'Forecast');
    await shot(page, 'end');
  });
  expect(problems).toEqual([]);
});
