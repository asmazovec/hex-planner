import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * One long game of the Emirates of Hacan, five players, Prophecy of Kings on, Thunder's Edge off, played through the interface.
 * Findings are kept as steps that assert the actual behaviour, marked `// BUG:`.
 */

const SHOTS = 'test-results/scenarios/hacan';
const MAP = '78 40 42 67 69 34 39 27 26 65 79 47 32 30 29 73 41 21 0 20 62 0 19 64 0 44 36 0 38 61 0 76 24 0 37 50';

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const stage = (page: Page) => page.locator('.stage-dialog');
const summary = (page: Page, name: string) => page.getByRole('group', { name: 'Totals, now and forecast' }).getByRole('group', { name, exact: true });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });
async function closeDrawer(page: Page): Promise<void> {
  await page.locator('.tab-fan > button[aria-pressed="true"]').first().click();
  await expect(drawer(page)).toHaveCount(0);
}
/** Opens the components sheet on a group (a tap on the group already open would fold the fan). */
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

/** The number a summary group shows (its text is the label then the value). */
async function total(page: Page, name: string): Promise<number> {
  const text = (await summary(page, name).innerText()).replace(/\s+/g, ' ').trim();
  const m = text.match(/(-?\d+)\s*$/);
  if (!m) throw new Error(`no number in ${name}: ${text}`);
  return Number(m[1]);
}
async function totals(page: Page): Promise<Record<string, number>> {
  // A forecast that equals the present rolls up before it goes; reading it earlier shows the number it had.
  await expect(page.locator('.summary-forecast-leaving')).toHaveCount(0);
  const out: Record<string, number> = {};
  for (const n of ['Resources', 'Influence', 'Trade goods', 'Commodities', 'Tactic', 'Fleet', 'Strategy', 'VP']) out[n] = await total(page, n);
  return out;
}
async function setMode(page: Page, mode: 'Forecast' | 'Now'): Promise<void> {
  await page.getByRole('group', { name: 'The map shows' }).getByRole('button', { name: mode, exact: true }).click();
}

/** A tap on a system of the map once the map stands still. */
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

