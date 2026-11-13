import { appendFileSync, mkdirSync, readdirSync, rmSync, unlinkSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * One long game of The Firmament, six players, Prophecy of Kings and Thunder's Edge on, played through the interface.
 * Seats: 1 Firmament (me), then Sol, Hacan, Letnev, Argent, Mentak. Lines marked BUG assert what the application does today.
 */
const SHOTS = 'test-results/scenarios/firmament';
// Hacan's 5-player map; the six home seats are the zeros, and the first one carries my home tile 96.
const MAP = '78 40 42 67 69 34 39 27 26 65 79 47 32 30 29 73 41 21 96A 20 62 0 19 64 0 44 36 0 38 61 0 76 24 0 37 50';

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
const open = (page: Page) => panel(page).locator('li[data-code]:not(.warning-waived)');
const waived = (page: Page) => panel(page).locator('li.warning-waived[data-code]');

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
async function choose(page: Page, query: string, name: string | RegExp): Promise<void> {
  await picker(page).getByRole('searchbox', { name: 'Search components' }).fill(query);
  await picker(page).getByRole('button', { name: typeof name === 'string' ? `Choose ${name}` : name }).first().click();
  await expect(picker(page)).toHaveCount(0);
}
const take = async (page: Page, u: string, n = 1, scope?: Locator) => {
  for (let i = 0; i < n; i += 1) await (scope ?? panel(page)).getByRole('button', { name: `Take one ${u}` }).first().click();
};
const put = async (page: Page, u: string, n = 1) => {
  for (let i = 0; i < n; i += 1) await stage(page).getByRole('button', { name: u, exact: true }).click();
};
const closeStage = (page: Page) => stage(page).getByRole('button', { name: 'Close' }).click();
const dump = async (page: Page, label: string, loc?: Locator, n = 3000) => note(`${label}: ` + flat(await (loc ?? panel(page)).innerText()).slice(0, n));
const checkProblems = () => expect(problems, 'console or page errors').toEqual([]);

test.describe.configure({ mode: 'serial' });

let page: Page;
test.beforeAll(async ({ browser }) => {
  mkdirSync(SHOTS, { recursive: true });
  for (const old of readdirSync(SHOTS)) if (old.endsWith('.png')) unlinkSync(`${SHOTS}/${old}`);
  rmSync(`${SHOTS}/notes.txt`, { force: true });
  const context = await browser.newContext({ baseURL: 'http://localhost:4173', viewport: { width: 1180, height: 820 }, hasTouch: true, serviceWorkers: 'block' });
  page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
});
test.afterAll(async () => { await page.context().close(); });

test('setup: the game and the home system', async () => {
  test.setTimeout(240_000);
  await page.goto('/');
  await test.step('create the game on the first screen', async () => {
    note('--- setup');
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    const pickF = async (n: number, f: string) => {
      await page.getByRole('group', { name: `Player ${n}` }).getByRole('button').first().click();
      await page.getByRole('button', { name: f, exact: true }).click();
    };
    await pickF(1, 'The Firmament');
    await pickF(2, 'The Federation of Sol');
    await pickF(3, 'The Emirates of Hacan');
    await pickF(4, 'The Barony of Letnev');
    await pickF(5, 'The Argent Flight');
    await pickF(6, 'The Mentak Coalition');
    await page.getByRole('textbox', { name: 'Game name' }).fill('Firmament long');
    await shot(page, 'game-screen');
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    await dump(page, 'GAMESCREEN', page.locator('main, body').first(), 5000);
    await shot(page, 'game-screen-2');
  });
  await test.step('start the game, look at the home system', async () => {
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 96)).toBeVisible();
    await shot(page, 'start');
    note('LABELS96-START ' + JSON.stringify(await labels(page, 96)));
    note('START ' + JSON.stringify(await totals(page)));
    await tapTile(page, 96);
    await dump(page, 'HOME96', stage(page), 3000);
    await shot(page, 'home-hex');
    await closeStage(page);
    await page.getByRole('button', { name: 'Add action' }).click();
    await dump(page, 'ACTIONS', page.locator('.action-list'));
    await page.keyboard.press('Escape');
  });
  await test.step('components drawer: starting technology, faction group', async () => {
    await page.getByRole('button', { name: /^Components/ }).click();
    await dump(page, 'FANTABS', page.locator('.drawer-rail-right'));
    await openGroup(page, /^Technologies/);
    await drawer(page).getByRole('searchbox').fill('sarween');
    await drawer(page).getByRole('button', { name: 'Add Sarween Tools' }).click();
    await drawer(page).getByRole('searchbox').fill('');
    await openGroup(page, /^Faction/);
    await dump(page, 'FACTION', drawer(page), 6000);
    await shot(page, 'drawer-faction');
    await closeDrawer(page);
    await checkProblems();
  });
});

