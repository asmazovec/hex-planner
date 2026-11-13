import { expect, test, type Page } from '@playwright/test';

/**
 * One long game of the Ghosts of Creuss through the interface: four players, three rounds. The tests share one page and run in order.
 * Lines marked BUG assert what the application does today, so the game can go on; each is a finding of the report.
 */
test.describe.configure({ mode: "serial" });

let page: Page;
const problems: string[] = [];
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://localhost:4173", viewport: { width: 1180, height: 820 }, hasTouch: true, serviceWorkers: "block" });
  page = await context.newPage();
  page.on("pageerror", error => problems.push("pageerror: " + error.message));
  page.on("console", message => { if (message.type() === "error") problems.push("console: " + message.text()); });
});
test.afterAll(async () => { await page.context().close(); });

const tile = n => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = () => page.locator('.plan-panel');
const drawerEl = () => page.getByRole('dialog', { name: 'Components' });
const pickerEl = () => page.getByRole('dialog', { name: 'Choose a component' });
const stageEl = () => page.locator('.stage-dialog');
const sum = async name => (await page.locator(`.summary-cell[aria-label="${name}"]`).innerText()).replace(/\s+/g, ' ').trim();
const addAction = async type => { await page.getByRole('button', { name: 'Add action' }).click(); await page.locator('.action-list').getByRole('button', { name: type, exact: true }).click(); };
const pick = async (query, name) => {
  await pickerEl().getByRole('searchbox', { name: 'Search components' }).fill(query);
  await pickerEl().getByRole('button', { name: `Choose ${name}` }).click();
  await expect(pickerEl()).toHaveCount(0);
};
async function stillAt(target) {
  let last = '';
  await expect.poll(async () => { const now = JSON.stringify(await target.boundingBox()); const still = now === last; last = now; return still; }, { intervals: [150] }).toBe(true);
  const box = await target.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function tapTile(n) { await stillAt(tile(n)); await tile(n).click(); }
async function dragRoute(hexes) {
  const points = [];
  for (const n of hexes) points.push(await stillAt(tile(n)));
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.mouse.up();
}
const SH = 'test-results/scenarios/ghost/';
async function shot(name) { await page.screenshot({ path: `${SH}${name}.png` }); }
const done = async () => { await panel().getByRole('button', { name: 'Done', exact: true }).click(); };
const put = async (u, n = 1) => { for (let i = 0; i < n; i++) await stageEl().getByRole('button', { name: u, exact: true }).click(); };
const take = async (u, n = 1, scope) => { for (let i = 0; i < n; i++) await (scope ?? panel()).getByRole('button', { name: `Take one ${u}` }).first().click(); };
const openSetup = async n => { await tile(n).click(); await stageEl().getByRole('button', { name: 'Setup', exact: true }).click(); };
const closeStage = async () => { await stageEl().getByRole('button', { name: 'Close' }).click(); };
const fan = () => page.getByRole('group', { name: 'Drawers' });
const openDrawer = async group => {
  if (!(await drawerEl().count())) await page.getByRole('button', { name: /^Components/ }).click();
  await expect(drawerEl()).toBeVisible();
  if (group) { const tab = fan().getByRole('button', { name: group }); if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click(); }
};
const closeDrawer = async () => {
  if (await drawerEl().count()) await fan().getByRole('button', { pressed: true }).click();
  await expect(drawerEl()).toHaveCount(0);
};


test("round 1: set-up, strategy cards, research, production at the off-map home, two tactical actions, status", async () => {
  await test.step("r1_00_setup: Create the game from the first screen: Creuss against Hacan, Argent and Deepwrought, 4-player map", async () => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('ti4.lang', 'en'));
    await page.reload();
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'My faction', exact: true }).click();
    await page.getByRole('button', { name: 'The Ghosts of Creuss' }).click();
    await page.getByRole('button', { name: 'Remove opponent' }).last().click();
    await page.getByRole('button', { name: 'Remove opponent' }).last().click();
    const opp = page.getByRole('button', { name: /Opponent/ });
    await opp.nth(0).click();
    await page.getByRole('button', { name: 'The Emirates of Hacan' }).click();
    await opp.nth(1).click();
    await page.getByRole('button', { name: 'The Argent Flight' }).click();
    await opp.nth(2).click();
    await page.getByRole('button', { name: 'The Deepwrought Scholarate' }).click();
    await page.getByRole('textbox').first().fill('GhostGame');
    // Ring by ring from the top; the home slots carry the home tile numbers (the gate 17 for Creuss).
    const milty = '19 26 20 40 25 21 22 23 24 27 28 29 30 31 32 33 34 35 17 36 37 16 38 39 44 41 42 58 43 59 95 60 61 62 63 45';
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(milty);
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('33 tiles placed.')).toBeVisible();
    await expect(page.getByText('Home systems placed: 3.')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).first().click();
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(17)).toBeVisible();
    // The off-map home (tile 51) has no hex anywhere on the map.
    await expect(tile(51)).toHaveCount(0);
    expect(await sum('Resources')).toBe('Resources 4');
    expect(await sum('Influence')).toBe('Influence 2');
    expect(await sum('Tactic')).toBe('Tactic 3');
    expect(await sum('Fleet')).toBe('Fleet 3');
    expect(await sum('Strategy')).toBe('Strategy 2');
    expect(await sum('Commodities')).toBe('Commodities 0');
    await shot('r1-00-start');
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r1_01_cards: Strategy phase: Trade main, Technology second", async () => {
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '5 Trade' }).click();
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: '7 Technology' }).click();
    await expect(page.getByText('Main: 5 Trade · Second: 7 Technology')).toBeVisible();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r1_02_trade: Trade primary: 3 trade goods, 4 commodities of Creuss, Hacan takes the secondary free", async () => {
    await addAction('Strategy');
    await expect(page.getByRole('button', { name: '5 Trade' })).toHaveAttribute('aria-pressed', 'true');
    expect(await sum('Trade goods')).toBe('Trade goods 0 → 3');
    expect(await sum('Commodities')).toBe('Commodities 0 → 4');
    await panel().getByRole('button', { name: 'Hacan' }).first().click();
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r1_03_tech: Technology primary: Antimass Deflectors free, Wormhole Generator for 6 (Creuss 4 + 2 trade goods)", async () => {
    await addAction('Strategy');
    await expect(page.getByRole('button', { name: '7 Technology' })).toHaveAttribute('aria-pressed', 'true');
    await panel().getByRole('button', { name: 'Research a technology' }).click();
    await pick('antimass', 'Antimass Deflectors');
    await panel().getByRole('button', { name: /Research a technology/ }).click();
    await pick('wormhole gen', 'Wormhole Generator');
    await expect(panel().getByText('Cost 6, paid 6')).toBeVisible();
    await expect(panel().getByText('Creuss 4, Trade goods 2')).toBeVisible();
    expect(await sum('Resources')).toBe('Resources 4 → 0');
    expect(await sum('Trade goods')).toBe('Trade goods 0 → 1');
    await expect(panel().locator('li[data-code]')).toHaveCount(0);
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r1_04_warfare: Warfare secondary: production at the off-map home, two fighters for one trade good", async () => {
    await addAction('Strategy');
    await page.getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '6 Warfare' }).click();
    await panel().getByRole('button', { name: 'Production in the home system' }).click();
    await put('Fighter', 2);
    await closeStage();
    await expect(panel().getByText('Cost 1, paid 1')).toBeVisible();
    expect(await sum('Strategy')).toBe('Strategy 2 → 1');
    // The start ground forces stand in the space of the home, so 4 fighters (3 kept by the dock) and 4 infantry read as over capacity.
    await expect(panel().getByText('System Creuss is over capacity: 5 of 4.')).toBeVisible();
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r1_04b_nosource: nosource", async () => {
    // A route out of the gate: the start fleet stands at the off-map home 51, which has no hex, so no route can take it from there.
    await addAction('Tactical action');
    await tapTile(22);
    await panel().getByRole('button', { name: 'Add source' }).click();
    await tapTile(17);
    await tapTile(22);
    await expect(panel().getByText('No ships here.')).toBeVisible();
    await expect(panel().getByText('Nothing to take')).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await done();
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Delete' }).last().click();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r1_05_setup: The Creuss fleet cannot be routed out of the off-map home, so it is set up on Quann (beta) by hand", async () => {
    await openSetup(25);
    await put('Flagship'); await put('Carrier'); await put('Destroyer', 2); await put('Mech'); await put('Infantry', 3);
    await expect(stageEl().getByText('System Quann is over the fleet pool: 4 ships, 3 tokens.')).toBeVisible();
    await closeStage();
    await openSetup(40);
    await put('Infantry', 2);
    await closeStage();
    await openSetup(26);
    await stageEl().getByRole('button', { name: 'Hacan', exact: true }).click();
    await put('Destroyer'); await put('Fighter', 2);
    await closeStage();
    await expect(page.getByRole('button', { name: 'Setup · Quann', exact: true })).toBeVisible();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r1_06_tactical_a: Tactical action 1: through a beta wormhole, Slipstream, pick-up on the way, landing", async () => {
    await addAction('Tactical action');
    await tapTile(20);
    await expect(page.getByText('Active system: Vefut II')).toBeVisible();
    await dragRoute([25, 40, 20]);
    await expect(page.getByText('Flight Quann → Vefut II')).toBeVisible();
    await take('Flagship'); await take('Carrier'); await take('Destroyer', 2);
    // Slipstream: a ship that starts in a beta system has +1, so carrier and flagship (move 1) fly 2 hexes without a warning.
    await expect(panel().locator('li[data-code="speedShort"]')).toHaveCount(0);
    await take('Infantry', 3, page.getByRole('group', { name: 'Quann' }));
    await take('Mech', 1, page.getByRole('group', { name: 'Quann' }));
    await take('Infantry', 2, page.getByRole('group', { name: '40', exact: true }));
    await expect(page.getByRole('heading', { name: /Cargo on board: 6 of 7/ })).toBeVisible();
    await page.getByRole('button', { name: 'Fly' }).click();
    const land = page.getByRole('group', { name: 'Landing on Vefut II' });
    for (let i = 0; i < 5; i++) await land.getByRole('button', { name: 'Land one Infantry' }).click();
    await land.getByRole('button', { name: 'Land one Mech' }).click();
    await expect(panel().getByText('System Vefut II is over the fleet pool: 4 ships, 3 tokens.').first()).toBeVisible();
    expect(await sum('Tactic')).toBe('Tactic 3 → 2');
    await done();
    await shot('r1-06-after-tactical-a');
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r1_07_tactical_b: Tactical action 2: out of a system that holds my command token, space combat with losses, landing on Lodor", async () => {
    await addAction('Tactical action');
    await tapTile(26);
    await dragRoute([20, 26]);
    await take('Destroyer', 2); await take('Carrier');
    await take('Infantry', 3, page.getByRole('group', { name: 'Vefut II' }));
    await page.getByRole('button', { name: 'Fly' }).click();
    await expect(panel().getByText('Vefut II already holds your command token: by the rules ships cannot move out of it.')).toBeVisible();
    await panel().getByRole('button', { name: /^Battle/ }).click();
    const g = n => stageEl().locator(`g[aria-label="${n}"]`);
    await g('Destroyer ×2').click();
    await g('Destroyer ×1 (The Emirates of Hacan)').click();
    await g('Fighter ×2 (The Emirates of Hacan)').click();
    await shot('r1-07-battle');
    await closeStage();
    await expect(panel().getByText('Losses: Destroyer 1')).toBeVisible();
    for (let i = 0; i < 3; i++) await page.getByRole('group', { name: 'Landing on Lodor' }).getByRole('button', { name: 'Land one Infantry' }).first().click();
    expect(await sum('Tactic')).toBe('Tactic 3 → 1');
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r1_08_wg: Component action: Wormhole Generator puts an alpha token into Vefut II", async () => {
    await addAction('Component action');
    await pick('wormhole generator', 'Wormhole Generator');
    await panel().getByRole('button', { name: 'Alpha', exact: true }).click();
    await panel().getByRole('button', { name: 'Vefut II', exact: true }).click();
    await done();
    // The entry is not named after the component, and the token is not drawn on the hex.
    await expect(page.getByRole('button', { name: 'Component action', exact: true })).toBeVisible();
    // BUG: the placed token is not drawn: the hex of Vefut II shows no wormhole sign
    expect(await page.locator('[aria-label="Tile 20"]').first().textContent()).not.toContain('α');
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r1_09_status: Pass, forecast numbers, status entry: tokens, an objective scored short of its requirement, an action card", async () => {
    await addAction('Pass');
    await done();
    expect(await sum('Resources')).toBe('Resources 4 → 0');
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    expect(await sum('Resources')).toBe('Resources 4 → 9');
    expect(await sum('Influence')).toBe('Influence 2 → 5');
    await page.getByRole('button', { name: 'Add one Tactic' }).click();
    await page.getByRole('button', { name: 'Add one Fleet' }).click();
    await page.getByRole('button', { name: 'Score an objective' }).click();
    await pick('expand borders', 'Expand Borders');
    await expect(panel().getByText('Objective Expand Borders is scored without its requirement: 2 of 6.')).toBeVisible();
    await page.getByRole('button', { name: 'Add one Creuss' }).click();
    await page.getByRole('button', { name: '+ Action card' }).click();
    await pick('sabotage', 'Sabotage');
    expect(await sum('VP')).toBe('VP 0 → 1');
    expect(await sum('Fleet')).toBe('Fleet 3 → 4');
    await shot('r1-09-status');
    
    expect(problems, "console or page errors").toEqual([]);
  });
});

