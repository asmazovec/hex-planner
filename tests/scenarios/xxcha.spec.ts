import { expect, test, type Locator, type Page } from '@playwright/test';

// ring 1, ring 2, ring 3 (clockwise from the top); homes: seat 1 Xxcha 14, seat 2 Hacan 16, seat 3 Argent 58
const R1 = [19, 20, 21, 22, 23, 24];
const R2 = [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];
const R3 = [14, 37, 38, 39, 40, 41, 16, 42, 43, 44, 45, 46, 58, 47, 48, 49, 50, 59];
const MAP = [...R1, ...R2, ...R3].join(' ');
const panel = (page: Page) => page.locator('.plan-panel');
const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const shot = (page: Page, name: string) => page.screenshot({ path: `test-results/scenarios/xxcha/${name}.png` });

async function setup(page: Page) {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Remove opponent' }).last().click();
  await page.getByRole('button', { name: "Thunder's Edge" }).click();
  await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'My faction', exact: true }).click();
  await page.getByRole('button', { name: 'The Xxcha Kingdom' }).click();
  const rivals = ['The Emirates of Hacan', 'The Argent Flight'];
  for (let i = 0; i < rivals.length; i++) {
    await page.getByRole('group', { name: 'Player ' + (i + 2) }).getByRole('button', { name: 'Opponent', exact: true }).click();
    await page.getByRole('button', { name: rivals[i] }).click();
  }
  await page.getByRole('textbox', { name: 'Game name' }).fill('Xxcha');
  await page.getByRole('button', { name: 'Paste a Milty string' }).click();
  await page.getByLabel('Milty Draft map string').fill(MAP);
  await page.getByRole('button', { name: 'Apply' }).click();
  await shot(page, '00-milty');
  await page.getByRole('button', { name: 'Close' }).click();
  await shot(page, '01-game');
}

async function start(page: Page) {
  await setup(page);
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await expect(tile(page, 14)).toBeVisible();
}
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const openDrawer = async (page: Page, group?: RegExp) => {
  if (!(await drawer(page).count())) await page.getByRole('button', { name: /^Components/ }).click();
  await expect(drawer(page)).toBeVisible();
  if (group) {
    const tab = page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name: group });
    if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click();
  }
};


async function stillBox(target: Locator) {
  let last = '';
  await expect.poll(async () => { const now = JSON.stringify(await target.boundingBox()); const still = now === last; last = now; return still; }, { intervals: [150] }).toBe(true);
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function dragRoute(page: Page, hexes: number[]) {
  const pts = [];
  for (const n of hexes) pts.push(await stillBox(tile(page, n)));
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.mouse.up();
}
async function tapTile(page: Page, n: number) { const p = await stillBox(tile(page, n)); await page.mouse.click(p.x, p.y); }
async function totals(page: Page) {
  return page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[role=group]')]
    .filter(g => !g.closest('.plan-panel') && /^(Resources|Influence|Trade goods|Commodities|Tactic|Fleet|Strategy|VP)$/.test(g.getAttribute('aria-label') ?? ''))
    .map(g => [g.getAttribute('aria-label')!, (g as HTMLElement).innerText.replace(/\s+/g, ' ').replace(g.getAttribute('aria-label')! + ' ', '')])));
}
const take = (page: Page, unit: string) => page.getByRole('button', { name: `Take one ${unit}` }).first().click();
const addAction = async (page: Page, type: string) => { await page.getByRole('button', { name: 'Add action' }).click(); await page.locator('.action-list').getByRole('button', { name: type, exact: true }).click(); };
const done = async (page: Page) => {
  await page.locator('.plan-panel').evaluate(e => { let n: HTMLElement | null = e as HTMLElement; while (n) { n.scrollTop = 0; n = n.parentElement; } });
  await page.getByRole('button', { name: 'Done', exact: true }).click({ timeout: 8000 });
};
const choose = async (page: Page, query: string, name: string) => {
  await picker(page).getByRole('searchbox', { name: 'Search components' }).fill(query);
  await picker(page).getByRole('button', { name: `Choose ${name}` }).click();
  await expect(picker(page)).toHaveCount(0);
};
const cards = async (page: Page, main: string, second: string) => {
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: main }).click();
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: second }).click();
};
const warns = (page: Page) => page.locator('.plan-panel li[data-code]').evaluateAll(els => els.map(e => e.getAttribute('data-code') + (e.classList.contains('warning-waived') ? '(waived)' : '') + ' ' + (e.textContent ?? '').slice(0, 160)));
const text = async (page: Page, from = '', len = 1500) => { const t = await panel(page).innerText(); const i = from ? t.indexOf(from) : 0; return t.slice(Math.max(i, 0), Math.max(i, 0) + len); };