test('round 1', async () => {
  test.setTimeout(300_000);
  await test.step('e1: Trade primary: 3 trade goods, commodities replenished to 3', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '5 Trade' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await expect(summary(page, 'Trade goods')).toHaveText(/0 → 3/);
    await expect(summary(page, 'Commodities')).toHaveText(/0 → 3/);
    await dump(page, 'TRADE-EDITOR', panel(page), 3000);
    await shot(page, 'trade');
    await done(page).click();
    expect(await totals(page)).toEqual({ Resources: 3, Influence: 3, 'Trade goods': 3, Commodities: 3, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 });
  });
  await test.step('e2: component action picker: what is listed', async () => {
    await addAction(page, 'Component action');
    await dump(page, 'COMPONENT-PICKER', picker(page), 6000);
    await shot(page, 'component-picker');
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('puppets');
    await dump(page, 'PICK-puppets', picker(page), 1500);
    await choose(page, 'puppets', /Choose Puppets of the Blade/);
    await dump(page, 'PUPPETS-EDITOR', panel(page), 3000);
    await shot(page, 'puppets');
    await done(page).click();
    await dump(page, 'PUPPETS-ENTRY', page.getByRole('region', { name: 'Actions' }), 2000);
    await shot(page, 'entries');
  });
  const RIVALS: Array<[string, string]> = [['Sol', 'Sol'], ['Hacan', 'Hacan'], ['Letnev', 'Letnev'], ['Argent', 'Argent'], ['Mentak', 'Mentak']];
  await test.step('e2b: expected rival destroyers on 50 next to my home so that every one is a neighbour', async () => {
    await tapTile(page, 50);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    for (const [, short] of RIVALS) {
      await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: short }).click();
      await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    }
    await shot(page, 'setup-50');
    await dump(page, 'SETUP50', stage(page), 2000);
    await closeStage(page);
  });
  await test.step('e3: tactical action 1 to Vefut II (20) with the carrier, two infantry and a fighter; a deal in the same turn', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 20);
    await expect(page.getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await dragRoute(page, [96, 20]);
    await take(page, 'Carrier');
    await take(page, 'Infantry', 2);
    await take(page, 'Fighter');
    await page.getByRole('button', { name: 'Fly' }).click();
    await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    note('LABELS96-T1 ' + JSON.stringify(await labels(page, 96)));
    // BUG: the third start infantry stands in the space of the home system in the model (not on a planet), so what is left behind counts as load without a ship to carry it.
    await expect(panel(page).getByText('System Cronos / Tallin is over capacity: 1 of 0.').first()).toBeVisible();
    await shot(page, 't1-overcap');
    await panel(page).getByRole('button', { name: /^Cronos \/ Tallin/ }).click();
    await take(page, 'Infantry');
    await page.getByRole('button', { name: 'Fly' }).click();
    await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    await expect(panel(page).getByText(/over capacity/)).toHaveCount(0);
    await dump(page, 'T1', panel(page), 4000);
    await shot(page, 't1');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sol' }).click();
    const give = panel(page).getByRole('group', { name: 'Give', exact: true });
    const get = panel(page).getByRole('group', { name: 'Get', exact: true });
    for (let i = 0; i < 2; i += 1) await give.getByRole('button', { name: 'Add one Commodities' }).click();
    for (let i = 0; i < 2; i += 1) await get.getByRole('button', { name: 'Add one Trade goods' }).click();
    note('VP-before-notes ' + JSON.stringify(await totals(page)));
    await give.getByRole('button', { name: '+ Component' }).click();
    await dump(page, 'TX-GIVE-PICK', picker(page), 2500);
    await choose(page, 'black ops', 'Black Ops');
    note('VP-after-give-blackops ' + JSON.stringify(await totals(page)));
    await get.getByRole('button', { name: '+ Component' }).click();
    await dump(page, 'TX-GET-PICK', picker(page), 2500);
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('support for the throne');
    await dump(page, 'TX-GET-PICK-SFT', picker(page), 1500);
    await shot(page, 'tx-get-pick');
    await picker(page).getByRole('button', { name: /^Choose Support for the Throne/ }).first().click();
    await dump(page, 'TX1', panel(page), 5000);
    note('VP-with-both ' + JSON.stringify(await totals(page)));
    // Probe: with my own copy of the note given away in the same deal, the received one counts once.
    await give.getByRole('button', { name: '+ Component' }).click();
    await choose(page, 'support for the throne', /^Choose Support for the Throne/);
    const vpGiven = (await totals(page)).VP;
    note('VP-own-sftt-given ' + vpGiven);
    await give.getByRole('button', { name: /^Remove Support for the Throne/ }).click();
    await shot(page, 'tx1');
    // BUG: receiving Sol's Support for the Throne gives 2 points (the rule: 1) while I hold my own copy of the same card.
    expect((await totals(page)).VP).toBe(2);
    await expect(open(page).filter({ hasNotText: /^$/ })).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page).click();
    // Trade 3 + 2 from Sol, commodities 3 - 2; Vefut II is taken exhausted (LRR 25.1), so 3 resources and 3 influence stay ready.
    expect(await totals(page)).toEqual({ Resources: 3, Influence: 3, 'Trade goods': 5, Commodities: 1, Tactic: 2, Fleet: 3, Strategy: 2, VP: 2 });
    await setMode(page, 'Now');
    await shot(page, 'now-mode');
    await setMode(page, 'Forecast');
  });
  await test.step('look at the players drawer: what Sol holds after Black Ops', async () => {
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Sol', exact: true }).click();
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await dump(page, 'SOL-TX-OPEN', panel(page), 1500);
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: /^(Fir|Me|Mine)/ }).first().click();
    const give2 = panel(page).getByRole('group', { name: 'Give', exact: true });
    for (let i = 0; i < 3; i += 1) await give2.getByRole('button', { name: 'Add one Trade goods' }).click();
    await dump(page, 'SOL-TX-3TG', panel(page), 2500);
    await shot(page, 'sol-tx');
    await give2.getByRole('button', { name: 'Remove one Trade goods' }).click();
    await dump(page, 'SOL-TX-2TG', panel(page), 2500);
    // Sol had 2 trade goods after the deal (2 commodities in, 2 trade goods out, Black Ops +2): the rival's side of the note works.
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page).click();
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Delete' }).last().click();
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Mine', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Actions' }).locator('.entry')).toHaveCount(3);
  });
  await test.step('e4: the secondary of Technology (a rival chose it): Neural Motivator for 1 strategy token and 4 resources', async () => {
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Technology · secondary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await dump(page, 'TECH-PICK', picker(page), 2500);
    await choose(page, 'neural motivator', 'Neural Motivator');
    await dump(page, 'TECH-SEC', panel(page), 3000);
    await shot(page, 'tech-secondary');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 4, paid 4');
    await expect(open(page)).toHaveCount(0);
    await done(page).click();
    // 4 paid out of 3 ready resources and 5 trade goods: Cronos, Tallin and one trade good; one strategy token is spent.
    const t = await totals(page);
    note('AFTER-TECH-SEC ' + JSON.stringify(t));
  });
  await test.step('e5: tactical action 2 on the home system: the shop builds a mech and two infantry (Sarween Tools: -1)', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 96);
    await page.getByRole('button', { name: /^Production/ }).click();
    await dump(page, 'SHOP0', stage(page), 3000);
    note('SHOP-BUTTONS ' + JSON.stringify(await stage(page).getByRole('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label') ?? e.textContent))));
    await stage(page).getByRole('button', { name: 'Mech, Cronos', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry, Cronos', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry, Cronos', exact: true }).click();
    await dump(page, 'SHOP1', stage(page), 3000);
    await shot(page, 'shop-bought');
    await closeStage(page);
    await dump(page, 'T2', panel(page), 4000);
    // Mech 2 + two infantry 1 = 3; Sarween Tools (held from the start) takes 1 off the combined cost: 2 (card text).
    // BUG: the shop counter and the payment block still say 3 and the payment takes 3 trade goods (same as on Hacan's game).
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 3, paid 3');
    const afterShop = await totals(page);
    note('AFTER-SHOP ' + JSON.stringify(afterShop));
    expect(afterShop['Trade goods']).toBe(1);
    await shot(page, 't2');
    await done(page).click();
    await tapTile(page, 96);
    await dump(page, 'HOME96-AFTER', stage(page), 1500);
    await closeStage(page);
    expect((await labels(page, 96)).join(' ')).toMatch(/Mech/);
  });
  await test.step('e6: pass, with two action cards taken from the deck (Mining Initiative, Sabotage)', async () => {
    await addAction(page, 'Pass');
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'mining initiative', 'Mining Initiative');
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'sabotage', 'Sabotage');
    await expect(open(page)).toHaveCount(0);
    await shot(page, 'pass-1');
    await done(page).click();
  });
  await test.step('e7: status phase: tokens, public and secret objectives, the action card drawn; hints of Plots Within Plots', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await dump(page, 'STATUS0', panel(page), 4000);
    await shot(page, 'status0');
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Strategy' }).click();
    await expect(status).toContainText('Distribute tokens: 0 left');
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'expand borders', 'Expand Borders');
    await dump(page, 'OBJ1', panel(page), 5000);
    await expect(panel(page).getByText(/Expand Borders is scored without its requirement: 1 of 6/)).toBeVisible();
    await status.getByRole('button', { name: 'Add one Firmament' }).click();
    // Plots Within Plots: a secret objective somebody else scored: no point for me, a plot card instead (nothing is tracked). It is entered as a scored objective.
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'destroy their greatest ship', 'Destroy Their Greatest Ship');
    await dump(page, 'OBJ2', panel(page), 5000);
    await shot(page, 'status-objectives');
    await status.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'direct hit', 'Direct Hit');
    await status.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'bunker', 'Bunker');
    await dump(page, 'STATUS1', panel(page), 5000);
    await shot(page, 'status1');
    const t = await totals(page);
    note('STATUS-TOTALS ' + JSON.stringify(t));
    // Tactic 1 + 1, strategy 1 + 1 at the end of the round; points 2 (from the deal) + 1.
    expect(t).toMatchObject({ Tactic: 2, Strategy: 2, Fleet: 3, 'Trade goods': 1, Commodities: 1 });
    await checkProblems();
  });
});