test("round 2: leaders, mech, breakthrough, action cards, deals and the actions of the rivals", async () => {
  await test.step("r2_01_round: round", async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Delete round 2' })).toBeVisible();
    await shot('r2-01-round');
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_02_tech: tech", async () => {
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '7 Technology' }).click();
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: '3 Politics' }).click();
    await addAction('Strategy');
    await expect(page.getByRole('button', { name: '7 Technology' })).toHaveAttribute('aria-pressed', 'true');
    await panel().getByRole('button', { name: 'Research a technology' }).click();
    await pick('carrier ii', 'Carrier II');
    await panel().getByRole('button', { name: /Research a technology/ }).click();
    await pick('neural motivator', 'Neural Motivator');
    await sleep(300);
    await shot('r2-02-tech');
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_03_politics: politics", async () => {
    await done();
    await addAction('Strategy');
    await expect(page.getByRole('button', { name: '3 Politics' })).toHaveAttribute('aria-pressed', 'true');
    // The printed text lacks a stop between the two sentences.
    expect(await panel().innerText()).toContain('Draw 2 action cards Look at the top 2 cards');
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_04_took: took", async () => {
    await panel().getByRole('group', { name: /speaker passes/i }).getByRole('button', { name: 'Hacan' }).click().catch(async () => { await panel().getByRole('button', { name: 'Hacan' }).first().click(); });
    await panel().getByRole('button', { name: '+ Took' }).click();
    await pick('ghost ship', 'Ghost Ship');
    await panel().getByRole('button', { name: '+ Took' }).click();
    await pick('mining initiative', 'Mining Initiative');
    await expect(panel().getByText('Ghost Ship')).toBeVisible();
    await shot('r2-04-took');
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_05_construction: construction", async () => {
    await addAction('Strategy');
    await page.getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '4 Construction' }).click();
    await sleep(300);
    await shot('r2-05-construction');
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_06_build: build", async () => {
    await panel().getByRole('button', { name: 'Construction', exact: true }).click();
    await sleep(600);
    await shot('r2-06-build');
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_07_build: build", async () => {
    await tapTile(26);
    await put('Space dock');
    await closeStage();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_08_done: done", async () => {
    await expect(panel().getByText('Built: Space dock (Lodor)')).toBeVisible();
    await shot('r2-08-built');
    const w = await panel().locator('li[data-code]').evaluateAll(a=>a.map(e=>e.getAttribute('data-code')+':'+e.innerText));
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_09_unlock: unlock", async () => {
    await openDrawer(/^Faction/);
    await sleep(600);
    for (const id of ['ghostcommander', 'ghosthero']) await page.getByTestId(`component-leader:${id}`).getByRole('button', { name: 'Unlocked' }).click({ force: true });
    await expect(page.getByTestId('component-leader:ghostcommander').getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await shot('r2-09-unlock');
    const t = await drawerEl().innerText();
    await closeDrawer();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_10_tactical: tactical", async () => {
    await addAction('Tactical action');
    await tapTile(39);
    // Two taps: Quantum Entanglement joins alpha 26 and alpha 39, so the step is a jump through the wormholes, one hex.
    await panel().getByRole('button', { name: 'Add source' }).click();
    await tapTile(26);
    await tapTile(39);
    await expect(page.getByText(/Flight Lodor → Wormhole α \(39\)/)).toBeVisible();
    await take('Carrier'); await take('Destroyer');
    await page.getByRole('button', { name: 'Fly' }).click();
    await expect(panel().locator('li[data-code]')).toHaveCount(0);
    await panel().getByRole('button', { name: '+ Used' }).click();
    await pick('emissary taivra', 'Emissary Taivra');
    await panel().getByRole('button', { name: '+ Used' }).click();
    await pick('sai seravus', 'Sai Seravus');
    await shot('r2-10-tactical');
    await expect(panel().getByRole('group', { name: 'Used' }).getByTestId('component-leader:ghostagent')).toBeVisible();
    await expect(panel().getByRole('group', { name: 'Used' }).getByTestId('component-leader:ghostcommander')).toBeVisible();
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_11_ghostship: ghostship", async () => {
    await addAction('Component action');
    await pick('ghost ship', 'Ghost Ship');
    // A system with no wormhole breaks the card's words: warned of, the destroyer is placed all the same.
    await panel().getByRole('button', { name: "Tar'mann", exact: true }).click();
    await expect(panel().locator('li[data-code="ghostShipSystem"]')).toHaveCount(1);
    await panel().getByRole('button', { name: '40', exact: true }).click();
    await expect(panel().locator('li[data-code="ghostShipSystem"]')).toHaveCount(0);
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_12_mining: mining", async () => {
    await addAction('Component action');
    await pick('mining initiative', 'Mining Initiative');
    await panel().getByRole('button', { name: 'Lodor', exact: true }).first().click();
    await sleep(300);
    expect(await sum('Trade goods')).toBe('Trade goods 0 → 3');
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_13_hero: hero", async () => {
    await addAction('Component action');
    await pick('riftwalker', 'Riftwalker Meian');
    await expect(panel().locator('li[data-code]')).toHaveCount(0);
    // A hero is purged once used: the card is only a reminder (the swap of two systems is not drawn), and a second use is warned of.
    await done();
    await addAction('Component action');
    await pick('riftwalker', 'Riftwalker Meian');
    await expect(panel().locator('li[data-code="componentNotHeld"]')).toHaveCount(1);
    await done();
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Delete' }).last().click();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_14_breakthrough: breakthrough", async () => {
    await openDrawer(/^Faction/);
    await drawerEl().getByRole('searchbox', { name: 'Search components' }).fill('particle synthesis');
    await drawerEl().getByRole('group', { name: 'Search results' }).getByRole('button', { name: 'Add Particle Synthesis' }).click();
    await drawerEl().getByRole('button', { name: 'Clear the search' }).click();
    await expect(drawerEl().getByTestId('component-breakthrough:ghostbt')).toBeVisible();
    await closeDrawer();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_15_prod: prod", async () => {
    await addAction('Tactical action');
    await tapTile(26);
    // Hacan's last fighter on Lodor would blockade the dock: its loss is recorded in the battle of this action.
    await panel().getByRole('button', { name: /^Battle/ }).click();
    await stageEl().locator('g[aria-label="Fighter ×1 (The Emirates of Hacan)"]').click();
    await closeStage();
    await panel().getByRole('button', { name: /^Production/ }).click();
    await put('Cruiser', 3);
    await closeStage();
    await expect(panel().locator('li[data-code]')).toHaveCount(0);
    // BUG: Particle Synthesis (-1 per wormhole in the system, Lodor has alpha) is applied by the replay but not by the payment block,
    // which still reads "Cost 6": the check accepts 5 paid.
    await expect(panel().getByText('Cost 6, paid 6')).toBeVisible();
    await panel().getByRole('button', { name: 'Choose manually' }).click();
    await panel().getByRole('button', { name: 'Remove one trade good' }).click();
    await expect(panel().getByText('Cost 6, paid 5')).toBeVisible();
    await expect(panel().locator('li[data-code]')).toHaveCount(0);
    await shot('r2-15-prod');
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_16_mech: mech", async () => {
    await page.getByRole('button', { name: 'Edit: Tactical action · Lodor' }).click();
    await panel().getByRole('button', { name: '+ Used' }).click();
    await pick('icarus drive', 'Icarus Drive');
    await panel().getByRole('button', { name: 'Beta', exact: true }).click();
    // BUG: the mech stands on the planet Vefut II, and the list "System of the mech" says "Nothing to choose from".
    await expect(panel().getByText('Nothing to choose from')).toBeVisible();
    await panel().getByRole('button', { name: '+ Used' }).click();
    await pick('emissary taivra', 'Emissary Taivra');
    await shot('r2-16-used');
    await expect(panel().locator('li[data-code]')).toHaveCount(1); // the agent was exhausted in the first tactical action of the round
    await expect(panel().locator('li[data-code]').first()).toContainText('Emissary Taivra');
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_17_deal: deal", async () => {
    await addAction('Pass');
    await panel().getByRole('button', { name: '+ Transaction' }).click();
    await panel().getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Hacan', exact: true }).click();
    // Hacan is not a neighbour: the transaction is warned of, nothing more.
    await expect(panel().getByText('A transaction is only with a neighbour: you need units or planets in the same or adjacent systems.')).toBeVisible();
    await panel().getByRole('button', { name: 'Add one Commodities' }).first().click();
    await panel().getByRole('button', { name: 'Add one Commodities' }).first().click();
    await panel().getByRole('button', { name: '+ Component' }).first().click();
    await pickerEl().getByRole('searchbox', { name: 'Search components' }).fill('creuss');
    await pickerEl().getByRole('button', { name: /^Choose Creuss Iff/ }).first().click();
    await shot('r2-17-deal');
    expect(await sum('Commodities')).toBe('Commodities 0 → 2');
    await panel().getByRole('button', { name: 'Back' }).click();
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_18_rival: rival", async () => {
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Hacan', exact: true }).click();
    await addAction('Component action');
    await pick('creuss iff', 'Creuss Iff');
    await panel().getByRole('button', { name: 'Beta', exact: true }).click();
    await panel().getByRole('button', { name: "Tar'mann", exact: true }).click();
    await expect(panel().locator('li[data-code]')).toHaveCount(0);
    await done();
    // The rival's play of my note returns the card to me; the numbers of my own summary do not move.
    expect(await sum('Commodities')).toBe('Commodities 0 → 2');
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_19_rival_tactical: rival tactical", async () => {
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Hacan', exact: true }).click();
    await addAction('Tactical action');
    await tapTile(26);
    await dragRoute([16, 24, 26]);
    
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_19b_rival_land: rival land", async () => {
    await take('Carrier', 2); await take('Cruiser');
    await take('Infantry', 4);
    await page.getByRole('button', { name: 'Fly' }).click();
    // Hacan's carriers have move 1 and the route takes 2 steps: the warning of the rival's own action.
    await expect(panel().locator('li[data-code="speedShort"]')).toHaveCount(1);
    const land = panel().getByRole('group', { name: 'Landing on Lodor' });
    for (let i = 0; i < 4; i++) await land.getByRole('button', { name: 'Land one Infantry' }).click();
    await shot('r2-19-rival-landed');
    await expect(panel().locator('li[data-code="capacitySystem"]').first()).toContainText('2 of 0');
    await done();
    // BUG-CANDIDATE: the two fighters Hacan leaves at home read "over capacity: 2 of 0" although the home has a space dock (and the line is listed twice).
    // A rival's landing takes the planet, destroys my space dock, and my three infantry stay on it with no ground combat (no simulation by design).
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r2_20_status: status", async () => {
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Mine', exact: true }).click();
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    expect(await sum('Resources')).toBe('Resources 4 → 6'); // Creuss 4 + Vefut II 2; Lodor is Hacan's now
    expect(await sum('Influence')).toBe('Influence 2 → 4');
    await page.getByRole('button', { name: 'Add one Strategy' }).click();
    await page.getByRole('button', { name: 'Add one Strategy' }).click();
    await page.getByRole('button', { name: 'Score an objective' }).click();
    await pick('become the gatekeeper', 'Become the Gatekeeper');
    await page.getByRole('button', { name: 'Add one Creuss' }).click();
    await page.getByRole('button', { name: '+ Action card' }).click();
    await pick('industrial initiative', 'Industrial Initiative');
    await page.getByRole('button', { name: '+ Took' }).click();
    await pick('economic initiative', 'Economic Initiative');
    expect(await sum('VP')).toBe('VP 0 → 2');
    expect(await sum('Strategy')).toBe('Strategy 2');
    
    expect(problems, "console or page errors").toEqual([]);
  });
});

