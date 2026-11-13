import { mkdirSync, appendFileSync, readdirSync, unlinkSync, rmSync, readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * One long game of the Last Bastion, eight players, Prophecy of Kings and Thunder's Edge on, played through the interface.
 * Seats: 1 Bastion (me), then Sol, Hacan, Argent, Nekro, Letnev, Mahact, Xxcha.
 * Findings are kept as steps that assert the actual behaviour, marked `// BUG:`.
 */
const SHOTS = 'test-results/scenarios/bastion';
// Letnev's 8-player map with the home tiles 10 (Letnev) and 92 (Last Bastion) swapped: I sit at the top seat.
const MAP = '61 40 20 21 22 19 36 33 39 23 24 28 29 30 31 32 34 38 44 79 35 37 42 43 45 46 50 59 60 62 63 64 65 66 67 41 92 27 25 1 68 69 16 70 71 58 73 74 8 75 76 10 77 78 52 80 81 14 26 72';
const RIVALS = ['Sol', 'Hacan', 'Argent', 'Nekro', 'Letnev', 'Mahact', 'Xxcha'];

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const stage = (page: Page) => page.locator('.stage-dialog');
const summary = (page: Page, name: string) => page.getByRole('group', { name: 'Totals, now and forecast' }).getByRole('group', { name, exact: true });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const groupTab = (page: Page, name: string | RegExp) => page.locator('.drawer-rail-right').getByRole('button', { name });
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
const done = (page: Page) => panel(page).getByRole('button', { name: 'Done', exact: true });

const problems: string[] = [];
let shotNo = 0;
async function shot(page: Page, name: string): Promise<void> {
  shotNo += 1;
  await page.screenshot({ path: `${SHOTS}/${String(shotNo).padStart(2, '0')}-${name}.png` });
}
function note(s: string) { appendFileSync(`${SHOTS}/notes.txt`, s + '\n'); }
const flat = (s: string) => s.split(/\r?\n/).filter(Boolean).join(' | ');

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
const open = (page: Page) => panel(page).locator('li[data-code]:not(.warning-waived)');

test.describe.configure({ mode: 'serial' });

test('bastion: the whole game', async ({ page }, testInfo) => {
  test.setTimeout(560_000);
  mkdirSync(SHOTS, { recursive: true });
  for (const old of readdirSync(SHOTS)) if (old.endsWith('.png')) unlinkSync(SHOTS + '/' + old);
  rmSync(SHOTS + '/notes.txt', { force: true });
  page.setDefaultTimeout(10_000);
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');

  await test.step('create the game on the first screen', async () => {
    await page.getByRole('button', { name: '＋ Add opponent' }).click();
    await page.getByRole('button', { name: '＋ Add opponent' }).click();
    await page.getByRole('button', { name: 'My faction', exact: true }).click();
    await page.getByRole('button', { name: /Last Bastion/ }).first().click();
    for (let i = 0; i < RIVALS.length; i += 1) {
      await page.getByRole('button', { name: 'Opponent', exact: true }).nth(i).click();
      await page.getByRole('button', { name: new RegExp(RIVALS[i]) }).first().click();
    }
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('textbox', { name: 'Game name' }).fill('Bastion long');
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText(/tiles placed/)).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByText('Chosen at setup: 1 of these').scrollIntoViewIfNeeded();
    await shot(page, 'game-screen');
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 92)).toBeVisible();
    await shot(page, 'start');
    note('START ' + JSON.stringify(await totals(page)));
  });

  await test.step('explore: components drawer', async () => {
    await page.getByRole('button', { name: /^Components/ }).click();
    await openGroup(page, /^Technologies/);
    await drawer(page).getByRole('searchbox').fill('sarween');
    await shot(page, 'drawer-search');
    await drawer(page).getByRole('button', { name: 'Add Sarween Tools' }).click();
    await drawer(page).getByRole('searchbox').fill('');
    await expect(drawer(page).getByRole('group', { name: 'Researched technologies' })).toContainText('Sarween Tools');
    await expect(groupTab(page, /^Technologies · 1/)).toBeVisible();
    await shot(page, 'drawer-sarween');
    await closeDrawer(page);
  });

  await test.step('explore: the home system in the big hex', async () => {
    await tapTile(page, 92);
    note('HOME92 ' + (await stage(page).innerText()).replace(/\n+/g, ' | '));
    await shot(page, 'home-hex');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Add action' }).click();
    note('ACTIONS ' + (await page.locator('.action-list').innerText()).replace(/\n+/g, ' | '));
    await page.keyboard.press('Escape');
  });

  const dump = async (label: string) => note(`${label}: ` + (await panel(page).innerText()).replace(/\n+/g, ' | ').slice(0, 2500));

  await test.step('e1: strategy card Trade, primary: 3 trade goods, commodities replenished to the faction value 1', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '5 Trade' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await expect(summary(page, 'Trade goods')).toHaveText(/0 → 3/);
    await expect(summary(page, 'Commodities')).toHaveText(/0 → 1/);
    await shot(page, 'trade');
    await done(page).click();
    expect(await totals(page)).toEqual({ Resources: 1, Influence: 2, 'Trade goods': 3, Commodities: 1, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 });
  });

  await test.step('e2: tactical action on 27: carrier, dreadnought and three infantry; Liberate readies New Albion (1 infantry >= 1 resource), Starpoint gets an extra infantry (2 < 3)', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 27);
    await expect(page.getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await dragRoute(page, [92, 27]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await page.getByRole('button', { name: 'Take one Dreadnought' }).click();
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: 'Take one Infantry' }).click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await dump('e2-after-fly');
    await panel(page).getByRole('group', { name: 'Landing on New Albion' }).getByRole('button', { name: 'Land one Infantry' }).click();
    for (let i = 0; i < 2; i += 1) await panel(page).getByRole('group', { name: 'Landing on Starpoint' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('e2-landed');
    await shot(page, 'e2-landed');
    await done(page).click();
    note('E2 TOTALS ' + JSON.stringify(await totals(page)));
    await tapTile(page, 27);
    note('E2 HEX27 ' + (await stage(page).innerText()).replace(/\n+/g, ' | '));
    await shot(page, 'e2-hex27');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  const labels = async (n: number) => (await tile(page, n).locator('[role="img"], [role="group"]').evaluateAll(els => els.map(e => e.getAttribute('aria-label') ?? ''))).filter(Boolean);

  await test.step('e2b: the board after the landing', async () => {
    note('LABELS27 ' + JSON.stringify(await labels(27)));
    note('LABELS92 ' + JSON.stringify(await labels(92)));
    await expect(tile(page, 27).getByRole('group', { name: /New Albion: 1\/1.*yours/ })).toBeVisible();
    await expect(tile(page, 27).getByRole('group', { name: /Starpoint: 3\/1.*yours/ })).toBeVisible();
  });

  await test.step('e3: tactical action on the home system: production in the shop', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 92);
    await expect(page.getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await page.getByRole('button', { name: /^Production/ }).click();
    note('SHOP ' + (await stage(page).innerText()).replace(/\n+/g, ' | '));
    await shot(page, 'e3-shop');
    note('SHOPBTN ' + JSON.stringify(await stage(page).getByRole('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label') || e.textContent))));
  });

  await test.step('e3b: buy a mech and an infantry on Ordinian (the planet with the dock); Sarween Tools takes 1 off the combined cost 3', async () => {
    await stage(page).getByRole('button', { name: 'Mech, Ordinian', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry, Ordinian', exact: true }).click();
    note('SHOP2 ' + flat(await stage(page).innerText()));
    await shot(page, 'e3-bought');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    note('E3PANEL ' + flat(await panel(page).innerText()));
  });

  const mismatches: string[] = [];
  const softEq = (label: string, actual: unknown, expected: unknown) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) { mismatches.push(`${label}: got ${JSON.stringify(actual)}, rules say ${JSON.stringify(expected)}`); note('MISMATCH ' + mismatches[mismatches.length - 1]); }
  };

  await test.step('e3 done: Sarween Tools should make the combined cost 2 (3 - 1), paid by the two planets, 3 trade goods left', async () => {
    softEq('e3 totals', await totals(page), { Resources: 0, Influence: 0, 'Trade goods': 3, Commodities: 1, Tactic: 1, Fleet: 3, Strategy: 2, VP: 0 });
    await done(page).click();
    await expect(tile(page, 92).getByRole('img', { name: 'Mech ×1' })).toBeVisible();
    note('E3 TOTALS ' + JSON.stringify(await totals(page)));
    await shot(page, 'e3-done');
  });

  await test.step('e4: Setup puts a Sol cruiser on 25 (next to Starpoint) so that Sol is a neighbour', async () => {
    await tapTile(page, 25);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(tile(page, 25).getByRole('img', { name: /Cruiser ×1 \(The Federation of Sol\)/ })).toBeVisible();
  });

  await test.step('e5: pass: the legendary planet card Hyperion (Ordinian) draws an action card and adds a token; the faction promissory note goes to Sol', async () => {
    await addAction(page, 'Pass');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    note('PICKER-IDS ' + flat(await picker(page).innerText()).slice(0, 600));
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('hyperion');
    await picker(page).getByRole('button', { name: /^Choose 4X41D/ }).first().click();
    note('PASS-USED ' + flat(await panel(page).innerText()));
    await shot(page, 'e5-pass-hyperion');
  });

  await test.step('e5b: Hyperion into the fleet pool; Sabotage drawn; Raise the Standard given to Sol', async () => {
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: 'Fleet pool' }).click();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'sabotage', 'Sabotage');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    note('TXN ' + flat(await panel(page).innerText()));
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sol' }).click();
    await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: '+ Component' }).click();
    note('TXNPICK ' + flat(await picker(page).innerText()).slice(0, 700));
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('raise the standard');
    await picker(page).getByRole('button', { name: /^Choose Raise the Standard/ }).first().click();
    note('TXN2 ' + flat(await panel(page).innerText()));
    await shot(page, 'e5-txn');
    softEq('e5 open warnings', await open(page).allInnerTexts(), []);
  });

  await test.step('e5c: pass done: Fleet 3 -> 4 by Hyperion; the note is in Sol\'s hands', async () => {
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page).click();
    softEq('e5 totals', await totals(page), { Resources: 0, Influence: 0, 'Trade goods': 3, Commodities: 1, Tactic: 1, Fleet: 4, Strategy: 2, VP: 0 });
    note('E5 TOTALS ' + JSON.stringify(await totals(page)));
    await openGroup(page, /^Cards/);
    note('CARDS-AFTER-E5 ' + flat(await drawer(page).innerText()).slice(0, 1200));
    await shot(page, 'e5-cards');
    await groupTab(page, /^Objectives/).click();
    await closeDrawer(page);
  });

  await test.step('e6: status phase of round 1: two tokens (tactic, strategy); the action cards of the phase', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    note('STATUS ' + flat(await status.innerText()));
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Strategy' }).click();
    await expect(status).toContainText('Distribute tokens: 0 left');
    await shot(page, 'e6-status');
    softEq('r1 end', await totals(page), { Resources: 5, Influence: 4, 'Trade goods': 3, Commodities: 1, Tactic: 2, Fleet: 4, Strategy: 3, VP: 0 });
  });

  await test.step('round 2 starts: the planets are ready: Revelation 1/2, New Albion 1/1, Starpoint 3/1', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    softEq('r2 start', await totals(page), { Resources: 5, Influence: 4, 'Trade goods': 3, Commodities: 1, Tactic: 2, Fleet: 4, Strategy: 3, VP: 0 });
    note('R2 TOTALS ' + JSON.stringify(await totals(page)));
    await shot(page, 'round2');
  });

  await test.step('r2-e1: my card Technology (primary): Proxima first (no red technology: prerequisite warning), then Plasma Scoring before it; three action cards taken', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Technology · primary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    note('TECHPICK ' + flat(await picker(page).innerText()).slice(0, 500));
    await choose(page, 'proxima', 'Proxima Targeting VI');
    note('R2E1-a ' + flat(await panel(page).innerText()));
    const missing = await open(page).allInnerTexts();
    note('R2E1-a-warn ' + JSON.stringify(missing));
    softEq('proxima without red tech warns', missing.some(m => /prerequisites of Proxima Targeting VI are not met/.test(m)), true);
    await panel(page).getByRole('button', { name: 'Remove Proxima Targeting VI' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'plasma scoring', 'Plasma Scoring');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'proxima', 'Proxima Targeting VI');
    note('R2E1-b ' + flat(await panel(page).innerText()));
    softEq('r2e1 open warnings', await open(page).allInnerTexts(), []);
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    for (const [q, n] of [['mining initiative', 'Mining Initiative'], ['upgrade', 'Upgrade'], ['scuttle', 'Scuttle']]) {
      await taken.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await shot(page, 'r2e1-tech');
    await done(page).click();
    note('R2E1 TOTALS ' + JSON.stringify(await totals(page)));
  });

  await test.step('r2-e2: tactical action on Quann (25): space battle against the Sol cruiser, my dreadnought is lost, the agent is named, two infantry land; Liberate readies Quann', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 25);
    await expect(page.getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await dragRoute(page, [27, 25]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await page.getByRole('button', { name: 'Take one Dreadnought' }).click();
    const sp = panel(page).getByRole('group', { name: 'Starpoint' });
    await sp.getByRole('button', { name: 'Take one Infantry' }).click();
    await sp.getByRole('button', { name: 'Take one Infantry' }).click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    note('BATTLE ' + flat(await stage(page).innerText()));
    await shot(page, 'r2e2-battle');
    await stage(page).getByRole('button', { name: /^Dreadnought ×1$/ }).first().click();
    await stage(page).getByRole('button', { name: /^Cruiser ×1 \(The Federation of Sol\)/ }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Quann' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Quann' }).getByRole('button', { name: 'Land one Infantry' }).click();
    note('R2E2 ' + flat(await panel(page).innerText()));
    softEq('r2e2 invasion shows Proxima hint', /Proxima Targeting VI/.test(await panel(page).innerText()), true);
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'dame briar', 'Dame Briar');
    softEq('r2e2 open warnings', await open(page).allInnerTexts(), []);
    await shot(page, 'r2e2');
    await done(page).click();
    note('R2E2 TOTALS ' + JSON.stringify(await totals(page)));
    note('LABELS25 ' + JSON.stringify(await labels(25)));
    note('LABELS27 ' + JSON.stringify(await labels(27)));
    softEq('r2e2 totals', await totals(page), { Resources: 2, Influence: 1, 'Trade goods': 1, Commodities: 1, Tactic: 1, Fleet: 4, Strategy: 3, VP: 0 });
    softEq('Quann ready after Liberate', (await labels(25)).filter(l => /Quann/.test(l)), ['Quann: 2/1, yours']);
  });

  await test.step('r2-e3: component action: the action card Mining Initiative on Starpoint gives 3 trade goods', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    note('R2E3 ' + flat(await panel(page).innerText()));
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Starpoint' }).click();
    softEq('r2e3 open warnings', await open(page).allInnerTexts(), []);
    await done(page).click();
    softEq('r2e3 totals', await totals(page), { Resources: 2, Influence: 1, 'Trade goods': 4, Commodities: 1, Tactic: 1, Fleet: 4, Strategy: 3, VP: 0 });
  });

  await test.step('r2-e4: tactical action on the home system: Upgrade is used; a flagship is too dear (warning), then a carrier and a mech', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 92);
    await expect(page.getByText('Tactic tokens: 1 → 0')).toBeVisible();
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'upgrade', 'Upgrade');
    await page.getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    note('R2E4-SHOP ' + flat(await stage(page).innerText()));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    const warn1 = await open(page).allInnerTexts();
    note('R2E4-WARN1 ' + JSON.stringify(warn1));
    softEq('flagship too dear: short resources warning', warn1.some(w => /Not enough resources|short/i.test(w)), true);
    await shot(page, 'r2e4-flagship');
    await page.getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: /^Give back Flagship/ }).click();
    await stage(page).getByRole('button', { name: 'Carrier', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Mech, Ordinian', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    note('R2E4 ' + flat(await panel(page).innerText()));
    softEq('r2e4 open warnings', await open(page).allInnerTexts(), []);
    await done(page).click();
    note('R2E4 TOTALS ' + JSON.stringify(await totals(page)));
    // carrier 3 + mech 2 = 5, Sarween Tools: 4. Quann 2 + 2 trade goods.
    softEq('r2e4 totals (Sarween: cost 4)', await totals(page), { Resources: 0, Influence: 0, 'Trade goods': 2, Commodities: 1, Tactic: 0, Fleet: 4, Strategy: 3, VP: 0 });
  });

  await test.step('r2-e5: pass: Dame Briar was exhausted in the action on Quann, a second use in the round warns', async () => {
    await addAction(page, 'Pass');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'dame briar', 'Dame Briar');
    const w = await panel(page).locator('li[data-code]').allInnerTexts();
    note('R2E5-WARN ' + JSON.stringify(w));
    softEq('agent used twice: warning in the editor', w.some(x => /exhausted/i.test(x)), true);
    await shot(page, 'r2e5-agent-twice');
    await done(page).click();
    const row = page.getByRole('region', { name: 'Actions' }).locator('.entry').filter({ hasText: /^Pass/ });
    note('R2E5-ROW ' + flat(await row.innerText()));
  });

  await test.step('r2-e6: status phase: tokens, an action card', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Fleet' }).click();
    await expect(status).toContainText('Distribute tokens: 0 left');
    await status.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'bribery', 'Bribery');
    softEq('r2 end', await totals(page), { Resources: 7, Influence: 5, 'Trade goods': 1, Commodities: 1, Tactic: 1, Fleet: 5, Strategy: 3, VP: 0 });
  });

  await test.step('round 3 starts: planets ready again (Revelation, New Albion, Starpoint, Quann), the pools carry over', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
    softEq('r3 start', await totals(page), { Resources: 7, Influence: 5, 'Trade goods': 1, Commodities: 1, Tactic: 1, Fleet: 5, Strategy: 3, VP: 0 });
  });

  await test.step('r3-e1: my card Technology: Scanlink Drone Network (free) and Helios V2 (two cybernetic: Sarween Tools, Scanlink) for 6; Ordinian gets +2 resources', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'helios', '4X41C "Helios" V2');
    // Helios alone: Sarween Tools is the only cybernetic technology, two are needed.
    const w = await open(page).allInnerTexts();
    note('R3E1-a ' + JSON.stringify(w));
    softEq('Helios with one yellow technology warns', w.some(x => /prerequisites of 4X41C/.test(x)), true);
    await panel(page).getByRole('button', { name: 'Remove 4X41C "Helios" V2' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'scanlink', 'Scanlink Drone Network');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'helios', '4X41C "Helios" V2');
    softEq('r3e1 open warnings', await open(page).allInnerTexts(), []);
    note('R3E1-b ' + flat(await panel(page).innerText()).slice(0, 1200));
    await shot(page, 'r3e1-tech');
    await done(page).click();
    note('R3E1 TOTALS ' + JSON.stringify(await totals(page)));
    // The fee 6 is paid by planets; Ordinian is 0/0 +2 resources = 2/0 (Helios), a planet that is worth spending.
    softEq('r3e1 totals (Helios: Ordinian 0+2 resources, ready)', await totals(page), { Resources: 3, Influence: 2, 'Trade goods': 1, Commodities: 1, Tactic: 1, Fleet: 5, Strategy: 3, VP: 0 });
  });

  await test.step('twist 1: edit the status entry of round 2 afterwards: the token goes to the tactic pool instead of the fleet pool; round 3 recomputes', async () => {
    await page.getByRole('button', { name: 'Round 2', exact: true }).click();
    await page.getByRole('button', { name: 'Edit: Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Remove one Fleet' }).click();
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    softEq('r2 status after edit', await totals(page), { Resources: 7, Influence: 5, 'Trade goods': 1, Commodities: 1, Tactic: 2, Fleet: 4, Strategy: 3, VP: 0 });
    await page.getByRole('button', { name: 'Round 3', exact: true }).click();
    softEq('r3 after the edit of round 2', (await totals(page)).Tactic, 2);
    softEq('r3 fleet after the edit of round 2', (await totals(page)).Fleet, 4);
  });

  await test.step('r3-e1b: tactical action on Quann with nothing moved: only the command token that The Icon needs', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 25);
    await expect(page.getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await done(page).click();
    await expect(tile(page, 25).getByRole('img', { name: 'Command token' })).toBeVisible();
  });

  await test.step('r3-e2: the breakthrough The Icon is held (drawer); tactical action on the home system builds ships and places them on Quann (Icon in Used)', async () => {
    await openGroup(page, /^Faction/);
    await drawer(page).getByRole('searchbox').fill('the icon');
    await drawer(page).getByRole('button', { name: 'Add The Icon' }).click();
    await drawer(page).getByRole('searchbox').fill('');
    note('BT-HELD ' + flat(await drawer(page).innerText()).slice(-500));
    await closeDrawer(page);
    await addAction(page, 'Tactical action');
    await tapTile(page, 92);
    await expect(page.getByText('Tactic tokens: 1 → 0')).toBeVisible();
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'the icon', 'The Icon');
    await page.getByRole('button', { name: /^Production/ }).click();
    note('R3E2-SHOP0 ' + flat(await stage(page).innerText()));
    await stage(page).getByRole('button', { name: 'Carrier', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    note('R3E2-SHOP1 ' + flat(await stage(page).innerText()));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    note('R3E2 ' + flat(await panel(page).innerText()));
    note('R3E2-GROUPS ' + JSON.stringify(await panel(page).locator('[role="group"]').evaluateAll(els => els.map(e => e.getAttribute('aria-label')))));
    note('R3E2-EXHAUSTED ' + flat(await panel(page).locator('.component-card, [data-testid^="component-"]').allInnerTexts().then(a => a.join(' ## '))));
    note('R3E2-TOK25 ' + JSON.stringify(await labels(25)) + ' 27: ' + JSON.stringify(await labels(27)) + ' 92: ' + JSON.stringify(await labels(92)));
    note('R3E2-SHIPSTO-BUTTONS ' + (await panel(page).getByRole('group', { name: 'Ships are placed in' }).getByRole('button').count()));
    await shot(page, 'r3e2-icon');
  });

  await test.step('r3-e2b: The Icon: the ships are placed on Quann, the 68.2 warning is shown struck through with "Allowed by"', async () => {
    const row = panel(page).getByRole('group', { name: 'Ships are placed in' });
    await row.getByRole('button').first().click();
    const waived = panel(page).locator('li.warning-waived');
    note('R3E2B-WAIVED ' + JSON.stringify(await waived.allInnerTexts()));
    softEq('Icon waives the placement warning', await waived.count() > 0 && /The Icon/.test(await waived.first().innerText()), true);
    softEq('r3e2b open warnings', await open(page).allInnerTexts(), []);
    await shot(page, 'r3e2-icon-waived');
    await done(page).click();
    note('R3E2B TOTALS ' + JSON.stringify(await totals(page)));
    note('R3E2B LABELS25 ' + JSON.stringify(await labels(25)) + ' 92: ' + JSON.stringify(await labels(92)));
    softEq('ships stand on Quann', (await labels(25)).filter(l => /Carrier|Fighter/.test(l)), ['Carrier ×2', 'Fighter ×2']);
  });

  await test.step('r3-sol: Sol plays Raise the Standard (component action of a rival); the note returns to the Last Bastion player', async () => {
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Sol' }).click();
    await addAction(page, 'Component action');
    await choose(page, 'raise the standard', 'Raise the Standard');
    note('R3SOL ' + flat(await panel(page).innerText()).slice(0, 900));
    softEq('r3 sol open warnings', await open(page).allInnerTexts(), []);
    await shot(page, 'r3-sol-note');
    await done(page).click();
    await openGroup(page, /^Cards/);
    const notes = drawer(page).getByRole('group', { name: 'My promissory notes' });
    note('NOTES-AFTER ' + flat(await notes.innerText()));
    softEq('Raise the Standard back in my hand', /Raise the Standard\s*\n?\s*in hand/.test(await notes.innerText()), true);
    await closeDrawer(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine' }).click();
  });

  await test.step('r3-leaders: commander Nip and Tuck unlocked by hand (3 galvanized units); the reminder shows in my component action', async () => {
    await openGroup(page, /^Faction/);
    const commander = drawer(page).getByTestId('component-leader:bastioncommander');
    await commander.locator('.segment > button').nth(1).click();
    await expect(commander.locator('.segment > button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await shot(page, 'r3-leaders');
    await closeDrawer(page);
    await addAction(page, 'Component action');
    await choose(page, 'scuttle', 'Scuttle');
    note('R3CMD ' + flat(await panel(page).innerText()).slice(0, 900));
    softEq('commander reminder at component action', /Nip and Tuck/.test(await panel(page).innerText()), true);
    await shot(page, 'r3-commander-hint');
  });

  await test.step('r3-e5: Scuttle done, pass with Hyperion into the strategy pool', async () => {
    note('R3CMD-BTNS ' + JSON.stringify(await panel(page).getByRole('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label') || e.textContent?.trim()))).slice(0, 700));
    await done(page).click();
    await addAction(page, 'Pass');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('hyperion');
    await picker(page).getByRole('button', { name: /^Choose 4X41D/ }).first().click();
    await used.getByRole('button', { name: 'Strategy pool' }).click();
    softEq('hyperion pass open warnings', await open(page).allInnerTexts(), []);
    await done(page).click();
    note('R3E5 TOTALS ' + JSON.stringify(await totals(page)));
  });

  await test.step('r3-e6: status phase: Expand Borders scored (control planets outside the home system) - first of three objectives; tokens', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Score an objective' }).click();
    note('OBJPICK ' + flat(await picker(page).innerText()).slice(0, 700));
    await choose(page, 'expand borders', 'Expand Borders');
    await status.getByRole('group', { name: 'Bastion' }).getByRole('button', { name: 'Add one Bastion' }).click();
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Strategy' }).click();
    note('R3STATUS ' + flat(await status.innerText()).slice(0, 700));
    await shot(page, 'r3-status');
    note('R3END ' + JSON.stringify(await totals(page)));
  });

  await test.step('r3-e6b: two more objectives scored (three in all, 3 VP); the hero Lyra Keen is unlocked by hand', async () => {
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'lead from the front', 'Lead From the Front');
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'sway the council', 'Sway the Council');
    const g = status.getByRole('group', { name: 'Bastion' });
    await g.getByRole('button', { name: 'Add one Bastion' }).click();
    await g.getByRole('button', { name: 'Add one Bastion' }).click();
    note('R3STATUS2 ' + flat(await status.innerText()).slice(0, 900));
    softEq('r3 VP', (await totals(page)).VP, 3);
    await openGroup(page, /^Objectives/);
    note('OBJ-DRAWER ' + flat(await drawer(page).innerText()).slice(0, 700));
    await openGroup(page, /^Faction/);
    const hero = drawer(page).getByTestId('component-leader:bastionhero');
    await hero.locator('.segment > button').nth(1).click();
    await expect(hero.locator('.segment > button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await closeDrawer(page);
    await shot(page, 'r3-objectives');
  });

  await test.step('round 4 starts', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 4', exact: true })).toHaveAttribute('aria-pressed', 'true');
    softEq('r4 start (Helios: Ordinian 0+2 resources, ready)', await totals(page), { Resources: 9, Influence: 5, 'Trade goods': 0, Commodities: 1, Tactic: 1, Fleet: 4, Strategy: 5, VP: 3 });
  });

  await test.step('r4-e1: my card Technology: Gravity Drive (free) and Antimass Deflectors (6); then the same card as a secondary: Carrier II (two blue)', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'gravity drive', 'Gravity Drive');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'antimass', 'Antimass Deflectors');
    softEq('r4e1 open warnings', await open(page).allInnerTexts(), []);
    await shot(page, 'r4e1-tech');
    await done(page).click();
    note('R4E1 TOTALS ' + JSON.stringify(await totals(page)));
  });

  await test.step('r4-e2: Technology secondary (strategy token + 4 resources): Carrier II; Helios V2 and Carrier II are unit upgrades', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: '7 Technology' }).click();
    note('R4E2-A ' + flat(await panel(page).innerText()).slice(0, 700));
    await panel(page).getByRole('group', { name: 'Card mode' }).getByRole('button', { name: /^Secondary/ }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'carrier ii', 'Carrier II');
    note('R4E2-B ' + flat(await panel(page).innerText()).slice(0, 900));
    softEq('r4e2 open warnings (card is mine note; short by 1 is my own budget)', (await open(page).allInnerTexts()).length, 2);
    await shot(page, 'r4e2-tech');
    await done(page).click();
    note('R4E2 TOTALS ' + JSON.stringify(await totals(page)));
  });

  await test.step('r4-e3: tactical action on Mecatol Rex (112): a long route through the asteroids; speed warning; Lyra Keen (hero) used; Mecatol taken', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 112);
    await expect(page.getByText('Tactic tokens: 1 → 0')).toBeVisible();
    await dragRoute(page, [92, 44, 36, 61, 112]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await page.getByRole('button', { name: 'Take one Mech' }).click();
    await page.getByRole('button', { name: 'Take one Mech' }).click();
    await page.getByRole('button', { name: 'Take one Infantry' }).click();
    note('R4E3-ROUTE ' + flat(await panel(page).innerText()).slice(0, 900));
    await page.getByRole('button', { name: 'Fly' }).click();
    const lw = await open(page).allInnerTexts();
    note('R4E3-WARN ' + JSON.stringify(lw));
    await shot(page, 'r4e3-route');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'lyra keen', 'Lyra Keen');
    const land = panel(page).getByRole('group', { name: 'Landing on Mecatol Rex' });
    await land.getByRole('button', { name: 'Land one Infantry' }).click();
    await land.getByRole('button', { name: 'Land one Mech' }).click();
    await land.getByRole('button', { name: 'Land one Mech' }).click();
    note('R4E3-LAND ' + flat(await panel(page).innerText()).slice(0, 1500));
    note('R4E3-WARN2 ' + JSON.stringify(await open(page).allInnerTexts()));
    await shot(page, 'r4e3-mecatol');
    await done(page).click();
    note('R4E3 TOTALS ' + JSON.stringify(await totals(page)));
    note('R4E3 LABELS112 ' + JSON.stringify(await labels(112)));
  });

  await test.step('r4-e4: component action: a relic found in the round is taken (Dynamis Core) and used', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'dynamis core', 'Dynamis Core');
    note('R4E4 ' + flat(await panel(page).innerText()).slice(0, 700));
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'dynamis core', 'Dynamis Core');
    note('R4E4-WARN ' + JSON.stringify(await open(page).allInnerTexts()));
    await shot(page, 'r4e4-relic');
    await done(page).click();
    note('R4E4 TOTALS ' + JSON.stringify(await totals(page)));
  });

  await test.step('r4-e5: pass: the agent (readied in the status phase) is used again, the purged hero is named a second time', async () => {
    await addAction(page, 'Pass');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'dame briar', 'Dame Briar');
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'lyra keen', 'Lyra Keen');
    const w = await panel(page).locator('li[data-code]').allInnerTexts();
    note('R4E5-WARN ' + JSON.stringify(w));
    softEq('hero used twice: a warning in the editor', w.length > 0, true);
    await shot(page, 'r4e5-pass');
    await done(page).click();
    const row = page.getByRole('region', { name: 'Actions' }).locator('.entry').filter({ hasText: /^Pass/ }).last();
    note('R4E5-ROW ' + flat(await row.innerText()));
  });

  await test.step('r4-e6: agenda phase (I hold Mecatol Rex): a law passes and stays in play', async () => {
    const agendas = page.getByRole('region', { name: 'Agenda' });
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'anti-intellectual', 'Anti-Intellectual Revolution');
    note('R4E6 ' + flat(await panel(page).innerText()).slice(0, 900));
    softEq('agenda open warnings', await open(page).allInnerTexts(), []);
    await shot(page, 'r4e6-agenda');
    await done(page).click();
  });

  await test.step('r4-e7: status phase: tokens; drawer shows technologies, relic, law', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await expect(status).toContainText('Distribute tokens: 0 left');
    await openGroup(page, /^Technologies/);
    const techs = drawer(page).getByRole('group', { name: 'Researched technologies' });
    note('TECHS ' + flat(await techs.innerText()));
    for (const name of ['Sarween Tools', 'Plasma Scoring', 'Proxima Targeting VI', 'Scanlink Drone Network', 'Gravity Drive', 'Antimass Deflectors']) {
      softEq('drawer lists ' + name, (await techs.innerText()).includes(name), true);
    }
    note('UPGRADES ' + flat(await drawer(page).getByRole('group', { name: 'Unit upgrades' }).innerText()).slice(0, 600));
    await shot(page, 'drawer-technologies');
    await openGroup(page, /^Relics/);
    note('RELICS ' + flat(await drawer(page).innerText()).slice(0, 400));
    await openGroup(page, /^Objectives/);
    note('LAWS ' + flat(await drawer(page).innerText()).slice(0, 500));
    await openGroup(page, /^Faction/);
    const st = async (id: string) => drawer(page).getByTestId(`component-leader:${id}`).locator('.segment > button[aria-pressed="true"]').innerText();
    const leaders = [await st('bastionagent'), await st('bastioncommander'), await st('bastionhero')];
    note('LEADERS ' + JSON.stringify(leaders));
    softEq('leaders at the end of round 4 (agent readied by the status phase)', leaders, ['Unlocked', 'Unlocked', 'Purged']);
    await shot(page, 'drawer-faction');
    await closeDrawer(page);
  });

  await test.step('twist 2: round 1 afterwards: the home production (mech and infantry) is deleted; later rounds recompute', async () => {
    note('UPG-SD ' + flat(await (async () => { await openGroup(page, /^Technologies/); const t = await drawer(page).getByRole('group', { name: 'Unit upgrades' }).innerText(); await closeDrawer(page); return t; })()).slice(-300));
    const before = { r4: await totals(page) };
    await page.getByRole('button', { name: 'Round 1', exact: true }).click();
    const rows = page.getByRole('region', { name: 'Actions' }).locator('.entry');
    note('R1ROWS ' + JSON.stringify(await rows.allInnerTexts()));
    note('R1ROW3-BTNS ' + JSON.stringify(await rows.nth(2).getByRole('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label')))));
    await shot(page, 'twist2-rows');
  });

  await test.step('twist 2b: the neighbour warning on the round 1 pass; the pass is opened and its editor is read', async () => {
    await page.getByRole('button', { name: 'Edit: Pass' }).click();
    const w = await panel(page).locator('li[data-code]').allInnerTexts();
    note('R1PASS-EDITOR-WARN ' + JSON.stringify(w));
    await shot(page, 'twist2-pass-editor');
    await panel(page).getByRole('button', { name: 'Back' }).click().catch(() => undefined);
    await done(page).click();
  });

  const snapTotals = async (label: string) => {
    const out: Record<string, unknown> = {};
    for (const r of [1, 2, 3, 4]) {
      await page.getByRole('button', { name: `Round ${r}`, exact: true }).click();
      await setMode(page, 'Forecast');
      out['R' + r] = await totals(page);
    }
    note('SNAP ' + label + ' ' + JSON.stringify(out));
    return out;
  };

  await test.step('twist 2c: delete the home production of round 1: the rows of round 4 and the totals change', async () => {
    const rowsOf = async (round: number) => {
      await page.getByRole('button', { name: `Round ${round}`, exact: true }).click();
      return (await page.getByRole('region', { name: 'Actions' }).locator('.entry').allInnerTexts()).map(r => r.replace(/\s+/g, ' '));
    };
    await snapTotals('before');
    const r4Before = await rowsOf(4);
    const t4Before = await totals(page);
    note('R4ROWS-BEFORE ' + JSON.stringify(r4Before));
    await page.getByRole('button', { name: 'Round 1', exact: true }).click();
    await page.getByRole('region', { name: 'Actions' }).locator('.entry').nth(2).getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('region', { name: 'Actions' }).locator('.entry')).toHaveCount(3);
    await snapTotals('after');
    const r4After = await rowsOf(4);
    const t4After = await totals(page);
    note('R4ROWS-AFTER ' + JSON.stringify(r4After));
    note('R4 TOTALS BEFORE ' + JSON.stringify(t4Before) + ' AFTER ' + JSON.stringify(t4After));
    await shot(page, 'twist2-after');
  });

  await test.step('round 5 starts: Mahact (a rival) lands two infantry on Ang (Setup of the big hex)', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 5', exact: true })).toHaveAttribute('aria-pressed', 'true');
    note('R5 START ' + JSON.stringify(await totals(page)));
    await tapTile(page, 61);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Mahact' }).click();
    note('SETUP61 ' + JSON.stringify(await stage(page).getByRole('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label') || e.textContent?.trim()))));
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Control', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Mahact', exact: true }).last().click();
    await shot(page, 'r5-setup-ang');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    note('LABELS61 ' + JSON.stringify(await labels(61)));
  });

  await test.step('r5-e1: my card Trade (primary): 3 trade goods', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '5 Trade' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await done(page).click();
    softEq('r5e1 trade goods', (await totals(page))['Trade goods'], 4);
  });

  await test.step('r5-e2: tactical action on the home system: the flagship The Egeiro is built (8, Sarween Tools 7), a second Dame Briar-free action', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 92);
    await page.getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    note('R5E2-SHOP ' + flat(await stage(page).innerText()).slice(0, 700));
    await stage(page).getByRole('button', { name: 'Close' }).click();
    note('R5E2 ' + flat(await panel(page).innerText()).slice(-500));
    softEq('r5e2 open warnings', await open(page).allInnerTexts(), []);
    await shot(page, 'r5e2-flagship');
    await done(page).click();
    await expect(tile(page, 92).getByRole('img', { name: 'Flagship ×1' })).toBeVisible();
    note('R5E2 TOTALS ' + JSON.stringify(await totals(page)));
  });

  await test.step('r5-e3: tactical action on Ang (61): carrier from Mecatol with a mech and an infantry; the two Mahact infantry die; Liberate: 1 infantry < 2 resources, so one infantry is added and Ang stays exhausted', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 61);
    await dragRoute(page, [112, 61]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    const mr = panel(page).getByRole('group', { name: 'Mecatol Rex' });
    await mr.getByRole('button', { name: 'Take one Mech' }).click();
    await mr.getByRole('button', { name: 'Take one Infantry' }).click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    note('R5E3-BATTLE ' + flat(await stage(page).innerText()));
    await shot(page, 'r5e3-battle');
    await stage(page).getByRole('button', { name: /^Infantry ×2 \(The Mahact Gene-Sorcerers\)/ }).click();
    await stage(page).getByRole('button', { name: /^Infantry ×1 \(The Mahact Gene-Sorcerers\)/ }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    const land = panel(page).getByRole('group', { name: 'Landing on Ang' });
    await land.getByRole('button', { name: 'Land one Infantry' }).click();
    await land.getByRole('button', { name: 'Land one Mech' }).click();
    note('R5E3 ' + flat(await panel(page).innerText()).slice(0, 1800));
    note('R5E3-WARN ' + JSON.stringify(await open(page).allInnerTexts()));
    await shot(page, 'r5e3-ang');
    await done(page).click();
    note('LABELS61-AFTER ' + JSON.stringify(await labels(61)));
    softEq('Liberate (not enough infantry): Ang stays exhausted with 2 infantry and the mech', (await labels(61)).filter(l => /Ang|Infantry|Mech/.test(l)), ['Ang: 2/0, Warfare, yours, exhausted', 'Infantry ×2', 'Mech ×1']);
  });

  await test.step('r5-e4: Politics (a rival chose it): secondary; two action cards taken', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: '3 Politics' }).click();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'plague', 'Plague');
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'unexpected action', 'Unexpected Action');
    note('R5E4 ' + flat(await panel(page).innerText()).slice(0, 700));
    softEq('r5e4 open warnings', await open(page).allInnerTexts(), []);
    await done(page).click();
  });

  await test.step('r5-e5: pass with a transaction: a commodity to Mahact (a neighbour on Ang)', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Mah' }).click();
    await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: 'Add one Commodities' }).click();
    note('R5E5-WARN ' + JSON.stringify(await open(page).allInnerTexts()));
    await shot(page, 'r5e5-txn');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page).click();
    note('R5E5 TOTALS ' + JSON.stringify(await totals(page)));
  });

  await test.step('r5-e6: status phase, tokens; now and forecast', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Fleet' }).click();
    await expect(status).toContainText('Distribute tokens: 0 left');
    const forecast = await totals(page);
    note('R5 END FORECAST ' + JSON.stringify(forecast));
    await setMode(page, 'Now');
    const now = await totals(page);
    note('R5 END NOW ' + JSON.stringify(now));
    await setMode(page, 'Forecast');
    await shot(page, 'r5-end');
  });

  await test.step('now mode: with every entry of round 1 marked done, the "now" numbers are those of the end of round 1', async () => {
    await page.getByRole('button', { name: 'Round 1', exact: true }).click();
    const boxes = page.getByRole('region', { name: 'Actions' }).getByRole('checkbox', { name: 'Done' });
    const n = await boxes.count();
    for (let i = 0; i < n; i += 1) { await boxes.nth(i).check(); await page.waitForTimeout(150); }
    await page.getByRole('region', { name: 'Status' }).getByRole('checkbox', { name: 'Done' }).first().check();
    await setMode(page, 'Now');
    const now = await totals(page);
    note('R1 NOW ' + JSON.stringify(now));
    // After the deletion of the home production in twist 2: tactic 3 - 1 + 1, strategy 2 + 1, trade goods 3, planets ready again.
    softEq('R1 now totals', now, { Resources: 5, Influence: 4, 'Trade goods': 3, Commodities: 1, Tactic: 3, Fleet: 4, Strategy: 3, VP: 0 });
    await setMode(page, 'Forecast');
  });

  await test.step('reload: the saved game comes back with the same numbers in every round', async () => {
    const snap = async () => {
      const out: unknown[] = [];
      for (let r = 1; r <= 5; r += 1) {
        await page.getByRole('button', { name: `Round ${r}`, exact: true }).click();
        const rows = (await page.getByRole('region', { name: 'Actions' }).locator('.entry').allInnerTexts()).map(x => x.replace(/\s+/g, ' '));
        out.push({ r, totals: await totals(page), rows });
      }
      return out;
    };
    const before = await snap();
    await page.reload();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 92)).toBeVisible();
    const after = await snap();
    softEq('after reload', after, before);
    await shot(page, 'after-reload');
  });

  await test.step('r5-e7: the Hyperion planet card exhausted twice in one round (second use warns)', async () => {
    await page.getByRole('button', { name: 'Round 5', exact: true }).click();
    for (const card of ['Plague', 'Unexpected Action']) {
      await addAction(page, 'Component action');
      await choose(page, card.toLowerCase(), card);
      const used = panel(page).getByRole('group', { name: 'Used' });
      await used.getByRole('button', { name: '+ Used' }).click();
      await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('hyperion');
      await picker(page).getByRole('button', { name: /^Choose 4X41D/ }).first().click();
      await used.getByRole('button', { name: 'Fleet pool' }).click();
      note('R5E7-' + card + ' ' + JSON.stringify(await panel(page).locator('li[data-code]').allInnerTexts()));
      if (card === 'Unexpected Action') await shot(page, 'r5e7-hyperion-twice');
      await done(page).click();
    }
    const rows = await page.getByRole('region', { name: 'Actions' }).locator('.entry').allInnerTexts();
    note('R5E7-ROWS ' + JSON.stringify(rows.slice(-2).map(r => r.replace(/\s+/g, ' '))));
    softEq('hyperion used twice in a round warns on the second entry (list row)', /exhausted|already/i.test(rows[rows.length - 1]), true);
  });

  // BUG: every entry below is a known difference between the app and the rules (see the findings of the report):
  // Sarween Tools is not applied to the cost shown and the automatic payment (3 trade goods are spent instead of 2),
  // Helios V2 adds 2 resources to Ordinian in the payment block but not in the summary or the shop, the warning of a
  // second use in the Pass editor is not shown (only in the list row).
  expect(mismatches.map(m => m.split(': got')[0])).toEqual(["e3 totals","e5 totals","r1 end","r2 start","r2e4 totals (Sarween: cost 4)","agent used twice: warning in the editor","r3e1 totals (Helios: Ordinian 0+2 resources, ready)","r4 start (Helios: Ordinian 0+2 resources, ready)","hero used twice: a warning in the editor"]);
  expect(problems).toEqual([]);
});