test('round 2', async () => {
  test.setTimeout(300_000);
  await test.step('round 2 start: planets ready again, tokens carry over', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    // Cronos 2, Tallin 1, Vefut II 2 resources; 1 + 2 + 2 influence.
    expect(await totals(page)).toEqual({ Resources: 5, Influence: 5, 'Trade goods': 1, Commodities: 1, Tactic: 2, Fleet: 3, Strategy: 2, VP: 3 });
    await shot(page, 'round2');
  });
  await test.step('r2-e1: my card Technology, primary: Neural Parasite listed first lacks a prerequisite; reordered it is fine', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Technology · primary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'neural parasite', /Choose Neural Parasite/);
    // Neural Parasite needs two biotic: only Neural Motivator is held.
    await dump(page, 'PARASITE-FIRST', panel(page), 3500);
    await shot(page, 'parasite-first');
    await expect(panel(page).locator('li[data-code="prerequisitesMissing"]')).toContainText(/1 missing \(biotic ×1\)/);
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'psychoarchaeology', 'Psychoarchaeology');
    await dump(page, 'PARASITE-THEN-PSYCHO', panel(page), 3500);
    note('PREREQ-AFTER-PSYCHO ' + await panel(page).locator('li[data-code]').count());
    // Reorder: remove the parasite, research it again after Psychoarchaeology.
    await panel(page).getByRole('button', { name: /^Remove Neural Parasite/ }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'neural parasite', /Choose Neural Parasite/);
    await expect(panel(page).locator('li[data-code="prerequisitesMissing"]')).toHaveCount(0);
    await dump(page, 'TECH-PRIMARY', panel(page), 3500);
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    await shot(page, 'tech-primary');
    await done(page).click();
    expect(await totals(page)).toMatchObject({ Resources: 0, Influence: 0, 'Trade goods': 0, Strategy: 2 });
  });
  await test.step('r2-e2: the secondary of Trade (a rival chose it): commodities 1 -> 3 for one strategy token', async () => {
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: '5 Trade' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Trade · secondary ability' })).toBeVisible();
    await expect(summary(page, 'Commodities')).toHaveText(/→ 3/);
    await done(page).click();
    expect(await totals(page)).toMatchObject({ Commodities: 3, Strategy: 1 });
  });
  await test.step('r2-e3: expected Sol destroyer on 39', async () => {
    await tapTile(page, 39);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await closeStage(page);
  });
  await test.step('r2-e4: tactical action to 78: the cruiser passes through 39 where Sol stands; Myru Vos waives the blocked route; a deal with Hacan', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 78);
    await expect(page.getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await dragRoute(page, [96, 39, 78]);
    await take(page, 'Cruiser');
    await page.getByRole('button', { name: 'Fly' }).click();
    await dump(page, 'ROUTE-BLOCKED', panel(page), 4000);
    await shot(page, 'route-blocked');
    await expect(open(page).filter({ hasText: /blocked|pass|ships/i })).toHaveCount(1);
    note('ROUTE-WARNING ' + flat(await open(page).first().innerText()));
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'myru vos', 'Myru Vos');
    await dump(page, 'ROUTE-AGENT', panel(page), 4500);
    await expect(open(page)).toHaveCount(0);
    const w = waived(page).filter({ hasText: /Myru Vos/ });
    await expect(w).toHaveCount(1);
    await expect(w.locator('.warning-text')).toHaveCSS('text-decoration-line', 'line-through');
    await shot(page, 'route-waived');
    // A deal with Hacan: my Ceasefire and 2 commodities for their Political Secret.
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Hac' }).click();
    const give = panel(page).getByRole('group', { name: 'Give', exact: true });
    const get = panel(page).getByRole('group', { name: 'Get', exact: true });
    await give.getByRole('button', { name: '+ Component' }).click();
    await choose(page, 'ceasefire', /^Choose Ceasefire/);
    for (let i = 0; i < 2; i += 1) await give.getByRole('button', { name: 'Add one Commodities' }).click();
    await get.getByRole('button', { name: '+ Component' }).click();
    await choose(page, 'political secret', /^Choose Political Secret/);
    await dump(page, 'TX2', panel(page), 3500);
    await shot(page, 'tx2');
    await expect(open(page)).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page).click();
    expect(await totals(page)).toMatchObject({ Tactic: 1, Commodities: 1 });
    await expect(tile(page, 78).getByRole('img', { name: 'Cruiser ×1' })).toBeVisible();
  });
  await test.step('r2-e5: tactical action to 50 with the destroyer: Sol\'s Support for the Throne returns (-1 point); the agent is exhausted already', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 50);
    await expect(page.getByText('Tactic tokens: 1 → 0')).toBeVisible();
    await dragRoute(page, [96, 50]);
    await take(page, 'Destroyer');
    await page.getByRole('button', { name: 'Fly' }).click();
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'myru vos', 'Myru Vos');
    await dump(page, 'AGENT-TWICE', panel(page), 4500);
    await shot(page, 'agent-twice');
    await expect(open(page).filter({ hasText: /exhausted/i })).toHaveCount(1);
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await stage(page).getByRole('button', { name: /^Destroyer ×1 \(The Emirates of Hacan\)/ }).click();
    await shot(page, 'battle-50');
    await closeStage(page);
    await dump(page, 'T50', panel(page), 4500);
    await done(page).click();
    const t = await totals(page);
    note('AFTER-T50 ' + JSON.stringify(t));
    // Sol's note went back: 3 - 1 points; no tactic token is left.
    expect(t).toMatchObject({ Tactic: 0, VP: 2 });
    await openGroup(page, /^Cards/);
    await dump(page, 'CARDS', drawer(page), 4000);
    await shot(page, 'cards');
    await closeDrawer(page);
    // Sol's note is back in its hand (Support for the Throne in Cards: no longer among the notes of other players).
    await expect(drawer(page)).toHaveCount(0);
  });
  await test.step('r2-e6: Hacan (expected) plays my Ceasefire: it returns to me (LRR 69.3)', async () => {
    const actions = page.getByRole('region', { name: 'Actions' });
    await actions.getByRole('button', { name: 'Hacan', exact: true }).click();
    await addAction(page, 'Component action');
    await choose(page, 'ceasefire', /^Choose Ceasefire/);
    await dump(page, 'HACAN-CEASEFIRE', panel(page), 3000);
    await done(page).click();
    await actions.getByRole('button', { name: 'Mine', exact: true }).click();
    await openGroup(page, /^Cards/);
    const notes = drawer(page).getByRole('group', { name: 'My promissory notes' });
    await expect(notes).toContainText('Ceasefirein hand');
    await expect(drawer(page).getByRole('group', { name: 'Notes of other players' })).toContainText('Political Secret');
    await shot(page, 'ceasefire-back');
    await closeDrawer(page);
  });
  await test.step('r2-e7: component action: Mining Initiative on Vefut II gives its 2 resources as trade goods', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Vefut II' }).click();
    await done(page).click();
    expect(await totals(page)).toMatchObject({ 'Trade goods': 2 });
  });
  await test.step('r2-e8: drawer: The Sowing is held, Captain Aroz unlocked (a plot card is in play)', async () => {
    await openGroup(page, /^Faction/);
    await drawer(page).getByRole('searchbox').fill('the sowing');
    await drawer(page).getByRole('button', { name: 'Add The Sowing' }).click();
    await drawer(page).getByRole('searchbox').fill('');
    const commander = drawer(page).getByRole('group', { name: 'Captain Aroz: state' });
    await commander.getByRole('button', { name: 'Unlocked' }).click();
    await expect(commander.getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await dump(page, 'FACTION2', drawer(page), 3000);
    await shot(page, 'faction2');
    await closeDrawer(page);
  });
  await test.step('r2-e9: pass: Captain Aroz and Sabotage are used; the status entry follows', async () => {
    await addAction(page, 'Pass');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'captain aroz', 'Captain Aroz');
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'sabotage', 'Sabotage');
    await dump(page, 'PASS-USED', panel(page), 3500);
    await shot(page, 'pass-used');
    await done(page).click();
  });
  await test.step('r2-e10: status phase: tokens, an objective, the hints of Neural Parasite, The Sowing and Plots Within Plots', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'diversify research', 'Diversify Research');
    await status.getByRole('button', { name: 'Add one Firmament' }).click();
    await dump(page, 'STATUS-R2', panel(page), 6000);
    await shot(page, 'status-r2');
    const hints = panel(page).getByRole('listitem', { name: 'Tokens and points' });
    for (const name of ['Plots Within Plots', 'The Sowing', 'Neural Parasite (Firmament)', 'Captain Aroz']) {
      await expect(hints.getByText(name).first()).toBeVisible();
    }
    note('STATUS-R2-TOTALS ' + JSON.stringify(await totals(page)));
    await checkProblems();
  });
});