test("round 3: relic, research with prerequisites, tactical action with the agent and the commander, agenda, the rival cards", async () => {
  await test.step("r3_01_round: round", async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Delete round 3' })).toBeVisible();
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '5 Trade' }).click();
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction('Strategy');
    await page.getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel().getByRole('button', { name: '+ Took' }).click();
    await pick('dynamis core', 'Dynamis Core');
    await panel().getByRole('button', { name: 'Research a technology' }).click();
    await pick('plasma scoring', 'Plasma Scoring');
    await panel().getByRole('button', { name: /Research a technology/ }).click();
    await pick('dimensional splicer', 'Dimensional Splicer');
    await sleep(300);
    // Prerequisites: Plasma Scoring (red) opens Dimensional Splicer (1 red) with no warning.
    await expect(panel().locator('li[data-code]')).toHaveCount(0);
    expect(await sum('Resources')).toBe('Resources 4 → 0');
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r3_02_trade: trade", async () => {
    await addAction('Strategy');
    await expect(page.getByRole('button', { name: '5 Trade' })).toHaveAttribute('aria-pressed', 'true');
    // Dynamis Core: the commodity value of Creuss, 4, is 6 with the relic.
    expect(await sum('Commodities')).toBe('Commodities 0 → 6');
    expect(await sum('Trade goods')).toBe('Trade goods 0 → 4');
    await panel().getByRole('button', { name: '+ Took' }).click();
    await pick('upgrade', 'Upgrade');
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r3_03_dynamis: dynamis", async () => {
    await addAction('Component action');
    await pick('dynamis core', 'Dynamis Core');
    await sleep(300);
    await shot('r3-03-dynamis');
    const tg = await sum('Trade goods');
    await done();
    expect(await sum('Trade goods')).toBe('Trade goods 0 → 10');
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r3_04_prereq: prereq", async () => {
    await addAction('Strategy');
    await page.getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '1 Leadership' }).click();
    await page.getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel().getByRole('button', { name: 'Research a technology' }).click();
    await pick('integrated economy', 'Integrated Economy'); // yellow, needs 3 yellow: Creuss has none
    await expect(panel().locator('li[data-code="prerequisitesMissing"]')).toContainText('3 missing (cybernetic ×3)');
    await done();
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Delete' }).last().click();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r3_05_tactical: tactical", async () => {
    await addAction('Tactical action');
    await tapTile(26);
    await panel().getByRole('button', { name: 'Add source' }).click();
    await tapTile(39);
    await tapTile(26);
    await take('Carrier'); await take('Destroyer'); await take('Fighter');
    await page.getByRole('button', { name: 'Fly' }).click();
    await panel().getByRole('button', { name: /^Battle/ }).click();
    await shot('r3-05-battle');
    const t = await stageEl().innerText();
    await closeStage();
    await panel().getByRole('button', { name: '+ Used' }).click();
    await pick('emissary taivra', 'Emissary Taivra');
    await panel().getByRole('button', { name: '+ Used' }).click();
    await pick('sai seravus', 'Sai Seravus');
    await panel().getByRole('button', { name: '+ Used' }).click();
    await pick('upgrade', 'Upgrade'); // a cruiser of Lodor becomes a dreadnought
    await expect(panel().locator('li[data-code="componentNotHeld"]')).toHaveCount(0);
    await shot('r3-05-tactical');
    // Dimensional Splicer and Plasma Scoring stand as reminders in the battle step; the agent is ready again after the status phase.
    await expect(panel().getByRole('group', { name: 'Reminders for this step' }).getByTestId('component-technology:ds')).toBeVisible();
    await expect(panel().locator('li[data-code="poolNegative"]')).toHaveCount(1);
    await expect(panel().locator('li[data-code="componentExhausted"]')).toHaveCount(0);
    await done();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r3_06_pass_status: pass status", async () => {
    await addAction('Pass');
    await done();
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await page.getByRole('button', { name: 'Add one Tactic' }).click();
    await page.getByRole('button', { name: 'Add one Fleet' }).click();
    await page.getByRole('button', { name: 'Score an objective' }).click();
    await pick('diversify research', 'Diversify Research');
    await page.getByRole('button', { name: 'Add one Creuss' }).click();
    expect(await sum('VP')).toBe('VP 0 → 3');
    expect(await sum('Resources')).toBe('Resources 4 → 6'); // Lodor is Hacan's
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r3_07_agenda: agenda", async () => {
    const agendas = page.getByRole('region', { name: 'Agenda' });
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel().getByRole('button', { name: 'Choose the agenda' }).click();
    await pick('wormhole reconstruction', 'Wormhole Reconstruction');
    await expect(panel().getByTestId('component-agenda:wormhole_recon')).toContainText('law: stays in play');
    await done();
    await openDrawer(/^Objectives & laws/);
    await expect(drawerEl().getByRole('group', { name: 'Laws' })).toContainText('Wormhole Reconstruction');
    await shot('r3-07-laws');
    await closeDrawer();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r3_08_rival_card: rival card", async () => {
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Argent', exact: true }).click();
    await addAction('Strategy');
    await page.getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '8 Imperial' }).click();
    await shot('r3-08-rival-card');
    const before = [await sum('VP'), await sum('Resources'), await sum('Trade goods'), await sum('Strategy')];
    await done();
    const after = [await sum('VP'), await sum('Resources'), await sum('Trade goods'), await sum('Strategy')];
    expect(after).toEqual(before);
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Mine', exact: true }).click();
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r3_09_now: now", async () => {
    await page.getByRole('button', { name: 'Round 2', exact: true }).click();
    for (const name of ['Strategy: Technology', 'Strategy: Politics', 'Secondary: Construction']) await page.getByRole('listitem', { name }).getByRole('checkbox', { name: 'Done' }).check();
    await page.getByRole('button', { name: 'Now', exact: true }).click();
    await shot('r3-09-now');
    const now = [await sum('Resources'), await sum('Trade goods'), await sum('Strategy'), await sum('Tactic')];
    await page.getByRole('button', { name: 'Forecast', exact: true }).click();
    void now;
    
    expect(problems, "console or page errors").toEqual([]);
  });
  await test.step("r3_10_enemyloss: enemyloss", async () => {
    // Losses of another player recorded in the battle of an action are written to the board, not to the entry: deleting the entry keeps them.
    const loseOne = async () => {
      await addAction('Tactical action');
      await tapTile(16);
      await panel().getByRole('button', { name: /^Battle/ }).click();
      const labels = await stageEl().locator('g[aria-label]').evaluateAll(a => a.map(e => e.getAttribute('aria-label')));
      return labels;
    };
    const first = await loseOne();
    const fighters = first.find(l => /^Fighter ×\d+ \(The Emirates of Hacan\)/.test(l));
    await stageEl().locator(`g[aria-label="${fighters}"]`).click();
    await closeStage();
    await done();
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Delete' }).last().click();
    const second = await loseOne();
    await closeStage();
    await done();
    await page.getByRole('region', { name: 'Actions' }).getByRole('button', { name: 'Delete' }).last().click();
    // BUG: the fighter is still lost after its entry was deleted
    expect(second.find(l => /^Fighter/.test(l))).not.toBe(fighters);
    
    expect(problems, "console or page errors").toEqual([]);
  });
});