test('hacan: the whole game', async ({ page }, testInfo) => {
  test.setTimeout(540_000);
  mkdirSync(SHOTS, { recursive: true });
  for (const old of readdirSync(SHOTS)) if (old.endsWith('.png') && existsSync(SHOTS + '/' + old)) unlinkSync(SHOTS + '/' + old);
  page.setDefaultTimeout(10_000);
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');

  await test.step('create the game on the first screen', async () => {
    const pick = async (n: number, f: string) => {
      await page.getByRole('group', { name: `Player ${n}` }).getByRole('button').first().click();
      await page.getByRole('button', { name: f, exact: true }).click();
    };
    await page.getByRole('group', { name: 'Player 6' }).getByRole('button', { name: 'Remove opponent' }).click();
    await pick(1, 'The Emirates of Hacan');
    await pick(2, 'The Federation of Sol');
    await pick(3, 'The Barony of Letnev');
    await pick(4, 'The Argent Flight');
    await pick(5, 'The Titans of Ul');
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: "Thunder's Edge" }).click();
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('textbox', { name: 'Game name' }).fill('Hacan long');
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Empty slot' }).first().click();
    await page.getByLabel('Tile number').fill('25');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/The map is built/)).toBeVisible();
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 18)).toBeVisible();
    await shot(page, 'start-fallback');
  });

  await test.step('FINDING: my seat holds no tile, so my start units are drawn on the first tile with one', async () => {
    // BUG: the rivals' empty home seats are drawn as dashed hexes with their units; mine stand on tile 78, next to Mecatol.
    await expect(tile(page, 78).getByRole('img', { name: 'Carrier ×2' })).toBeVisible();
    await expect(page.locator('[data-slot="0,-3"]')).toHaveAttribute('aria-label', 'Empty slot');
    // The game screen says so, and tells me to place a home system there, but the seat's slot of the minimap takes no tile number from a tap.
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    await expect(page.getByText('Seat 1 holds no tile, so the start units stand on the first tile found. Place a home system there.')).toBeVisible();
    const seatHex = (await page.locator('[data-slot="0,-3"] polygon').boundingBox())!;
    await page.mouse.click(seatHex.x + 6, seatHex.y + seatHex.height / 2);
    // BUG: no way to follow the advice by tapping; only a pasted string that has the home tile (16) in the seat's place does it.
    await expect(page.getByLabel('Tile number')).toHaveCount(0);
    await shot(page, 'seat-fixed');
  });

  await test.step('put the home system 16 into my seat', async () => {
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP.replace(' 0 ', ' 16 ') + ' ');
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.getByRole('button', { name: 'Replace map' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Empty slot' }).first().click();
    await page.getByLabel('Tile number').fill('25');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/The map is built/)).toBeVisible();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 16)).toBeVisible();
    await expect(tile(page, 16).getByRole('img', { name: 'Carrier ×2' })).toBeVisible();
    await expect(tile(page, 78).getByRole('img', { name: 'Carrier ×2' })).toHaveCount(0);
    await shot(page, 'start');
  });


  const T0 = { Resources: 3, Influence: 2, 'Trade goods': 0, Commodities: 0, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 };

  await test.step('round 1 start: the numbers of the home system and of the tokens', async () => {
    // Hercant 1/1, Arretze 2/0, Kamdorn 0/1: 3 resources, 2 influence. The pools start at 3, 3, 2 (LRR 20).
    expect(await totals(page)).toEqual(T0);
  });

  await test.step('e1: strategy card Trade, primary: 3 trade goods and the commodities replenished to the faction value 6', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '5 Trade' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await expect(summary(page, 'Trade goods')).toHaveText(/0 → 3/);
    await expect(summary(page, 'Commodities')).toHaveText(/0 → 6/);
    await done(page).click();
    expect(await totals(page)).toMatchObject({ 'Trade goods': 3, Commodities: 6, Strategy: 2, Tactic: 3 });
    await shot(page, 'trade');
  });

  await test.step('e1b: Setup puts two Sol destroyers into the wormhole system 39 (an expected fleet of a rival)', async () => {
    await tapTile(page, 39);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(tile(page, 39).getByRole('img', { name: /Destroyer ×2 \(The Federation of Sol\)/ })).toBeVisible();
  });

  await test.step('e1c: tactical action on 39, carrier with two fighters and the cruiser; space combat, a fighter of mine and both Sol destroyers are lost', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 39);
    await expect(page.getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await dragRoute(page, [16, 39]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await page.getByRole('button', { name: 'Take one Cruiser' }).click();
    await page.getByRole('button', { name: 'Take one Fighter' }).click();
    await page.getByRole('button', { name: 'Take one Fighter' }).click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await expect(panel(page).getByRole('button', { name: /^Arretze \/ Hercant \/ Kamdorn Carrier 1, Cruiser 1/ })).toBeVisible();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    // Tap a token to record a loss: one of my fighters, and both destroyers of Sol.
    await stage(page).getByRole('button', { name: 'Fighter ×2' }).click();
    await stage(page).getByRole('button', { name: /^Destroyer ×2 \(The Federation of Sol\)/ }).click();
    await stage(page).getByRole('button', { name: /^Destroyer ×1 \(The Federation of Sol\)/ }).click();
    await shot(page, 'battle');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await done(page).click();
    await expect(tile(page, 39).getByRole('img', { name: /Destroyer/ })).toHaveCount(0);
    await expect(tile(page, 39).getByRole('img', { name: 'Fighter ×1' })).toBeVisible();
    expect(await totals(page)).toMatchObject({ Tactic: 2, Fleet: 3 });
  });

  await test.step('e2: tactical action 1, carrier with two infantry and a fighter to Vefut II, landing takes the planet', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 20);
    await expect(page.getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await dragRoute(page, [16, 20]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await page.getByRole('button', { name: 'Take one Infantry' }).click();
    await page.getByRole('button', { name: 'Take one Infantry' }).click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    // The turn's transaction, a non-neighbour (Guild Ships allows it): 3 commodities given to Sol, nothing in return.
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    const waivedLine = panel(page).locator('li.warning-waived[data-code="notNeighbor"]');
    await expect(waivedLine).toContainText('Allowed by: Guild Ships');
    await expect(waivedLine.locator('.warning-text')).toHaveCSS('text-decoration-line', 'line-through');
    await expect(panel(page).locator('li[data-code="notNeighbor"]:not(.warning-waived)')).toHaveCount(0);
    for (let i = 0; i < 3; i += 1) await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: 'Add one Commodities' }).click();
    await shot(page, 'transaction');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page).click();
    // LRR 25.1: a gained planet is exhausted, so the ready totals stay 3 and 2; one tactic token is spent.
    expect(await totals(page)).toMatchObject({ Resources: 3, Influence: 2, Tactic: 1, Commodities: 3 });
    await shot(page, 'vefut');
  });

  await test.step('e3: tactical action 2 on the home system: the shop builds a cruiser and two infantry, Sarween Tools takes 1 off', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 16);
    await expect(page.getByText('Tactic tokens: 1 → 0')).toBeVisible();
    await page.getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry, Hercant', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry, Hercant', exact: true }).click();
    const shopText = (await stage(page).innerText()).replace(/\s+/g, ' ');
    await shot(page, 'shop-bought');
    // Cruiser 2 + two infantry 1 = 3, Sarween Tools (technology:st, held from the start): combined cost 2.
    // BUG: the shop counter and the payment block say 3; with Sarween Tools the combined cost is 2 (rule: reduce the combined cost of the produced units by 1) and the auto payment takes 3 resources.
    expect(shopText).toContain('Cost / resources available 3 / 6');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    const payment = panel(page).getByRole('group', { name: 'Payment' });
    await expect(payment).toContainText('Cost 3, paid 3');
    // By hand: Arretze alone pays 2, which is the true cost; the replay warns of nothing, the label still says 3.
    await payment.getByRole('button', { name: 'Choose manually' }).click();
    await payment.getByRole('button', { name: 'Hercant 1' }).click();
    await expect(payment).toContainText('Cost 3, paid 2');
    await expect(panel(page).locator('li[data-code="shortResources"]')).toHaveCount(0);
    await done(page).click();
    // Arretze is exhausted for the 2; Hercant 1/1 and Kamdorn 0/1 are ready; Vefut II is exhausted (25.1).
    expect(await totals(page)).toMatchObject({ Resources: 1, Influence: 2, Tactic: 0, 'Trade goods': 3 });
  });

  await test.step('e4: the secondary of Technology (a rival chose it): 1 strategy token and 4 resources research Gravity Drive', async () => {
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Technology · secondary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'gravity drive', 'Gravity Drive');
    // Gravity Drive has no prerequisite; the fee is 4: Hercant 1 and three trade goods (Arretze and Vefut II are exhausted).
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 4, paid 4');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Hercant 1, Trade goods 3');
    // The agent is used in the same turn: 3 commodities after the transaction, +2 up to the faction value 6.
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'carth', 'Carth of Golden Sands');
    await done(page).click();
    expect(await totals(page)).toMatchObject({ Resources: 0, Influence: 1, 'Trade goods': 0, Strategy: 1, Tactic: 0, Commodities: 5 });
    await shot(page, 'tech-secondary');
  });

  await test.step('e5: pass; the agent used a second time in the round', async () => {
    await addAction(page, 'Pass');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'carth', 'Carth of Golden Sands');
    await expect(used.getByTestId('component-leader:hacanagent')).toBeVisible();
    // The agent was exhausted by the entry before (Used): a second use in the round warns and gains nothing.
    // BUG: the second use is warned of in the list row (below), but the editor shows no warning anywhere, neither in Used nor on top.
    await expect(panel(page).getByText(/is exhausted: it is readied only in the status phase/)).toHaveCount(0);
    await shot(page, 'agent-twice');
    expect(await totals(page)).toMatchObject({ Commodities: 5 });
    await done(page).click();
    await expect(page.getByRole('region', { name: 'Actions' }).locator('.entry').filter({ hasText: /^Pass/ })).toContainText('Carth of Golden Sands is exhausted');
  });

  await test.step('e6: status phase: two tokens (tactic and strategy), the action card drawn is Mining Initiative', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Strategy' }).click();
    await expect(status).toContainText('Distribute tokens: 0 left');
    await status.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'mining initiative', 'Mining Initiative');
    await expect(status.getByTestId('component-actionCard:mining_initiative')).toBeVisible();
    await shot(page, 'status-1');
    // Tactic 0 + 1, strategy 1 + 1 at the end of the round.
    expect(await totals(page)).toMatchObject({ Tactic: 1, Strategy: 2, Fleet: 3 });
  });

  await test.step('round 2: planets are ready again, the agent is readied, the tokens carry over', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    // Hercant 1, Arretze 2, Vefut II 2 resources; Hercant 1, Kamdorn 1, Vefut II 2 influence.
    expect(await totals(page)).toEqual({ Resources: 5, Influence: 4, 'Trade goods': 0, Commodities: 5, Tactic: 1, Fleet: 3, Strategy: 2, VP: 0 });
    await shot(page, 'round2');
  });

  await test.step('r2-e1: component action: the action card Mining Initiative on Vefut II gives its 2 resources as trade goods', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Vefut II' }).click();
    await done(page).click();
    expect(await totals(page)).toMatchObject({ 'Trade goods': 2, Resources: 5 });
  });

  await test.step('r2-e2: my own card Technology: Carrier II (Antimass Deflectors and Gravity Drive are two blue) and Scanlink Drone Network (a yellow technology without prerequisite), the second for 6 resources', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Technology · primary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'carrier ii', 'Carrier II');
    // BUG: L4 Disruptors is a faction technology of the Barony of Letnev (it is in the picker of every player); a Hacan player researches it with no warning (LRR 90.10: a player gains the card from their own technology deck).
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'l4 disruptors', 'L4 Disruptors');
    await expect(panel(page).locator('li[data-code]:not(.warning-waived)')).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Remove L4 Disruptors' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'scanlink', 'Scanlink Drone Network');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    await expect(panel(page).locator('li[data-code]:not(.warning-waived)')).toHaveCount(0);
    await shot(page, 'tech-primary');
    await done(page).click();
    // Every planet but Kamdorn is exhausted, one trade good is left; my own card costs no token.
    expect(await totals(page)).toMatchObject({ Resources: 0, Influence: 1, 'Trade goods': 1, Strategy: 2 });
  });

  await test.step('r2-e3: tactical action on 27: the upgraded carrier picks up the two infantry of Vefut II and takes New Albion and Starpoint', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 27);
    await expect(page.getByText('Tactic tokens: 1 → 0')).toBeVisible();
    await dragRoute(page, [20, 27]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    const vefut = panel(page).getByRole('group', { name: 'Vefut II' });
    await vefut.getByRole('button', { name: 'Take one Infantry' }).click();
    await vefut.getByRole('button', { name: 'Take one Infantry' }).click();
    await expect(panel(page).getByText('Cargo on board: 2 of 6')).toBeVisible();
    await page.getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('group', { name: 'Landing on New Albion' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Starpoint' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await shot(page, 'r2-landing');
    await done(page).click();
    // Both planets arrive exhausted (25.1); Kamdorn is the only ready planet.
    expect(await totals(page)).toMatchObject({ Resources: 0, Influence: 1, Tactic: 0 });
    await expect(tile(page, 27).getByRole('group', { name: /New Albion: 1\/1, Biotic, yours/ })).toBeVisible();
  });

  await test.step('r2-e4: the secondary of Trade (a rival chose it): Masters of Trade makes it cost no command token', async () => {
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: '5 Trade' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Trade · secondary ability' })).toBeVisible();
    // Without the ability the card would show "-1 strategy token", as the Technology secondary does.
    await expect(panel(page).getByRole('group', { name: 'Card mode' }).getByRole('button', { name: /^Secondary/ })).not.toContainText('strategy token');
    await expect(summary(page, 'Commodities')).toHaveText(/→ 6/);
    await done(page).click();
    expect(await totals(page)).toMatchObject({ Commodities: 6, Strategy: 2 });
  });

  await test.step('r2-e5: the secondary of Politics (a rival chose it) costs a token; two action cards are taken', async () => {
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: '3 Politics' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Politics · secondary ability' })).toBeVisible();
    await expect(panel(page).getByRole('group', { name: 'Card mode' }).getByRole('button', { name: /^Secondary/ })).toContainText('strategy token');
    const taken = panel(page).getByRole('group', { name: 'In this turn' }).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'scuttle', 'Scuttle');
    await done(page).click();
    expect(await totals(page)).toMatchObject({ Strategy: 1 });
  });

  await test.step('r2-e6: component action: Industrial Initiative gives 1 trade good for the one industrial planet, New Albion', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    await done(page).click();
    // 1 left of the technology fee + 1.
    expect(await totals(page)).toMatchObject({ 'Trade goods': 2 });
  });

  await test.step('r2-e7: pass with two transactions: an action card to Letnev (Arbiters, Guild Ships), Trade Convoys to Sol', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Letnev' }).click();
    await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: '+ Component' }).click();
    await choose(page, 'scuttle', 'Scuttle');
    await expect(panel(page).locator('li.warning-waived[data-code="transactionKind"]')).toContainText('Allowed by: Arbiters');
    await expect(panel(page).locator('li.warning-waived[data-code="notNeighbor"]')).toContainText('Allowed by: Guild Ships');
    await expect(panel(page).locator('li[data-code]:not(.warning-waived)')).toHaveCount(0);
    await shot(page, 'arbiters');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    // Second transaction, with another player (one per player per turn, Hacan note 3): the faction promissory note.
    await panel(page).getByRole('button', { name: '+ Transaction', exact: true }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sol' }).click();
    await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: '+ Component' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('trade convoys');
    await picker(page).getByRole('button', { name: /^Choose Trade Convoys/ }).first().click();
    await expect(panel(page).locator('li.warning-waived[data-code="notNeighbor"]')).toHaveCount(2);
    await expect(panel(page).locator('li[data-code]:not(.warning-waived)')).toHaveCount(0);
    await shot(page, 'convoys-given');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page).click();
  });


  await test.step('r2-sol: Sol (expected) plays Trade Convoys, then activates the system 39 where my ships stand: the note goes back to me', async () => {
    await tapTile(page, 78);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Sol' }).click();
    await addAction(page, 'Component action');
    await choose(page, 'trade convoys', 'Trade Convoys');
    expect(await panel(page).locator('li[data-code]').count()).toBe(0);
    await done(page).click();
    // The note lies in Sol's play area now: it is no longer in my hand.
    const notes = () => drawer(page).getByRole('group', { name: 'My promissory notes' });
    await openGroup(page, /^Cards/);
    await expect(notes()).toContainText('Trade Convoyswith Sol');
    await closeDrawer(page);
    await addAction(page, 'Tactical action');
    await tapTile(page, 39);
    await dragRoute(page, [78, 39]);
    await page.getByRole('button', { name: 'Take one Cruiser' }).click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await done(page).click();
    // Sol activated a system with the Hacan's units: the note is back (Trade Convoys).
    await openGroup(page, /^Cards/);
    await expect(notes()).toContainText('Trade Convoysin hand');
    await shot(page, 'convoys-back');
    await closeDrawer(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine' }).click();
  });

  await test.step('r2-e8: status phase: two tactic tokens; the action card drawn is Upgrade', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'upgrade', 'Upgrade');
    expect(await totals(page)).toMatchObject({ Tactic: 2, Strategy: 1, Fleet: 3, 'Trade goods': 2, Commodities: 6 });
  });

  await test.step('round 3 start: the six planets are ready: 9 resources, 6 influence', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
    // Hercant 1, Arretze 2, Kamdorn 0, Vefut II 2, New Albion 1, Starpoint 3 resources; 1, 0, 1, 2, 1, 1 influence.
    expect(await totals(page)).toEqual({ Resources: 9, Influence: 6, 'Trade goods': 2, Commodities: 6, Tactic: 2, Fleet: 3, Strategy: 1, VP: 0 });
    await shot(page, 'round3');
  });

  await test.step('r3-e1: my card Technology again: Transit Diodes (two yellow: Sarween Tools, Scanlink) and then Quantum Datahub Node (three yellow)', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Technology · primary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'transit diodes', 'Transit Diodes');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'quantum datahub', 'Quantum Datahub Node');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    // Without Transit Diodes Quantum Datahub Node has two yellow only (Sarween Tools, Scanlink): the prerequisite is missing and warned of.
    await panel(page).getByRole('button', { name: 'Remove Transit Diodes' }).click();
    const missing = panel(page).locator('li[data-code]:not(.warning-waived)');
    await expect(missing).toHaveCount(1);
    await expect(missing.first()).toContainText('The prerequisites of Quantum Datahub Node are not met: 1 missing (cybernetic ×1)');
    // The order counts: researched in the order of the list, so Quantum Datahub Node goes after Transit Diodes.
    await panel(page).getByRole('button', { name: 'Remove Quantum Datahub Node' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'transit diodes', 'Transit Diodes');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'quantum datahub', 'Quantum Datahub Node');
    await expect(panel(page).locator('li[data-code]:not(.warning-waived)')).toHaveCount(0);
    await shot(page, 'r3-tech');
    // The relic found in the round (an exploration card) is taken in this turn.
    const takenR3 = panel(page).getByRole('group', { name: 'In this turn' }).getByRole('group', { name: 'Taken and discarded' });
    await takenR3.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'dynamis core', 'Dynamis Core');
    await done(page).click();
  });

  await test.step('r3-e2: component action: the relic Dynamis Core gives trade goods equal to the commodity value, which it raised by 2: 6 + 2 = 8', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'dynamis core', 'Dynamis Core');
    expect(await totals(page)).toMatchObject({ 'Trade goods': 10, Commodities: 6 });
    await shot(page, 'dynamis');
    await done(page).click();
  });

  await test.step('r3-leaders: ten trade goods unlock the commander Gila the Silvertongue (set by hand in the drawer); the relic is purged', async () => {
    await openGroup(page, /^Faction/);
    const commander = drawer(page).getByTestId('component-leader:hacancommander');
    await commander.locator('.segment > button').nth(1).click();
    await expect(commander.locator('.segment > button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await shot(page, 'leaders');
    await closeDrawer(page);
  });

  await test.step('r3-e3: component action: Quantum Datahub Node: one strategy token and three trade goods to Letnev', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'quantum datahub', 'Quantum Datahub Node');
    await panel(page).getByRole('group', { name: 'Quantum Datahub Node' }).getByRole('button', { name: 'Letnev' }).click();
    await expect(panel(page).locator('li[data-code]:not(.warning-waived)')).toHaveCount(0);
    await done(page).click();
    expect(await totals(page)).toMatchObject({ 'Trade goods': 7, Strategy: 0 });
  });

  await test.step('r3-e4: tactical action on Mecatol Rex: the carrier at 27 picks up the infantry of New Albion and Starpoint and flies two systems', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 18);
    await expect(page.getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await dragRoute(page, [27, 78, 18]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await panel(page).getByRole('group', { name: 'New Albion' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Starpoint' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await expect(panel(page).getByText('Cargo on board: 2 of 6')).toBeVisible();
    // Carrier II moves 2: two systems, no warning of the speed.
    await expect(panel(page).locator('li[data-code="speedShort"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Mecatol Rex' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Mecatol Rex' }).getByRole('button', { name: 'Land one Infantry' }).click();
    // BUG: removing the custodians token costs 6 influence (LRR 27.2, 54.1). The interface has no place to pay it, and the replay always says "paid 0":
    // the warning "Not enough influence: need 6, paid 0" stands on the entry whatever the player owns, and no influence or trade good is spent.
    await expect(panel(page).locator('li[data-code="custodians"]')).toContainText('removing it costs 6 influence, which the plan does not record');
    await expect(panel(page).locator('li[data-code="shortInfluence"]:not(.warning-waived)')).toContainText('need 6, paid 0, short by 6');
    await shot(page, 'mecatol');
    await done(page).click();
    await expect(tile(page, 18).getByRole('group', { name: /Mecatol Rex: 1\/6.*yours/ })).toBeVisible();
    // The first landing on Mecatol Rex removes the custodians token: 1 victory point (27.3).
    expect(await totals(page)).toMatchObject({ Tactic: 1, VP: 1 });
  });

  await test.step('r3-hero: the hero Harrugh Gefhara is set to unlocked by hand (three scored objectives)', async () => {
    await openGroup(page, /^Faction/);
    const hero = drawer(page).getByTestId('component-leader:hacanhero');
    await hero.locator('.segment > button').nth(1).click();
    await expect(hero.locator('.segment > button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await closeDrawer(page);
  });

  await test.step('r3-e5: tactical action on the home system: Upgrade swaps the cruiser for a dreadnought, the hero makes the production cost 0', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 16);
    await expect(page.getByText('Tactic tokens: 1 → 0')).toBeVisible();
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'upgrade', 'Upgrade');
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'harrugh', 'Harrugh Gefhara');
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Mech, Hercant', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Mech, Hercant', exact: true }).click();
    await shot(page, 'hero-shop');
    // A fourth unit is over the production value 3 (2 + the resources of Hercant); the hero does not lift the limit (Hacan note 1).
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(panel(page).locator('li[data-code="productionOver"]')).toContainText('Production 3, and 4 units are built');
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: /^Give back Destroyer/ }).click();
    // BUG: the shop's counter reads the printed prices only: 8 + 2 + 2 = 12 against 10, while the hero makes it 0 (and Sarween Tools takes 1 off otherwise).
    expect((await stage(page).innerText()).replace(/\s+/g, ' ')).toContain('Cost / resources available 12 / 10');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    // The entry itself owes nothing: no payment block, no shortage.
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toHaveCount(0);
    await expect(panel(page).locator('li[data-code="shortResources"]')).toHaveCount(0);
    await expect(panel(page).locator('li[data-code]:not(.warning-waived)')).toHaveCount(0);
    await done(page).click();
    await expect(tile(page, 16).getByRole('img', { name: 'Dreadnought ×1' })).toBeVisible();
    await expect(tile(page, 16).getByRole('img', { name: /^Cruiser/ })).toHaveCount(0);
    await expect(tile(page, 16).getByRole('img', { name: 'Flagship ×1' })).toBeVisible();
    await expect(tile(page, 16).getByRole('img', { name: 'Mech ×2' })).toBeVisible();
    // Trade goods stay at 7: nothing was paid.
    expect(await totals(page)).toMatchObject({ 'Trade goods': 7, Tactic: 0 });
  });

  await test.step('r3-sol: Sol (expected) attacks my home system with its cruiser from 39; the flagship Wrath of Kenara is shown in the battle', async () => {
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Sol' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 16);
    await dragRoute(page, [39, 16]);
    await page.getByRole('button', { name: 'Take one Cruiser' }).click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await shot(page, 'flagship-battle');
    // The flagship is on the hex, but its ability (spend a trade good for +1 on a die) is shown nowhere in the battle step.
    await expect(stage(page).getByRole('button', { name: /^Flagship/ })).toBeVisible();
    await expect(stage(page)).not.toContainText('trade good');
    await stage(page).getByRole('button', { name: /^Cruiser ×1 \(The Federation of Sol\)/ }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await done(page).click();
    await expect(tile(page, 16).getByRole('img', { name: /^Cruiser.*Federation of Sol/ })).toHaveCount(0);
    await expect(tile(page, 39).getByRole('img', { name: /Cruiser.*Federation of Sol/ })).toHaveCount(0);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine' }).click();
  });

  await test.step('r3-e6: pass', async () => {
    await addAction(page, 'Pass');
    await done(page).click();
  });

  await test.step('r3-e7: status phase: Diversify Research is scored (two blue and four yellow technologies), two strategy tokens, Bribery drawn', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Add one Strategy' }).click();
    await status.getByRole('button', { name: 'Add one Strategy' }).click();
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'diversify', 'Diversify Research');
    await status.getByRole('group', { name: 'Hacan' }).getByRole('button', { name: 'Add one Hacan' }).click();
    await status.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'bribery', 'Bribery');
    await shot(page, 'status-3');
  });

  await test.step('r3-e8: agenda phase (I hold Mecatol Rex): a law passes; Bribery spends trade goods, the commander Gila the Silvertongue is named in Used', async () => {
    const agendas = page.getByRole('region', { name: 'Agenda' });
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'anti-intellectual', 'Anti-Intellectual Revolution');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'bribery', 'Bribery');
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'gila', 'Gila the Silvertongue');
    for (let i = 0; i < 3; i += 1) await used.getByRole('button', { name: 'Add one Trade goods spent' }).click();
    // Gila: 2 more trade goods for 4 votes, entered by hand as the numbers of the outcome (the commander is a reminder only).
    await panel(page).getByRole('button', { name: 'Remove one Trade goods' }).first().click();
    await panel(page).getByRole('button', { name: 'Remove one Trade goods' }).first().click();
    await expect(panel(page).locator('li[data-code]:not(.warning-waived)')).toHaveCount(0);
    await done(page).click();
    // 7 trade goods - 3 (Bribery) - 2 (by hand).
    expect(await totals(page)).toMatchObject({ 'Trade goods': 2 });
    await shot(page, 'agenda');
  });

  await test.step('round 4 start: planets ready, the strategy tokens carry over', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 4', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(await totals(page)).toMatchObject({ Resources: 10, Influence: 12, 'Trade goods': 2, Commodities: 6, Tactic: 0, Fleet: 3, Strategy: 2, VP: 2 });
  });

  await test.step('r4-e1: my card Technology: Neural Motivator (green, no prerequisite) and Production Biomes (two green): the second green is the specialty of New Albion', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'neural motivator', 'Neural Motivator');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'production biomes', 'Production Biomes');
    await expect(panel(page).locator('li[data-code="prerequisitesMissing"]')).toContainText('1 missing (biotic ×1)');
    const specialties = panel(page).getByRole('group', { name: 'Technology specialties' });
    await specialties.getByRole('button', { name: /New Albion/ }).click();
    await expect(panel(page).locator('li[data-code="prerequisitesMissing"]')).toHaveCount(0);
    await expect(panel(page).locator('li[data-code]:not(.warning-waived)')).toHaveCount(0);
    await shot(page, 'pm-research');
    await done(page).click();
    // New Albion is exhausted for the prerequisite, the fee of 6 is paid by planets: 10 - 1 - 6 = 3 resources are left.
    expect(await totals(page)).toMatchObject({ Resources: 3, Strategy: 2 });
  });

  await test.step('r4-e2: component action: Production Biomes: 1 strategy token, 4 trade goods to me, 2 to Sol', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'production biomes', 'Production Biomes');
    await panel(page).getByRole('group', { name: 'Production Biomes' }).getByRole('button', { name: 'Sol' }).click();
    await expect(panel(page).locator('li[data-code]:not(.warning-waived)')).toHaveCount(0);
    await done(page).click();
    expect(await totals(page)).toMatchObject({ 'Trade goods': 6, Strategy: 1 });
  });

  await test.step('r4-e3: Production Biomes a second time in the round: the card is exhausted, nothing is gained and a token is still asked', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'production biomes', 'Production Biomes');
    await panel(page).getByRole('group', { name: 'Production Biomes' }).getByRole('button', { name: 'Letnev' }).click();
    await expect(panel(page).locator('li[data-code="componentExhausted"]:not(.warning-waived)')).toContainText('Production Biomes is exhausted');
    expect(await totals(page)).toMatchObject({ 'Trade goods': 6, Strategy: 1 });
    await shot(page, 'pm-twice');
  });

  /** Everything a player reads: per round the totals in forecast and in now mode and the rows of the plan; the totals of the whole game. */
  async function snapshot(): Promise<unknown> {
    const out: unknown[] = [];
    const rounds = await page.getByRole('group', { name: 'Rounds' }).getByRole('button').evaluateAll(b => b.map(x => x.getAttribute('aria-label') ?? '').filter(x => /^Round \d+$/.test(x)));
    for (const name of rounds) {
      await page.getByRole('button', { name, exact: true }).click();
      await setMode(page, 'Forecast');
      const forecast = await totals(page);
      const rows = await page.getByRole('region', { name: 'Actions' }).locator('.entry').allInnerTexts();
      const status = await page.getByRole('region', { name: 'Status' }).locator('li').count();
      await setMode(page, 'Now');
      const now = await totals(page);
      await setMode(page, 'Forecast');
      out.push({ name, forecast, now, rows: rows.map(r => r.replace(/\s+/g, ' ')), status });
    }
    return out;
  }

  await test.step('twist: the game is exported to a file in the middle of round 4, deleted, imported back and reloaded: every number and row is the same', async () => {
    const before = await snapshot();
    await page.getByRole('button', { name: 'Round 4', exact: true }).click();
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export to file' }).click();
    const file = testInfo.outputPath('hacan.json');
    await (await download).saveAs(file);
    const exported = JSON.parse(readFileSync(file, 'utf8')) as { faction: string; plans: { rounds: { entries: { owner?: string; type: string }[] }[] }[] };
    expect(exported.faction).toBe('hacan');
    expect(exported.plans[0].rounds.length).toBe(4);
    const entryCount = exported.plans[0].rounds.reduce((sum, round) => sum + round.entries.length, 0);
    const mine = exported.plans[0].rounds.flatMap(round => round.entries).filter(e => e.owner === undefined);
    console.log('MINE', mine.length, 'of', entryCount, JSON.stringify(mine.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.type]: (acc[e.type] ?? 0) + 1 }), {})));
    expect(mine.length).toBeGreaterThanOrEqual(25);
    expect(entryCount).toBeGreaterThanOrEqual(25);

    // Delete the save from the list (with its confirmation).
    const row = page.locator('.saved-list li').filter({ hasText: 'Hacan long' });
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: /Delete|Remove/ }).first().click();
    await row.getByRole('button', { name: 'Delete for good' }).click().catch(async () => { await page.getByRole('button', { name: 'Delete for good' }).click(); });
    await expect(page.locator('.saved-list li').filter({ hasText: 'Hacan long' })).toHaveCount(0);
    await shot(page, 'deleted');
    await page.locator('input[type=file]').setInputFiles({ name: 'hacan.json', mimeType: 'application/json', buffer: readFileSync(file) });
    await expect(page.locator('.saved-list li').filter({ hasText: 'Hacan long' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 16)).toBeVisible();
    const imported = (await snapshot()) as { rows: string[] }[];
    // Rounds 1 to 3 come back exactly.
    expect(imported.slice(0, 3)).toEqual((before as unknown[]).slice(0, 3));
    // BUG: the import drops the technology specialty of round 4 (src/storage/schema.ts: `effects` has no `specialties`): New Albion is not exhausted for the
    // prerequisite any more, so the entry warns of the missing prerequisite and the totals of the forecast change.
    expect(imported[3]).not.toEqual((before as unknown[])[3]);
    expect(imported[3].rows[0]).toContain('The prerequisites of Production Biomes are not met: 1 missing (biotic ×1).');
    // Put the specialty back by hand: the game is as it was.
    const putSpecialtyBack = async () => {
      await page.getByRole('button', { name: 'Round 4', exact: true }).click();
      await page.getByRole('button', { name: 'Edit: Strategy: Technology' }).click();
      await panel(page).getByRole('group', { name: 'Technology specialties' }).getByRole('button', { name: /New Albion/ }).click();
      await done(page).click();
    };
    await putSpecialtyBack();
    expect(await snapshot()).toEqual(before);

    // BUG: a plain reload of the page loses the specialty again (the same schema reads the save), so the game of the import is not the game after a reload.
    await page.reload();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 16)).toBeVisible();
    const reloaded = (await snapshot()) as { rows: string[] }[];
    expect(reloaded.slice(0, 3)).toEqual((before as unknown[]).slice(0, 3));
    expect(reloaded[3].rows[0]).toContain('The prerequisites of Production Biomes are not met');
    await putSpecialtyBack();
    expect(await snapshot()).toEqual(before);
    await page.getByRole('button', { name: 'Round 4', exact: true }).click();
    await shot(page, 'after-import');
  });

  await test.step('r4-e4: pass and the status phase of round 4: tokens, no objective', async () => {
    await addAction(page, 'Pass');
    // The hero was purged by its use: named in Used again, it is not held (and the pass says so in its row).
    const usedPass = panel(page).getByRole('group', { name: 'Used' });
    await usedPass.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'harrugh', 'Harrugh Gefhara');
    // BUG: no warning in the editor for the purged hero named in Used (the row of the plan has it, below).
    await expect(panel(page).locator('li[data-code]')).toHaveCount(0);
    // The planet card of a mech may be traded (Pride of Kenara): is a planet offered in a transaction?
    await panel(page).getByRole('button', { name: '+ Transaction', exact: true }).click();
    await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: '+ Component' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('Hercant');
    // A planet card cannot be given in a transaction (nothing is found for a planet), so the trade of the mech Pride of Kenara is not enterable.
    await expect(picker(page).locator('[data-testid^="component-planet"]')).toHaveCount(0);
    await expect(picker(page)).toContainText('Nothing found.');
    await picker(page).getByRole('button', { name: 'Close' }).click();
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await shot(page, 'pass-r4');
    await done(page).click();
    await expect(page.getByRole('region', { name: 'Actions' }).locator('.entry').filter({ hasText: /^Pass/ }).last()).toContainText('Harrugh Gefhara');
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await expect(status).toContainText('Distribute tokens: 0 left');
    expect(await totals(page)).toMatchObject({ Tactic: 2, Strategy: 1, Fleet: 3, VP: 2 });
    await shot(page, 'round4-end');
  });

  await test.step('the components drawer holds what the plan did: technologies, leaders, relic, law and objective', async () => {
    await openGroup(page, /^Technologies/);
    const techs = drawer(page).getByRole('group', { name: 'Researched technologies' });
    await expect(drawer(page).getByRole('group', { name: 'Unit upgrades' })).toContainText('4 → 6');
    for (const name of ['Sarween Tools', 'Antimass Deflectors', 'Gravity Drive', 'Scanlink Drone Network', 'Transit Diodes', 'Quantum Datahub Node', 'Neural Motivator', 'Production Biomes']) {
      await expect(techs).toContainText(name);
    }
    await expect(groupTab(page, /^Technologies · 9/)).toBeVisible();
    await shot(page, 'drawer-technologies');
    await openGroup(page, /^Faction/);
    const state = async (id: string) => drawer(page).getByTestId(`component-leader:${id}`).locator('.segment > button[aria-pressed="true"]').innerText();
    // The agent is readied by the status phase, the commander is unlocked by hand, the hero was purged by its use.
    expect([await state('hacanagent'), await state('hacancommander'), await state('hacanhero')]).toEqual(['Unlocked', 'Unlocked', 'Purged']);
    await shot(page, 'drawer-faction-end');
    await openGroup(page, /^Relics/);
    await expect(drawer(page)).toContainText('Relicsnone');
    await openGroup(page, /^Objectives/);
    await expect(drawer(page).getByRole('group', { name: 'Laws' })).toContainText('Anti-Intellectual Revolution');
    await expect(drawer(page)).toContainText('Diversify Research');
    await shot(page, 'drawer-objectives');
    await closeDrawer(page);
  });

  await test.step('now and forecast: with every entry of round 1 marked done, the "now" totals are the numbers at the end of round 1', async () => {
    await page.getByRole('button', { name: 'Round 1', exact: true }).click();
    const boxes = page.getByRole('region', { name: 'Actions' }).getByRole('checkbox', { name: 'Done' });
    const statusBox = page.getByRole('region', { name: 'Status' }).getByRole('checkbox', { name: 'Done' });
    const n = await boxes.count();
    expect(n).toBe(6);
    for (let i = 0; i < n; i += 1) {
      await boxes.nth(i).check();
      await page.waitForTimeout(200);
    }
    await statusBox.first().check();
    await setMode(page, 'Now');
    // The status entry done: the planets are ready again (Hercant 1, Arretze 2, Vefut II 2 resources); tokens: tactic 3 - 3 + 1, strategy 2 - 1 + 1.
    expect(await totals(page)).toEqual({ Resources: 5, Influence: 4, 'Trade goods': 0, Commodities: 5, Tactic: 1, Fleet: 3, Strategy: 2, VP: 0 });
    await shot(page, 'now-mode');
    await setMode(page, 'Forecast');
    await page.getByRole('button', { name: 'Round 4', exact: true }).click();
    expect(await totals(page)).toMatchObject({ Tactic: 2, VP: 2 });
  });

  await test.step('the game screen shows the sheet of the Emirates: flagship, mech, abilities and leaders', async () => {
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    const sheet = page.locator('main').first();
    await expect(sheet).toContainText('Pride of Kenara');
    await expect(sheet).toContainText('Masters of Trade');
    await expect(sheet).toContainText('Wrath of Kenara');
    await shot(page, 'game-screen');
    await page.getByRole('button', { name: 'Plan & map' }).click();
  });

  expect(problems).toEqual([]);
});