test('round 3', async () => {
  test.setTimeout(300_000);
  await test.step('round 3 start', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
    // Planets ready again (5 resources, 5 influence); tactic 2 + 2 = 4 minus the 2 spent = ... the pool carries over as shown.
    const t = await totals(page);
    note('R3-START ' + JSON.stringify(t));
    expect(t).toMatchObject({ Resources: 5, Influence: 5, 'Trade goods': 2, Commodities: 1, Strategy: 1, VP: 3 });
  });
  await test.step('r3-e1: my card Technology again, primary: Scanlink Drone Network (free), then Planesplitter (6): two cybernetic with Sarween Tools', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'planesplitter', /Choose Planesplitter/);
    await expect(panel(page).locator('li[data-code="prerequisitesMissing"]')).toContainText(/1 missing \(cybernetic ×1\)/);
    await panel(page).getByRole('button', { name: /^Remove Planesplitter/ }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'scanlink', 'Scanlink Drone Network');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'planesplitter', /Choose Planesplitter/);
    await expect(panel(page).locator('li[data-code="prerequisitesMissing"]')).toHaveCount(0);
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    await dump(page, 'PLANESPLITTER', panel(page), 4000);
    await expect(panel(page).getByText('Planesplitter (Firmament)').first()).toBeVisible();
    await shot(page, 'planesplitter');
    await done(page).click();
    expect(await totals(page)).toMatchObject({ Resources: 0, Influence: 0, 'Trade goods': 1 });
    // The Fracture does not come into play by the card (nothing in the plan opens it): the map still has no fracture slots.
    await expect(page.getByRole('button', { name: /Fracture/ })).toHaveCount(0);
  });
  await test.step('r3-e2: relic taken in a deal-free entry; the hero is unlocked (3 objectives scored) and played; a second play warns', async () => {
    await openGroup(page, /^Faction/);
    const hero = drawer(page).getByRole('group', { name: 'Sharsiss: state' });
    await hero.getByRole('button', { name: 'Unlocked' }).click();
    await expect(hero.getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await closeDrawer(page);
    await addAction(page, 'Component action');
    await choose(page, 'sharsiss', 'Sharsiss');
    await dump(page, 'HERO', panel(page), 3500);
    await expect(open(page)).toHaveCount(0);
    await shot(page, 'hero');
    await done(page).click();
    await openGroup(page, /^Faction/);
    await expect(drawer(page).getByRole('group', { name: 'Sharsiss: state' }).getByRole('button', { name: 'Purged' })).toHaveAttribute('aria-pressed', 'true');
    await shot(page, 'hero-purged');
    await closeDrawer(page);
    await addAction(page, 'Component action');
    await choose(page, 'sharsiss', 'Sharsiss');
    await dump(page, 'HERO-TWICE', panel(page), 3500);
    await shot(page, 'hero-twice');
    await expect(open(page)).toHaveCount(1);
    note('HERO-TWICE-WARNING ' + flat(await open(page).first().innerText()));
    await done(page).click();
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Delete' }).last().click();
  });
  await test.step('r3-e3: I play Hacan\'s Political Secret (component action): the card goes back to Hacan (LRR 69.3)', async () => {
    await addAction(page, 'Component action');
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('political secret');
    await picker(page).getByRole('button', { name: 'Choose Political Secret' }).nth(1).click();
    await dump(page, 'PS-PLAY', panel(page), 3000);
    await expect(open(page)).toHaveCount(0);
    await done(page).click();
    await openGroup(page, /^Cards/);
    await dump(page, 'CARDS-R3', drawer(page), 2500);
    await expect(drawer(page).getByRole('group', { name: 'Notes of other players' })).toContainText('none');
    await closeDrawer(page);
  });
  await test.step('r3-e4: tactical action: the carrier takes three infantry and the fighter of Vefut II to 78 (two steps for a speed 1 ship: a warning, nothing blocked); deals with Letnev and Argent', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 78);
    await expect(page.getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await dragRoute(page, [20, 27, 78]);
    await take(page, 'Carrier');
    const vefut = panel(page).getByRole('group', { name: 'Vefut II' });
    await take(page, 'Infantry', 3, vefut);
    await take(page, 'Fighter');
    await page.getByRole('button', { name: 'Fly' }).click();
    await dump(page, 'CARRIER-78', panel(page), 4000);
    await shot(page, 'carrier-78');
    note('SPEED-WARNING ' + flat(await open(page).first().innerText()));
    await expect(open(page)).toHaveCount(1);
    await expect(open(page).filter({ hasText: /Carrier from Vefut II has speed 1, and the route takes 2 steps/ })).toHaveCount(1);
    // Deals. Letnev: an action card is no transaction item (warned), my commodity for their Ceasefire note.
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Let' }).click();
    let give = panel(page).getByRole('group', { name: 'Give', exact: true });
    let get = panel(page).getByRole('group', { name: 'Get', exact: true });
    await give.getByRole('button', { name: '+ Component' }).click();
    await choose(page, 'direct hit', 'Direct Hit');
    await expect(panel(page).getByText(/a transaction does not hand this over/)).toBeVisible();
    await give.getByRole('button', { name: /^Remove Direct Hit/ }).click();
    await give.getByRole('button', { name: 'Add one Commodities' }).click();
    await get.getByRole('button', { name: '+ Component' }).click();
    await choose(page, 'ceasefire', 'Ceasefire');
    await shot(page, 'tx3');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    // Argent: my trade good for their Trade Agreement note.
    await panel(page).getByRole('button', { name: '+ Transaction', exact: true }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Arg' }).click();
    give = panel(page).getByRole('group', { name: 'Give', exact: true });
    get = panel(page).getByRole('group', { name: 'Get', exact: true });
    await give.getByRole('button', { name: 'Add one Trade goods' }).click();
    await get.getByRole('button', { name: '+ Component' }).click();
    await choose(page, 'trade agreement', 'Trade Agreement');
    await dump(page, 'TX4', panel(page), 3000);
    await shot(page, 'tx4');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    // Four more cards from the deck.
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    for (const [q, n] of [['industrial initiative', 'Industrial Initiative'], ['scuttle', 'Scuttle'], ['upgrade', 'Upgrade']]) {
      await taken.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await dump(page, 'T3-FULL', panel(page), 5000);
    await done(page).click();
    const t = await totals(page);
    note('AFTER-T3 ' + JSON.stringify(t));
    expect(t).toMatchObject({ 'Trade goods': 0, Commodities: 0, Tactic: 1, VP: 3 });
    await expect(tile(page, 78).getByRole('img', { name: 'Carrier ×1' })).toBeVisible();
  });
  await test.step('r3-e5: component action: Industrial Initiative (no industrial planet of mine: 0 trade goods); Direct Hit in Used of a battle', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    await dump(page, 'INDUSTRIAL', panel(page), 3000);
    await shot(page, 'industrial');
    await done(page).click();
    note('AFTER-INDUSTRIAL ' + JSON.stringify(await totals(page)));
  });
  await test.step('r3-e6: pass: a relic is taken (Shard of the Throne) and the status phase follows', async () => {
    await addAction(page, 'Pass');
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'shard of the throne', 'Shard of the Throne');
    await dump(page, 'RELIC', panel(page), 3000);
    await shot(page, 'relic');
    await done(page).click();
    note('AFTER-RELIC ' + JSON.stringify(await totals(page)));
    await openGroup(page, /^Relics/);
    await dump(page, 'RELICS-DRAWER', drawer(page), 3000);
    await shot(page, 'relics-drawer');
    await closeDrawer(page);
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Strategy' }).click();
    await dump(page, 'STATUS-R3', panel(page), 6000);
    note('STATUS-R3-TOTALS ' + JSON.stringify(await totals(page)));
    await checkProblems();
  });
});