const closeDrawer = async (page: Page) => {
  await page.getByRole('group', { name: 'Drawers' }).locator('button[aria-pressed="true"]').click();
  await expect(drawer(page)).toHaveCount(0);
};

/** The summary bar, as shown: "now → forecast" when they differ. */
async function expectTotals(page: Page, want: Partial<Record<'Resources' | 'Influence' | 'Trade goods' | 'Commodities' | 'Tactic' | 'Fleet' | 'Strategy' | 'VP', string>>) {
  await expect.poll(async () => {
    const got = await totals(page);
    return Object.fromEntries(Object.keys(want).map(k => [k, got[k]]));
  }, { timeout: 5000, intervals: [150] }).toEqual(want);
}

test('xxcha game', async ({ page }) => {
  page.setDefaultTimeout(8000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const entries = (p: Page) => p.locator('.plan-panel li.entry');
  const tick = (i: number) => entries(page).nth(i).locator('label.entry-check');
  const stage = page.locator('.stage-dialog');
  const nowMode = async () => { await page.getByRole('button', { name: 'Now', exact: true }).click(); await expect(page.getByRole('button', { name: 'Now', exact: true })).toHaveAttribute('aria-pressed', 'true'); };
  const forecastMode = async () => { await page.getByRole('button', { name: 'Forecast', exact: true }).click(); await expect(page.getByRole('button', { name: 'Forecast', exact: true })).toHaveAttribute('aria-pressed', 'true'); };
  const codes = async () => (await warns(page)).map(w => w.split(' ')[0]);
  const rowOf = (i: number) => entries(page).nth(i);
  const closeStage = () => stage.getByRole('button', { name: 'Close' }).click();
  const prodStage = async () => { await panel(page).getByRole('button', { name: /^Production/ }).click(); };
  const roundBtn = (n: number) => page.getByRole('group', { name: 'Rounds' }).getByRole('button', { name: `Round ${n}` });

  await start(page);

  await test.step('start of the game: faction sheet numbers', async () => {
    // Xxcha home 14: Archon Ren 2/3 and Archon Tau 1/1; 3 tactic, 3 fleet, 2 strategy tokens; commodities are 0 until replenished.
    await expectTotals(page, { Resources: '3', Influence: '4', 'Trade goods': '0', Commodities: '0', Tactic: '3', Fleet: '3', Strategy: '2', VP: '0' });
    await shot(page, '10-start');
    // Components: the Graviton Laser System at the start; agent unlocked (LRR 51.4), commander and hero locked.
    await openDrawer(page, /^Technologies/);
    await expect(drawer(page).getByRole('group', { name: 'Researched technologies' })).toContainText('Graviton Laser System');
    await openDrawer(page, /^Cards/);
    await expect(drawer(page)).toContainText('Political Favor');
    await shot(page, '11-cards');
    await openDrawer(page, /^Faction/);
    const seg = await drawer(page).getByRole('button', { name: /^(Locked|Unlocked|Exhausted|Purged)$/ }).evaluateAll(e => e.map(x => x.textContent + '=' + x.getAttribute('aria-pressed')));
    expect(seg).toEqual(['Locked=false', 'Unlocked=true', 'Exhausted=false', 'Locked=true', 'Unlocked=false', 'Locked=true', 'Unlocked=false', 'Purged=false']);
    // set commander and hero to unlocked by hand (their conditions are not tracked for the state of the start)
    const unl = drawer(page).getByRole('button', { name: 'Unlocked', exact: true });
    await unl.nth(1).click();
    await unl.nth(2).click();
    await shot(page, '12-leaders');
    await closeDrawer(page);
  });

  await test.step('start units of the Xxcha home in the big hex', async () => {
    await tapTile(page, 14);
    await expect(stage).toBeVisible();
    console.log('HOME', JSON.stringify(await stage.locator('g[aria-label], img[aria-label]').evaluateAll(e => e.map(x => x.getAttribute('aria-label')))));
    await shot(page, '10b-home-hex');
    await closeStage();
  });

  await test.step('R1 strategy cards: Technology main, Diplomacy second', async () => {
    await cards(page, '7 Technology', '2 Diplomacy');
    await expect(page.getByText('Main: 7 Technology · Second: 2 Diplomacy')).toBeVisible();
  });

  await test.step('R1 e1 Technology primary: Neural Motivator is free', async () => {
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'neural', 'Neural Motivator');
    await expect(page.getByText('Technology: 1')).toBeVisible();
    await expect(page.getByText('To pay: 0.')).toBeVisible();
    await expectTotals(page, { Resources: '3', Influence: '4', Strategy: '2', Tactic: '3' });
    await done(page);
  });

  await test.step('R1 e2 tactical Quann: carrier, 2 infantry, 2 fighters', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 25);
    await page.waitForTimeout(1200);
    await dragRoute(page, [14, 25]);
    await take(page, 'Carrier');
    for (let i = 0; i < 2; i++) await page.getByRole('group', { name: '14', exact: true }).getByRole('button', { name: 'Take one Infantry' }).click();
    await take(page, 'Fighter'); await take(page, 'Fighter');
    await expect(page.getByRole('heading', { name: 'Cargo on board: 4 of 4' })).toBeVisible();
    await expect(page.getByText('Fleet pool: 1 of 3')).toBeVisible();
    await page.getByRole('button', { name: 'Fly' }).click();
    await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    // a newly conquered planet is exhausted: the resources do not grow yet (LRR 12 / 49)
    await expectTotals(page, { Resources: '3', Influence: '4', Tactic: '3 → 2', Fleet: '3' });
    await done(page);
    await shot(page, '13-r1-quann');
  });

  await test.step('R1 forecast / now: tick entry by entry', async () => {
    await expect(entries(page)).toHaveCount(2);
    await tick(0).click();
    await nowMode();
    await expectTotals(page, { Tactic: '3', Resources: '3' });
    await forecastMode();
    await expectTotals(page, { Tactic: '3 → 2' });
    await tick(1).click();
    await nowMode();
    await expectTotals(page, { Tactic: '2' });
    // undo the tick: back to the planned one
    await tick(1).click();
    await expectTotals(page, { Tactic: '3' });
    await forecastMode();
    await expectTotals(page, { Tactic: '3 → 2' });
    await tick(1).click();
  });

  await test.step('R1 e3 Diplomacy primary + Peace Accords on Archon Vail, ready Quann', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '2 Diplomacy' }).click();
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'peace accords', 'Peace Accords');
    await panel(page).getByRole('button', { name: 'Archon Vail', exact: true }).click();
    // Quann was taken exhausted; the primary readies up to 2 exhausted planets (Quann 2/1)
    await panel(page).getByRole('button', { name: /^Quann 2\/1/ }).click();
    expect(await codes()).toEqual([]);
    await expectTotals(page, { Resources: '3 → 5', Influence: '4 → 5' });
    await done(page);
    await tick(2).click();
  });

  await test.step('R1 e4 production at home: a Carrier paid with Archon Ren 2 + Archon Tau 1', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 14);
    await page.waitForTimeout(1000);
    await prodStage();
    await stage.getByRole('button', { name: 'Carrier', exact: true }).click();
    await expect(stage).toContainText('3 / 5');
    await shot(page, '14-r1-production');
    await closeStage();
    await expect(panel(page)).toContainText('Cost 3, paid 3');
    await expectTotals(page, { Resources: '5 → 2', Influence: '5 → 1', Tactic: '2 → 1' });
    await panel(page).getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    await panel(page).getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'sabotage', 'Sabotage');
    await done(page);
    await tick(3).click();
  });

  await test.step('R1 e5 Mining Initiative on Archon Ren: 2 trade goods', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('button', { name: 'Archon Ren', exact: true }).click();
    await expectTotals(page, { 'Trade goods': '0 → 2', Resources: '2', Influence: '1' });
    await done(page);
    await tick(4).click();
  });

  await test.step('R1 e6 pass, status: tokens and an unmet objective', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await tick(5).click();
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Strategy' }).click();
    await panel(page).getByRole('button', { name: 'Add one Xxcha' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'expand borders', 'Expand Borders');
    // 2 planets outside the home (Quann, Archon Vail), the objective asks 6 (LRR objectives)
    await expect(panel(page)).toContainText('Objective Expand Borders is scored without its requirement: 2 of 6.');
    // Planets refresh: Ren 2 + Tau 1 + Quann 2 + Vail 1 = 6 resources, 3+1+1+3 = 8 influence
    await expectTotals(page, { Resources: '2 → 6', Influence: '1 → 8', 'Trade goods': '2', Tactic: '1 → 2', Strategy: '2 → 3', VP: '0 → 1' });
    await shot(page, '15-r1-status');
    await tick(6).click();
    await nowMode();
    await expectTotals(page, { Resources: '6', Influence: '8', Tactic: '2', Strategy: '3', VP: '1', 'Trade goods': '2' });
    await forecastMode();
  });

  await test.step('R2 Trade primary: 3 trade goods, commodities replenish to 4', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { Resources: '6', Influence: '8', Tactic: '2', Strategy: '3' });
    await cards(page, '5 Trade', '4 Construction');
    await addAction(page, 'Strategy');
    await expectTotals(page, { 'Trade goods': '2 → 5', Commodities: '0 → 4' });
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Hacan' }).click();
    const give = panel(page).getByRole('group', { name: 'Give' });
    await give.getByRole('button', { name: '+ Component' }).click();
    await choose(page, 'political favor', 'Political Favor');
    await give.getByRole('group', { name: 'Commodities' }).getByRole('button', { name: /^Add/ }).click();
    await give.getByRole('group', { name: 'Commodities' }).getByRole('button', { name: /^Add/ }).click();
    await expectTotals(page, { Commodities: '0 → 2' });
    // Hacan sits far away: the neighbour rule warns
    expect(await codes()).toContain('notNeighbor');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page);
    await tick(0).click();
    await shot(page, '20-r2-trade');
  });

  await test.step('R2 Technology secondary: Instinct Training for 4 resources and a token', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: /^Secondary/ }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'instinct', 'Instinct Training');
    await expect(panel(page)).toContainText('Cost 4, paid 4');
    expect(await codes()).toEqual([]);
    await expectTotals(page, { Resources: '6 → 2', Influence: '8 → 4', Strategy: '3 → 2' });
    await done(page);
    await tick(1).click();
  });

  await test.step('R2 Construction primary: space dock and PDS on Quann', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '4 Construction' }).click();
    await panel(page).getByRole('button', { name: 'Construction', exact: true }).last().click();
    await tapTile(page, 25);
    await page.waitForTimeout(800);
    await stage.getByRole('button', { name: 'Space dock', exact: true }).click();
    await stage.getByRole('button', { name: /^Quann/ }).click();
    await stage.getByRole('button', { name: 'PDS', exact: true }).click();
    await stage.getByRole('button', { name: /^Quann/ }).click();
    await closeStage();
    await expect(panel(page)).toContainText('Built: Space dock (Quann), PDS (Quann)');
    expect(await codes()).toEqual([]);
    await done(page);
    await tick(2).click();
  });

  await test.step('R2 Instinct Training as an action: a strategy token; the second use warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'instinct', 'Instinct Training');
    await expectTotals(page, { Strategy: '2 → 1' });
    await done(page);
    await tick(3).click();
    await addAction(page, 'Component action');
    await choose(page, 'instinct', 'Instinct Training');
    expect(await codes()).toContain('componentExhausted');
    // BUG?: the second use of an exhausted technology spends no second token (the plan applies what is entered elsewhere)
    await expectTotals(page, { Strategy: '1' });
    await done(page);
    await tick(4).click();
  });

  await test.step('R2 agent Ggrocuto Rinn readies a Hacan planet: warning waived, then exhausted', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'ggrocuto', 'Ggrocuto Rinn');
    await panel(page).getByRole('button', { name: 'Hercant', exact: true }).click();
    expect(await warns(page)).toEqual(['readyNotControlled(waived) Hercant is not your planet: an effect readies only planets you control.Allowed by: Ggrocuto Rinn']);
    await shot(page, '21-agent-waived');
    await done(page);
    await tick(5).click();
    await addAction(page, 'Component action');
    await choose(page, 'ggrocuto', 'Ggrocuto Rinn');
    expect(await codes()).toContain('componentExhausted');
    await done(page);
    await tick(6).click();
  });

  await test.step('R2 Hacan fleet set by hand on Lodor, my tactical with a battle and a landing', async () => {
    await tapTile(page, 26);
    await stage.getByRole('button', { name: 'Setup', exact: true }).click();
    await stage.getByRole('button', { name: 'Hacan', exact: true }).click();
    for (const u of ['Cruiser', 'Fighter', 'Fighter']) await stage.getByRole('button', { name: u, exact: true }).click();
    await stage.locator('g[aria-label^="Lodor"]').click();
    await stage.getByRole('button', { name: 'Infantry', exact: true }).click();
    await closeStage();
    await addAction(page, 'Tactical action');
    await tapTile(page, 26);
    await page.waitForTimeout(1200);
    await dragRoute(page, [25, 26]);
    await page.waitForTimeout(500);
    await dragRoute(page, [14, 25, 26]);
    const src = (name: string) => panel(page).locator('li').filter({ hasText: name + ' ·' }).first();
    await take(page, 'Carrier');
    await take(page, 'Cruiser'); await take(page, 'Cruiser');
    await src('Archon Ren / Archon Tau').getByRole('button', { name: 'Take one Fighter' }).click();
    await src('Archon Ren / Archon Tau').getByRole('button', { name: 'Take one Infantry' }).click();
    await src('Archon Ren / Archon Tau').getByRole('button', { name: 'Take one Infantry' }).click();
    await src('Quann').getByRole('button', { name: 'Take one Infantry' }).click();
    // a carrier (speed 1) over 2 steps
    await expect(panel(page)).toContainText('Carrier from Archon Ren / Archon Tau has speed 1, and the route takes 2 steps.');
    await expect(page.getByText('Fleet pool: 3 of 3')).toBeVisible();
    await page.getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await stage.locator('g[aria-label="Fighter ×1"]').click();
    await stage.locator('g[aria-label^="Cruiser"][aria-label*="Hacan"]').click();
    await stage.locator('g[aria-label^="Fighter"][aria-label*="Hacan"]').click();
    await stage.locator('g[aria-label^="Fighter"][aria-label*="Hacan"]').click();
    await shot(page, '22-battle');
    await closeStage();
    await expect(panel(page)).toContainText('Losses: Fighter 1');
    for (let i = 0; i < 3; i++) await panel(page).getByRole('group', { name: 'Landing on Lodor' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await stage.locator('g[aria-label^="Infantry"][aria-label*="Hacan"]').click();
    await closeStage();
    await expectTotals(page, { Tactic: '2 → 1' });
    await done(page);
    await tick(7).click();
  });

  await test.step('R2 Hacan activates 25 (a rival entry)', async () => {
    await tapTile(page, 19);
    if (!(await stage.count())) { await page.waitForTimeout(3000); await tapTile(page, 19); }
    await stage.getByRole('button', { name: 'Setup', exact: true }).click();
    await stage.getByRole('button', { name: 'Hacan', exact: true }).click();
    await stage.getByRole('button', { name: 'Cruiser', exact: true }).click();
    await closeStage();
    await panel(page).getByRole('button', { name: 'Hacan', exact: true }).first().click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 25);
    await page.waitForTimeout(1200);
    await dragRoute(page, [19, 25]);
    await take(page, 'Cruiser');
    await page.getByRole('button', { name: 'Fly' }).click();
    await done(page);
    await expect(page.locator('.plan-panel li.entry[aria-label^="Hacan:"]')).toHaveCount(1);
    await panel(page).getByRole('button', { name: 'Mine', exact: true }).first().click();
    // my tactic tokens are not touched by their action (all my entries are ticked: now = forecast)
    await expectTotals(page, { Tactic: '1' });
  });

  await test.step('R2 Nullification Field is not researched yet: not held', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'nullification', 'Nullification Field');
    expect(await codes()).toContain('componentNotHeld');
    await shot(page, '23-nf-notheld');
    await done(page);
  });

  await test.step('R2 status and a round of forecast / now', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'plagiarize', 'Plagiarize');
    await panel(page).getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'direct hit', 'Direct Hit');
    await panel(page).getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'refit', 'Refit Troops');
    // Ren 2 + Tau 1 + Quann 2 + Vail 1 + Lodor 3 = 9; influence 3+1+1+3+1 = 9
    await expectTotals(page, { Resources: '2 → 9', Influence: '4 → 9', Tactic: '1 → 3', Strategy: '1' });
    const n = await entries(page).count();
    for (let i = 0; i < n; i++) { if (!(await entries(page).nth(i).locator('input').isChecked())) await tick(i).click(); }
    await nowMode();
    await expectTotals(page, { Resources: '9', Influence: '9', Tactic: '3', Strategy: '1', 'Trade goods': '5', Commodities: '2', VP: '1' });
    await forecastMode();
    await shot(page, '24-r2-status');
  });

  await test.step('R3 Technology primary: Plasma Scoring free, Cruiser II for 6', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { Resources: '9', Influence: '9', Tactic: '3', Strategy: '1', 'Trade goods': '5', Commodities: '2' });
    await cards(page, '7 Technology', '8 Imperial');
    await addAction(page, 'Strategy');
    await page.getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'plasma', 'Plasma Scoring');
    await page.getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'cruiser ii', 'Cruiser II');
    await expect(panel(page)).toContainText('Cost 6, paid 6');
    expect(await codes()).toEqual([]);
    await shot(page, '30-r3-tech');
    await done(page);
    await tick(0).click();
  });

  await test.step('R3 Plagiarize: Sarween Tools from Hacan for 5 influence', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'plagiarize', 'Plagiarize');
    await panel(page).getByRole('button', { name: 'Hacan', exact: true }).click();
    await panel(page).getByRole('button', { name: 'Sarween Tools', exact: true }).click();
    await expect(panel(page)).toContainText('Cost 5, paid 5');
    await expectTotals(page, { Resources: '3 → 0', Influence: '4 → 0', 'Trade goods': '5 → 4' });
    await done(page);
    await tick(1).click();
  });

  await test.step('R3 tactical Wellon: carrier from Lodor with 3 infantry', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 19);
    await page.waitForTimeout(1200);
    await dragRoute(page, [26, 19]);
    await take(page, 'Carrier');
    for (let i = 0; i < 3; i++) await panel(page).getByRole('group', { name: 'Lodor', exact: true }).getByRole('button', { name: 'Take one Infantry' }).click();
    await page.getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('group', { name: 'Landing on Wellon' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await expectTotals(page, { Tactic: '3 → 2' });
    await done(page);
    await tick(2).click();
  });

  await test.step('R3 Industrial Initiative: 1 trade good for 1 industrial planet (Wellon)', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    await expectTotals(page, { 'Trade goods': '4 → 5' });
    await done(page);
    await tick(3).click();
  });

  await test.step('R3 production at 25 with a Hacan cruiser in it: ships blockaded', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 25);
    await page.waitForTimeout(1000);
    await prodStage();
    await stage.getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage.getByRole('button', { name: 'Mech', exact: true }).click();
    await shot(page, '31-r3-production');
    await closeStage();
    expect(await codes()).toContain('productionBlockaded');
    // 2 + 2 = 4, Sarween Tools takes 1 off, paid with 4 trade goods
    await expectTotals(page, { 'Trade goods': '5 → 1' });
    await done(page);
    await tick(4).click();
  });

  await test.step('R3 pass with Sabotage used; unplayed second card warns', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'sabotage', 'Sabotage');
    expect(await codes()).toContain('passBeforeStrategy');
    await done(page);
    await tick(5).click();
  });

  await test.step('R3 status: Diversify Research is met (2 biotic, 2 cybernetic)', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Strategy' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'diversify research', 'Diversify Research');
    await panel(page).getByRole('button', { name: 'Add one Xxcha' }).click();
    await expect(panel(page)).not.toContainText('Diversify Research is scored without its requirement');
    // Ren 2 + Tau 1 + Quann 2 + Vail 1 + Lodor 3 + Wellon 1 = 10; influence 3+1+1+3+1+2 = 11
    await expectTotals(page, { Resources: '0 → 10', Influence: '0 → 11', Tactic: '1 → 2', Strategy: '1 → 2', VP: '1 → 2' });
    await shot(page, '32-r3-status');
    await tick(6).click();
  });

  await test.step('R4 Technology secondary: Nullification Field (2 cybernetic prerequisites)', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { Resources: '10', Influence: '11', Tactic: '2', Strategy: '2' });
    await cards(page, '1 Leadership', '3 Politics');
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: /^Secondary/ }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'nullification', 'Nullification Field');
    expect(await codes()).toEqual([]);
    await expectTotals(page, { Resources: '10 → 6', Influence: '11 → 7', Strategy: '2 → 1' });
    await done(page);
    await tick(0).click();
  });

  await test.step('R4 Leadership primary: 3 tokens', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Add one Strategy' }).click();
    await panel(page).getByRole('button', { name: 'Add one Strategy' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await expectTotals(page, { Tactic: '2 → 3', Strategy: '1 → 3' });
    await done(page);
    await tick(1).click();
  });

  await test.step('R4 agent (readied by the status phase) readies Archon Ren; Instinct Training readied too', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'ggrocuto', 'Ggrocuto Rinn');
    await panel(page).getByRole('button', { name: 'Archon Ren', exact: true }).click();
    expect(await codes()).toEqual([]);
    await expectTotals(page, { Resources: '6 → 8', Influence: '7 → 10' });
    await done(page);
    await tick(2).click();
    await addAction(page, 'Component action');
    await choose(page, 'instinct', 'Instinct Training');
    expect(await codes()).toEqual([]);
    await expectTotals(page, { Strategy: '3 → 2' });
    await done(page);
    await tick(3).click();
  });

  await test.step('R4 Mecatol: custodians token costs 6 influence (the plan cannot record it)', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 18);
    await page.waitForTimeout(1200);
    await dragRoute(page, [19, 18]);
    await take(page, 'Carrier');
    for (let i = 0; i < 3; i++) await page.getByRole('group', { name: 'Wellon', exact: true }).getByRole('button', { name: 'Take one Infantry' }).click();
    await page.getByRole('button', { name: 'Fly' }).click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('group', { name: 'Landing on Mecatol Rex' }).getByRole('button', { name: 'Land one Infantry' }).click();
    expect(await codes()).toEqual(expect.arrayContaining(['custodians', 'shortInfluence']));
    // BUG: no block in the interface takes the 6 influence, so "short by 6" cannot be cleared, and the first warning says the plan does not record it
    await expect(panel(page)).toContainText('which the plan does not record');
    await expect(panel(page)).toContainText('Not enough influence: need 6, paid 0, short by 6.');
    await expectTotals(page, { VP: '2 → 3', Tactic: '3 → 2' });
    await shot(page, '40-r4-mecatol');
    await done(page);
    await tick(4).click();
  });

  await test.step('R4 production at home paying with Archon Vail alone: the hero Xxekir Grom is unlocked', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 14);
    await page.waitForTimeout(1000);
    await prodStage();
    await stage.getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage.getByRole('button', { name: 'Cruiser', exact: true }).click();
    await closeStage();
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    for (const n of ['Lodor', 'Archon Ren', 'Archon Tau', 'Wellon', 'Quann']) {
      const c = panel(page).getByRole('button', { name: new RegExp('^' + n) });
      if ((await c.count()) && (await c.first().getAttribute('aria-pressed')) === 'true') await c.first().click();
    }
    await panel(page).getByRole('button', { name: /^Archon Vail/ }).click();
    // 2 Cruiser II cost 4, Sarween Tools takes 1 off: 3 are due. Archon Vail is 1/3 and the hero's text turns it into 4/4.
    await expect(panel(page)).toContainText('Cost 4, paid 1');
    // BUG: the Xxcha hero (Prophecy of Kings) "combine the values of exhausted planets" is only a hint: the payment is still short
    expect(await codes()).toContain('shortResources');
    await shot(page, '41-r4-hero-payment');
    await done(page);
    await tick(5).click();
  });

  await test.step('R4 hero is played once and purged', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'xxekir', 'Xxekir Grom');
    expect(await codes()).toEqual([]);
    await done(page);
    await tick(6).click();
    await addAction(page, 'Component action');
    await choose(page, 'xxekir', 'Xxekir Grom');
    expect(await codes()).toContain('componentNotHeld');
    await done(page);
    await tick(7).click();
  });

  await test.step('R4 Hacan activates 19 where my ships stand; Nullification Field spends a token', async () => {
    await panel(page).getByRole('button', { name: 'Hacan', exact: true }).first().click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 19);
    await page.waitForTimeout(1200);
    await dragRoute(page, [25, 19]);
    await take(page, 'Cruiser');
    await page.getByRole('button', { name: 'Fly' }).click();
    await done(page);
    await panel(page).getByRole('button', { name: 'Mine', exact: true }).first().click();
    await addAction(page, 'Component action');
    await choose(page, 'nullification', 'Nullification Field');
    await expectTotals(page, { Strategy: '2 → 1' });
    await done(page);
  });

  await test.step('R4 relics: Shard of the Throne (+1 VP), Dynamis Core (+6 trade goods)', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'refit', 'Refit Troops');
    await panel(page).getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'shard of the throne', 'Shard of the Throne');
    await panel(page).getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'dynamis', 'Dynamis Core');
    await expectTotals(page, { VP: '3 → 4' });
    await done(page);
    await addAction(page, 'Component action');
    await choose(page, 'dynamis', 'Dynamis Core');
    // commodity value 4 + 2 (the relic's own text)
    await expectTotals(page, { 'Trade goods': '1 → 7' });
    await done(page);
  });

  await test.step('R4 flagship Loncara Ssodu at the Quann dock, then flown with the cargo it can carry', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 25);
    await page.waitForTimeout(1000);
    await prodStage();
    await stage.getByRole('button', { name: 'Flagship', exact: true }).click();
    await expect(stage).toContainText(/Bought:\s*1/);
    await expect(stage).toContainText(/Cost \/ resources available\s*8 \/ 14/);
    await expect(stage).toContainText(/Load \/ capacity\s*0 \/ 8/);
    console.log('QSTAGE', (await stage.innerText()).replace(/\s+/g, ' ').slice(0, 500));
    await shot(page, '50-flagship-stage');
    await closeStage();
    await expect(panel(page)).toContainText('Flagship 1');
    await expect(panel(page)).toContainText('Cost 8, paid 8');
    console.log('QWARN', JSON.stringify(await warns(page)));
    console.log('QPANEL', (await panel(page).innerText()).replace(/\s+/g, ' ').slice(0, 1400));
    await shot(page, '51-flagship-panel');
    await done(page);
    await tick((await entries(page).count()) - 1).click();
  });

  await test.step('R4 flagship (move 1, capacity 3) flies to Lodor with exactly what it can carry', async () => {
    await expectTotals(page, { Tactic: '0' });
    await addAction(page, 'Tactical action');
    await tapTile(page, 26);
    await page.waitForTimeout(1200);
    await dragRoute(page, [25, 26]);
    await take(page, 'Flagship');
    await take(page, 'Fighter'); await take(page, 'Fighter');
    await take(page, 'Infantry');
    await expect(page.getByRole('heading', { name: 'Cargo on board: 3 of 3' })).toBeVisible();
    // the flagship moves 1 and the route is 1 step
    expect(await codes()).not.toContain('speedShort');
    await take(page, 'Mech');
    console.log('FCODES', JSON.stringify(await warns(page)));
    await expect(page.getByRole('heading', { name: /Cargo on board: 4 of 3/ })).toBeVisible();
    expect(await codes()).toEqual(expect.arrayContaining(['capacityGroup', 'sourceActivated']));
    await shot(page, '52-flagship-flight');
    await page.getByRole('button', { name: 'Fly' }).click();
    console.log('FPANEL', (await panel(page).innerText()).replace(/\s+/g, ' ').slice(0, 1200));
    await expectTotals(page, { Tactic: '0 → -1' });
    await done(page);
    await tick((await entries(page).count()) - 1).click();
  });

  await test.step('R4 agenda: Minister of Peace, Quash and Elder Qanoj used', async () => {
    await page.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'minister of peace', 'Minister of Peace');
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    console.log('S0', (await totals(page)).Strategy);
    await choose(page, 'quash', 'Quash');
    console.log('S1', (await totals(page)).Strategy, await warns(page));
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'qanoj', 'Elder Qanoj');
    console.log('S2', (await totals(page)).Strategy, await warns(page));
    await expectTotals(page, { Strategy: '2 → 0' });
    await shot(page, '42-r4-agenda');
    await done(page);
    await openDrawer(page, /^Objectives/);
    await expect(drawer(page)).toContainText('Minister of Peace');
    await closeDrawer(page);
  });

  await test.step('Political Favor: in the Hacan hands, then played by Hacan and returned', async () => {
    await openDrawer(page, /^Cards/);
    const mine = (await drawer(page).innerText()).replace(/\s+/g, ' ');
    console.log('CARDS', mine.slice(0, 900));
    await shot(page, '53-favor-where');
    await closeDrawer(page);
    await panel(page).getByRole('button', { name: 'Hacan', exact: true }).first().click();
    await addAction(page, 'Component action');
    await choose(page, 'political favor', 'Political Favor');
    console.log('HWARN', JSON.stringify(await warns(page)));
    console.log('HPANEL', (await panel(page).innerText()).replace(/\s+/g, ' ').slice(0, 700));
    await shot(page, '54-favor-played');
    await done(page);
    await panel(page).getByRole('button', { name: 'Mine', exact: true }).first().click();
    await openDrawer(page, /^Cards/);
    console.log('CARDS2', (await drawer(page).innerText()).replace(/\s+/g, ' ').slice(0, 900));
    await closeDrawer(page);
    console.log('TOT', JSON.stringify(await totals(page)));
  });

  await test.step('R4 undo', async () => {
    for (let i = 0; i < 6; i++) {
      const row = await panel(page).locator('li.entry').evaluateAll(els => els.map(e => e.getAttribute('aria-label') + (e.querySelector('input')?.checked ? '[x]' : '[ ]')).slice(-4));
      console.log('UNDO', i, await entries(page).count(), JSON.stringify(await totals(page)), JSON.stringify(row));
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
    }
    await shot(page, '43-after-undo');
  });

  expect(errors).toEqual([]);
});