test('round 4', async () => {
  test.setTimeout(300_000);
  await test.step('round 4 start; my card Trade, primary: 3 trade goods, commodities to 3', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 4', exact: true })).toHaveAttribute('aria-pressed', 'true');
    note('R4-START ' + JSON.stringify(await totals(page)));
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '5 Trade' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await done(page).click();
    note('R4-TRADE ' + JSON.stringify(await totals(page)));
  });
  await test.step('r4-e2: tactical action: the carrier from 78 to Mecatol Rex (112), the three infantry land', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 112);
    await dragRoute(page, [78, 112]);
    await take(page, 'Carrier');
    const src = panel(page).getByRole('group', { name: /^Empty \(78\)/ });
    await take(page, 'Infantry', 3);
    await take(page, 'Fighter');
    await page.getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    await dump(page, 'MECATOL', panel(page), 4000);
    await shot(page, 'mecatol');
    void src;
    await done(page).click();
    note('AFTER-MECATOL ' + JSON.stringify(await totals(page)));
    await expect(tile(page, 112).getByRole('group', { name: /Mecatol Rex: 1\/6.*yours/ })).toBeVisible();
  });
  await test.step('r4-e3: tactical action on the home system: the shop builds Heaven\'s Eye (8)', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 96);
    await page.getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    await dump(page, 'SHOP-FLAGSHIP', stage(page), 2500);
    await shot(page, 'shop-flagship');
    await closeStage(page);
    await dump(page, 'T-FLAGSHIP', panel(page), 4000);
    await done(page).click();
    note('AFTER-FLAGSHIP ' + JSON.stringify(await totals(page)));
  });
  await test.step('r4-e4: pass', async () => {
    await addAction(page, 'Pass');
    await done(page).click();
  });
  await test.step('r4-e5: agenda phase (Mecatol held): a law, Fleet Regulations', async () => {
    const agendas = page.getByRole('region', { name: 'Agenda' });
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'fleet regulations', 'Fleet Regulations');
    await dump(page, 'AGENDA', panel(page), 3500);
    await shot(page, 'agenda');
    await done(page).click();
    await openGroup(page, /^Objectives/);
    await dump(page, 'LAWS', drawer(page), 3000);
    await shot(page, 'laws');
    await closeDrawer(page);
    note('AFTER-AGENDA ' + JSON.stringify(await totals(page)));
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await dump(page, 'STATUS-R4', panel(page), 5000);
    note('STATUS-R4-TOTALS ' + JSON.stringify(await totals(page)));
    await checkProblems();
  });
});

test('round 5', async () => {
  test.setTimeout(300_000);
  await test.step('round 5 start; my card Imperial: Mecatol is held, 1 point', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 5', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const t0 = await totals(page);
    note('R5-START ' + JSON.stringify(t0));
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '8 Imperial' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Imperial · primary ability' })).toBeVisible();
    await dump(page, 'IMPERIAL', panel(page), 3500);
    await shot(page, 'imperial');
    await done(page).click();
    const t1 = await totals(page);
    note('R5-IMPERIAL ' + JSON.stringify(t1));
    expect(t1.VP).toBe(t0.VP + 1);
  });
  await test.step('r5-e2: Technology secondary (a rival chose it): Infantry II (two biotic held) for a token and 4 resources; Plasma Scoring and Gravity Drive are held from the drawer', async () => {
    await openGroup(page, /^Technologies/);
    for (const [q, n] of [['plasma scoring', 'Plasma Scoring'], ['gravity drive', 'Gravity Drive']]) {
      await drawer(page).getByRole('searchbox').fill(q);
      await drawer(page).getByRole('button', { name: `Add ${n}` }).click();
    }
    await drawer(page).getByRole('searchbox').fill('');
    await dump(page, 'TECH-DRAWER', drawer(page), 4000);
    await shot(page, 'tech-drawer');
    await closeDrawer(page);
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'infantry ii', 'Infantry II');
    await expect(open(page)).toHaveCount(0);
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 4, paid 4');
    await dump(page, 'INFANTRY2', panel(page), 4000);
    await shot(page, 'infantry2');
    await done(page).click();
    note('AFTER-INF2 ' + JSON.stringify(await totals(page)));
  });
  await test.step('r5-e3: tactical action on 50 with Heaven\'s Eye; Myru Vos (readied in the status phase) and Direct Hit are used', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 50);
    await dragRoute(page, [96, 50]);
    await take(page, 'Flagship');
    await page.getByRole('button', { name: 'Fly' }).click();
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'myru vos', 'Myru Vos');
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'direct hit', 'Direct Hit');
    await dump(page, 'HEAVENS-EYE', panel(page), 5000);
    await shot(page, 'heavens-eye');
    // The agent was exhausted in round 2 and readied by the status phases since: no warning about it.
    await expect(open(page).filter({ hasText: /Myru Vos is exhausted/ })).toHaveCount(0);
    note('R5-T-WARNINGS ' + (await open(page).allInnerTexts()).map(flat).join(' || '));
    await done(page).click();
    note('AFTER-T5 ' + JSON.stringify(await totals(page)));
  });
  await test.step('r5-e4: the agent used again in the same round warns once more', async () => {
    await addAction(page, 'Pass');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'myru vos', 'Myru Vos');
    // BUG: in the editor of a pass the second use of the exhausted agent shows no warning (a tactical action and a component action do show it); the list row of the entry carries it after Done.
    await dump(page, 'PASS-AGENT-AGAIN', panel(page), 2500);
    await expect(open(page).filter({ hasText: /Myru Vos is exhausted/ })).toHaveCount(0);
    await shot(page, 'agent-again');
    await done(page).click();
    await expect(page.getByRole('region', { name: 'Actions' }).locator('.entry').filter({ hasText: /^Pass/ }).last()).toContainText('Myru Vos is exhausted');
  });
  await test.step('final: the whole plan, no page errors', async () => {
    const tab = (await page.getByRole('tab', { name: /Plan 1/ }).boundingBox())!;
    const rounds = (await page.getByRole('group', { name: 'Rounds' }).boundingBox())!;
    // BUG: with five rounds the round strip starts inside the plan tab (tab x 123-230, strip from x 145): the tab name is covered.
    expect(rounds.x).toBeLessThan(tab.x + tab.width);
    note('PLAN-TAB-BOX ' + JSON.stringify({ tab, rounds }));
    await shot(page, 'final');
    await checkProblems();
    expect(await page.getByRole('region', { name: 'Actions' }).locator('.entry').count()).toBeGreaterThan(0);
  });
});
const labels = async (p: Page, n: number) => (await tile(p, n).locator('[role="img"], [role="group"]').evaluateAll(els => els.map(e => e.getAttribute('aria-label') ?? ''))).filter(Boolean);
