import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * One long game of the Council Keleres (Argent variant), four players, Prophecy of Kings and Thunder's Edge on,
 * played through the interface. Findings stay as steps asserting the actual behaviour, marked `// BUG:`.
 */
const SHOTS = 'test-results/scenarios/keleresa';
// Seat 1 Keleres (home 58, Argent), seat 2 Sol (1), seat 3 Titans of Ul (55), seat 4 Last Bastion (92).
const MAP = '78 40 42 67 69 34 39 27 26 65 79 47 32 30 29 73 41 21 58 62 19 1 44 36 38 61 76 55 37 50 92 35 31 33 22 23';

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const stage = (page: Page) => page.locator('.stage-dialog');
const summary = (page: Page, name: string) => page.getByRole('group', { name: 'Totals, now and forecast' }).getByRole('group', { name, exact: true });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });
const done = (page: Page) => panel(page).getByRole('button', { name: 'Done', exact: true });
const warnings = (page: Page) => panel(page).locator('li[data-code]');
const live = (page: Page) => panel(page).locator('li[data-code]:not(.warning-waived)');
const waived = (page: Page) => panel(page).locator('li.warning-waived[data-code]');

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

const problems: string[] = [];
let shotNo = 0;
async function shot(page: Page, name: string): Promise<void> {
  shotNo += 1;
  await page.screenshot({ path: `${SHOTS}/${String(shotNo).padStart(2, '0')}-${name}.png` });
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
async function choose(page: Page, query: string, name: string | RegExp): Promise<void> {
  await picker(page).getByRole('searchbox', { name: 'Search components' }).fill(query);
  await picker(page).getByRole('button', { name: typeof name === 'string' ? `Choose ${name}` : name }).first().click();
  await expect(picker(page)).toHaveCount(0);
}
const lines = async (loc: Locator) => (await loc.allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());

test.describe.configure({ mode: 'serial' });

test('keleres (argent): the whole game', async ({ page }) => {
  test.setTimeout(540_000);
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
    await page.getByRole('group', { name: 'Player 5' }).getByRole('button', { name: 'Remove opponent' }).click();
    await pick(1, 'The Council Keleres - Argent');
    await pick(2, 'The Federation of Sol');
    await pick(3, 'The Titans of Ul');
    await pick(4, 'Last Bastion');
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('textbox', { name: 'Game name' }).fill('Keleres long');
    await shot(page, 'players');
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    await shot(page, 'milty');
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText(/The map is built/)).toBeVisible();
    await shot(page, 'game');
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 58)).toBeVisible();
    await shot(page, 'start');
  });


  const T0 = { Resources: 3, Influence: 3, 'Trade goods': 0, Commodities: 0, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 };

  await test.step('round 1 start: the numbers of the home system and the tokens (Argent home: Avar 1/1, Valk 2/0, Ylir 0/2)', async () => {
    expect(await totals(page)).toEqual(T0);
  });

  await test.step('the Faction group of a Keleres (Argent) player', async () => {
    await openGroup(page, /^Faction/);
    const text = (await drawer(page).innerText()).replace(/\s+/g, ' ');
    await shot(page, 'faction-group');
    // LRR/ability list of the sheet: agent Xander, commander Suffi An, hero Kuuasi, mech Omniopiares, abilities, technologies.
    // BUG: the components Keleres share (agent, commander, mech, abilities, faction technologies) are filed under the first of the three
    // factions (Mentak), so the Argent player's Faction group lists only the hero Kuuasi: no agent, no commander, no abilities, no mech.
    // (src/domain/components.ts add() keeps the first owner; src/domain/holdings.ts leadersOf() filters by c.faction === factionId.)
    expect(text).toContain('Kuuasi Aun Jalatai');
    expect(text).not.toContain('Xander');
    expect(text).not.toContain('Suffi An');
    // The same components are found in the search, labelled as Keleres - Mentak.
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('xander');
    await expect(drawer(page)).toContainText('The Council Keleres - Mentak');
    // Workaround: the start state of the agent and the commander is set from the search results.
    const agent = drawer(page).getByTestId('component-leader:keleresagent');
    await agent.locator('.segment > button').nth(1).click();
    await expect(agent.locator('.segment > button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('suffi');
    const commander = drawer(page).getByTestId('component-leader:kelerescommander');
    console.log('COMMANDER', (await commander.innerText()).replace(/\s+/g, ' '));
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('');
    await closeDrawer(page);
  });

  await test.step('e1: Technology primary: Sarween Tools free, Gravity Drive for 6 (3 planets, 1 trade good, 2 commodities through the agent)', async () => {
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '7 Technology' }).click();
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: '5 Trade' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Technology · primary ability' })).toBeVisible();
    // Council Patronage: at the start of the round the commodities are replenished (0 to 2) and 1 trade good is gained.
    await expect(summary(page, 'Trade goods')).toHaveText(/1/);
    await expect(summary(page, 'Commodities')).toHaveText(/2/);
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'sarween', 'Sarween Tools');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'gravity drive', 'Gravity Drive');
    await expect(live(page)).toContainText('Not enough resources: need 6, paid 4');
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'xander', /^Choose Xander/);
    await expect(live(page).filter({ hasText: 'you do not hold' })).toHaveCount(0);
    const pay = panel(page).getByRole('group', { name: 'Payment' });
    await pay.getByRole('button', { name: 'Choose manually' }).click();
    await pay.getByRole('button', { name: 'Add one trade good' }).click();
    await pay.getByRole('button', { name: 'Add one trade good' }).click();
    await expect(pay).toContainText('Cost 6, paid 6');
    await expect(pay.locator('li.warning-waived[data-code="shortTradeGoods"]')).toContainText('Allowed by: Xander Alexin Victori III');
    // BUG: the header says paid 6 (1 trade good and 2 commodities as trade goods), the warning of the resources still says paid 4, short by 2.
    await expect(live(page)).toContainText('Not enough resources: need 6, paid 4, short by 2');
    await shot(page, 'r1-tech-agent');
    await done(page).click();
    expect(await totals(page)).toMatchObject({ Resources: 0, Influence: 2, 'Trade goods': 0, Commodities: 0, Tactic: 3, Strategy: 2 });
  });

  await test.step('e1b: Setup: two Sol destroyers wait in the wormhole system 39 (a rival fleet next to my home)', async () => {
    await tapTile(page, 39);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(tile(page, 39).getByRole('img', { name: /Destroyer ×2 \(The Federation of Sol\)/ })).toBeVisible();
  });

  await test.step('e2: tactical action to 39: cruiser and two fighters, space combat, one fighter and both destroyers are lost', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 39);
    await expect(page.getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await dragRoute(page, [58, 39]);

    await page.getByRole('button', { name: 'Take one Cruiser' }).click();
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await page.getByRole('button', { name: 'Take one Fighter' }).click();
    await page.getByRole('button', { name: 'Take one Fighter' }).click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();

    await stage(page).getByRole('button', { name: 'Fighter ×2' }).click();
    await stage(page).getByRole('button', { name: /^Destroyer ×2 \(The Federation of Sol\)/ }).click();
    await stage(page).getByRole('button', { name: /^Destroyer ×1 \(The Federation of Sol\)/ }).click();
    await shot(page, 'r1-battle');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    console.log('E2 WARN', JSON.stringify(await lines(warnings(page))));
    await done(page).click();
    await expect(tile(page, 39).getByRole('img', { name: /Destroyer/ })).toHaveCount(0);
    await expect(tile(page, 39).getByRole('img', { name: 'Fighter ×1' })).toBeVisible();
    await expect(tile(page, 39).getByRole('img', { name: 'Cruiser ×1' })).toBeVisible();
    expect(await totals(page)).toMatchObject({ Tactic: 2, Fleet: 3 });
  });

  await test.step('e3: tactical action to Sem-Lore (62): the second carrier takes the two infantry and lands, the planet is taken', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 62);
    await expect(page.getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await dragRoute(page, [58, 62]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();

    await page.getByRole('button', { name: 'Take one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Take one Infantry' }).first().click();
    await expect(panel(page).getByText('Cargo on board: 2 of 4')).toBeVisible();
    await page.getByRole('button', { name: 'Fly' }).click();
    await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    await shot(page, 'r1-landing');
    console.log('E3 WARN', JSON.stringify(await lines(warnings(page))));
    await done(page).click();
    // 25.1: a planet taken is exhausted, so the ready totals do not change.
    expect(await totals(page)).toMatchObject({ Resources: 0, Influence: 2, Tactic: 1 });
    await expect(tile(page, 62).getByRole('group', { name: /Sem-Lore: 3\/2.*yours/ })).toBeVisible();
  });

  await test.step('e4: Trade primary (my second card): 3 trade goods, commodities replenished to 2; five action cards are taken', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Trade · primary ability' })).toBeVisible();
    await expect(summary(page, 'Commodities')).toHaveText(/→ 2/);
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    for (const [q, n] of [['industrial initiative', 'Industrial Initiative'], ['mining initiative', 'Mining Initiative'], ['upgrade', 'Upgrade'], ['plagiarize', 'Plagiarize'], ['sabotage', 'Sabotage']] as const) {
      await taken.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await shot(page, 'r1-trade-cards');
    console.log('E4 WARN', JSON.stringify(await lines(warnings(page))));
    await done(page).click();
    expect(await totals(page)).toMatchObject({ Commodities: 2, Strategy: 2, 'Trade goods': 3 });
  });

  await test.step('e5: component action: Industrial Initiative (1 trade good per industrial planet I control)', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    console.log('E5 WARN', JSON.stringify(await lines(warnings(page))));
    await shot(page, 'r1-industrial');
    await done(page).click();
    console.log('E5 TOTALS', JSON.stringify(await totals(page)));
  });

  await test.step('e6: component action: Mining Initiative on Valk (2 resources are 2 trade goods)', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    console.log('E6 PANEL', (await panel(page).innerText()).replace(/\s+/g, ' ').slice(0, 900));
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Valk' }).click();
    console.log('E6 WARN', JSON.stringify(await lines(warnings(page))));
    await done(page).click();
    console.log('E6 TOTALS', JSON.stringify(await totals(page)));
  });

  await test.step('e7: pass, then the status phase of round 1: two tokens and an action card', async () => {
    await addAction(page, 'Pass');
    await done(page).click();
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('button', { name: 'Add one Strategy' }).click();
    await expect(status).toContainText('Distribute tokens: 0 left');
    await status.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'sanction', 'Sanction');
    await shot(page, 'r1-status');
    expect(await totals(page)).toMatchObject({ Tactic: 2, Strategy: 3, Fleet: 3 });
  });

  await test.step('round 2 start: planets ready, Council Patronage replenishes and gives a trade good', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    // Avar 1, Valk 2, Sem-Lore 3 resources; Avar 1, Ylir 2, Sem-Lore 2 influence; 2 trade goods + 1; commodities already 2.
    // BUG (low): a round without entries shows no start-of-round effect: Council Patronage's trade good (6 expected) appears only once the round has an entry.
    expect(await totals(page)).toEqual({ Resources: 6, Influence: 5, 'Trade goods': 5, Commodities: 2, Tactic: 2, Fleet: 3, Strategy: 3, VP: 0 });
    console.log('R2 CARDS at start', JSON.stringify(await page.locator('.card-cell').evaluateAll(b => b.map(x => x.textContent + ':' + x.className))));
    await shot(page, 'round2');
  });

  await test.step('r2-e1: tactical action on the home system: a carrier, an infantry and the mech Omniopiares; Sarween Tools takes 1 off; paid by Avar and trade goods', async () => {
    console.log('R2 CARDS before', JSON.stringify(await page.locator('.card-cell').evaluateAll(b => b.map(x => x.textContent + ':' + x.className))));
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '7 Technology' }).click();
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: '3 Politics' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 58);
    await expect(page.getByText('Tactic tokens: 2 → 1')).toBeVisible();
    // Council Patronage again at the start of the round, now that the round has an entry: 2 + 1 trade goods.
    expect(await totals(page)).toMatchObject({ 'Trade goods': 6, Commodities: 2 });
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: 'Carrier', exact: true }).click();
    await stage(page).getByRole('button', { name: /^Mech/ }).first().click();
    console.log('R2 SHOP', (await stage(page).innerText()).replace(/\s+/g, ' ').slice(0, 900));
    await shot(page, 'r2-shop');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    console.log('R2E1 PAY', (await panel(page).getByRole('group', { name: 'Payment' }).innerText()).replace(/\s+/g, ' '));
    console.log('R2E1 WARN', JSON.stringify(await lines(warnings(page))));
  });

  await test.step('r2-e1b: the payment: by hand Avar 1, Valk 2 and 1 trade good = 4, the cost with Sarween Tools', async () => {
    const pay = panel(page).getByRole('group', { name: 'Payment' });
    await pay.getByRole('button', { name: 'Choose manually' }).click();
    await pay.getByRole('button', { name: 'Sem-Lore 3' }).click();
    await pay.getByRole('button', { name: 'Avar 1' }).click();
    await pay.getByRole('button', { name: 'Add one trade good' }).click();
    console.log('R2E1B PAY', (await pay.innerText()).replace(/\s+/g, ' '));
    console.log('R2E1B WARN', JSON.stringify(await lines(warnings(page))));
    await shot(page, 'r2-pay');
    await done(page).click();
    console.log('R2E1B TOTALS', JSON.stringify(await totals(page)));
  });

  await test.step('r2-e2: Technology primary: Executive Order (free, Sarween Tools is the yellow prerequisite), Agency Supply Network for 6 (Sem-Lore 3, 3 trade goods)', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Technology · primary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'executive order', 'Executive Order');
    await expect(live(page)).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'agency supply', 'Agency Supply Network');


    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    await expect(live(page)).toHaveCount(0);
    await shot(page, 'r2-tech');
    await done(page).click();
    expect(await totals(page)).toMatchObject({ Resources: 0, Influence: 2, 'Trade goods': 2, Commodities: 2 });
  });

  await test.step('r2-e3: component action: Executive Order (exhausted by use); a second use in the round warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'executive order', 'Executive Order');
    await expect(live(page)).toHaveCount(0);
    await shot(page, 'r2-eo');

    await done(page).click();
    await addAction(page, 'Component action');
    await choose(page, 'executive order', 'Executive Order');
    await expect(live(page).filter({ hasText: /exhausted/ })).toHaveCount(1);
    await shot(page, 'r2-eo-twice');
    await done(page).click();
  });

  await test.step('r2-e4: tactical action to Thibah (21): a carrier brings the mech, it lands and the planet is taken', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 21);
    await expect(page.getByText('Tactic tokens: 1 → 0')).toBeVisible();
    await dragRoute(page, [58, 39, 21]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();

    await page.getByRole('button', { name: 'Take one Mech' }).first().click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await page.getByRole('button', { name: 'Land one Mech' }).first().click();
    console.log('R2E4 SPEED', JSON.stringify(await lines(warnings(page))));
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'gravity drive', 'Gravity Drive');
    console.log('R2E4 SPEED2', JSON.stringify(await lines(warnings(page))));
    // LRR 6.4 / 95: ships cannot move out of a system that holds my command token (the home was activated for the production): the app rightly warns.
    await expect(live(page)).toContainText('already holds your command token');
    await shot(page, 'r2-thibah');
    await done(page).click();
    console.log('R2E4 TOTALS', JSON.stringify(await totals(page)));
    await expect(tile(page, 21).getByRole('group', { name: /Thibah: 1\/1.*yours/ })).toBeVisible();
  });

  await test.step('r2-e4b: Politics primary (my second card): two action cards are taken', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Politics · primary ability' })).toBeVisible();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'insider', /^Choose Insider/);
    await expect(live(page)).toHaveCount(0);
    await done(page).click();
  });

  await test.step('r2-e5: Industrial Initiative: Thibah is industrial, 1 trade good', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    await done(page).click();
    expect(await totals(page)).toMatchObject({ 'Trade goods': 3 });
  });

  await test.step('r2-e6: pass with a transaction: the Keleres Rider and 1 trade good go to the Titans of Ul', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();

    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button').nth(1).click();

    await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: '+ Component' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('keleres rider');

    await picker(page).getByRole('button', { name: /^Choose Keleres Rider/ }).first().click();
    await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    await expect(live(page)).toContainText('only with a neighbour');
    await shot(page, 'r2-rider');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page).click();
    expect(await totals(page)).toMatchObject({ 'Trade goods': 2 });
  });

  await test.step('r2-e7: status phase: Lead From the Front is scored by spending 3 strategy tokens; tokens are distributed', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'lead from the front', 'Lead From the Front');
    const cost = status.getByRole('group', { name: 'What scoring cost' });
    for (let i = 0; i < 3; i++) await cost.getByRole('button', { name: 'Add one Strategy' }).click();
    await status.getByRole('button', { name: 'Add one Keleres' }).click();
    await status.getByRole('button', { name: 'Add one Tactic' }).first().click();
    await status.getByRole('button', { name: 'Add one Tactic' }).first().click();
    await shot(page, 'r2-status-score');

    await status.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'reflective', /^Choose Reflective/);

  });

  await test.step('round 3 start', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
    // BUG (medium): the 3 strategy tokens entered under "What scoring cost" of Lead From the Front in round 2 are never taken: the pool stays at 3 (should be 0). (publicObjective/lead.ts has only a requirement and never calls spentOnObjectives.)
    expect(await totals(page)).toEqual({ Resources: 7, Influence: 6, 'Trade goods': 2, Commodities: 2, Tactic: 2, Fleet: 3, Strategy: 3, VP: 1 });
    await shot(page, 'round3');
  });

  const roundsOf = async () => JSON.stringify(await page.getByRole('group', { name: 'Rounds' }).getByRole('button').evaluateAll(b => b.map(x => x.getAttribute('aria-label') + ':' + x.getAttribute('aria-pressed'))));
  console.log('ROUNDS before leaders', await roundsOf(), await page.locator('.entry').count());
  await test.step('r3: leaders set by hand: the commander Suffi An (a trade good was spent after the action cards), the hero Kuuasi (three objectives); the breakthrough', async () => {
    await openGroup(page, /^Faction/);
    const hero = drawer(page).getByTestId('component-leader:keleresherokuuasi');
    await hero.locator('.segment > button').nth(1).click();
    await expect(hero.locator('.segment > button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('suffi');
    const commander = drawer(page).getByTestId('component-leader:kelerescommander');
    await commander.locator('.segment > button').nth(1).click();
    await expect(commander.locator('.segment > button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('i.i.h.q');
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('');
    await shot(page, 'r3-faction-group');
    console.log('ROUNDS after leaders', await roundsOf(), await page.locator('.entry').count());
    await closeDrawer(page);
  });

  await test.step('r3-e1: Technology primary: Antimass Deflectors free, Carrier II for 6 (Avar 1 + Valk 2 + Sem-Lore 3)', async () => {
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '7 Technology' }).click();
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: '8 Imperial' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Technology · primary ability' })).toBeVisible();
    await expect(live(page)).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'antimass', 'Antimass Deflectors');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'carrier ii', 'Carrier II');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    console.log('R3E1 LIVE', JSON.stringify(await lines(live(page))), JSON.stringify(await totals(page)));
    await shot(page, 'r3-e1');
    await done(page).click();
    console.log('R3E1 TOTALS', JSON.stringify(await totals(page)));
  });
  await test.step('r3-e2: tactical action to Mecatol Rex (112): the carrier and the mech leave Thibah, the mech lands; the relic Book of Latvinia is taken, two technologies with it', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 112);
    await expect(page.getByText('Tactic tokens: 2 → 1')).toBeVisible();
    await dragRoute(page, [21, 34, 112]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await page.getByRole('button', { name: 'Take one Mech' }).first().click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await page.getByRole('button', { name: 'Land one Mech' }).first().click();
    console.log('R3E2 WARN a', JSON.stringify(await lines(warnings(page))));
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'gravity drive', 'Gravity Drive');
    console.log('R3E2 WARN b', JSON.stringify(await lines(warnings(page))));
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'latvinia', 'Book of Latvinia');
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'plasma scoring', 'Plasma Scoring');
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'neural motivator', 'Neural Motivator');
    console.log('R3E2 WARN c', JSON.stringify(await lines(warnings(page))));
    await shot(page, 'r3-mecatol');
    await done(page).click();
    console.log('R3E2 TOTALS', JSON.stringify(await totals(page)));
    await expect(tile(page, 112).getByRole('group', { name: /Mecatol Rex.*yours/ })).toBeVisible();
  });
  await test.step('r3-e3: component action: Book of Latvinia (I hold only propulsion and cybernetic specialties: no victory point, the speaker token)', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'latvinia', 'Book of Latvinia');
    console.log('R3E3 WARN', JSON.stringify(await lines(warnings(page))));
    console.log('R3E3 PANEL', (await panel(page).innerText()).replace(/\s+/g, ' ').slice(0, 700));
    await shot(page, 'r3-latvinia');
    await done(page).click();
    console.log('R3E3 TOTALS', JSON.stringify(await totals(page)));
  });

  await test.step('r3-e4: Setup: a Sol cruiser waits in Sem-Lore (62); tactical action there: the hero Kuuasi comes in the combat, Law\'s Order costs 1 trade good', async () => {
    await tapTile(page, 62);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 62);
    await expect(page.getByText('Tactic tokens: 1 → 0')).toBeVisible();
    console.log('R3E4 PANEL0', (await panel(page).innerText()).replace(/\s+/g, ' ').slice(0, 600));
    const used = panel(page).getByRole('group', { name: 'Used' });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'kuuasi', /^Choose Kuuasi/);
    console.log('R3E4 WARN a', JSON.stringify(await lines(warnings(page))));
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, "law's order", /^Choose Law/);
    console.log('R3E4 WARN b', JSON.stringify(await lines(warnings(page))));
    console.log('R3E4 TOTALS', JSON.stringify(await totals(page)));
    await shot(page, 'r3-hero');
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    console.log('R3E4 STAGE', (await stage(page).innerText()).replace(/\s+/g, ' ').slice(0, 600));
    await shot(page, 'r3-hero-battle');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await done(page).click();
    console.log('R3E4 TOTALS after', JSON.stringify(await totals(page)));
  });
  await test.step('r3-e4b: Imperial primary (my second card) while I hold Mecatol Rex: 1 victory point (LRR 45)', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Imperial · primary ability' })).toBeVisible();
    console.log('R3E4B WARN', JSON.stringify(await lines(warnings(page))));
    console.log('R3E4B TOTALS', JSON.stringify(await totals(page)));
    await shot(page, 'r3-imperial');
    await done(page).click();
    expect(await totals(page)).toMatchObject({ VP: 3 });
  });

  await test.step('r3-e5: the hero a second time (it is purged): a warning; a Sol carrier with two infantry from Primor (65) lands on Mecatol where my Omniopiares stands: it costs the Sol player 1 influence', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'sabotage', 'Sabotage');
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'kuuasi', /^Choose Kuuasi/);
    console.log('R3E5 WARN hero twice', JSON.stringify(await lines(warnings(page))));
    await shot(page, 'r3-hero-twice');
    await done(page).click();

    await tapTile(page, 65);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    await stage(page).getByRole('button', { name: 'Carrier', exact: true }).click();
    console.log('R3E5 SETUP', (await stage(page).innerText()).replace(/\s+/g, ' ').slice(0, 500));
    await shot(page, 'r3-setup-sol');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });
  await test.step('r3-e5b: Sol (a rival entry) takes its carrier and two infantry from 65 to Mecatol and lands', async () => {
    await tapTile(page, 65);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Sol' }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Sol' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 112);
    await dragRoute(page, [65, 112]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await page.getByRole('button', { name: 'Take one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Take one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    console.log('R3E5B WARN', JSON.stringify(await lines(warnings(page))));
    await shot(page, 'r3-sol-landing');
    await done(page).click();
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine', exact: true }).click();
    console.log('R3E5B TOTALS', JSON.stringify(await totals(page)));
  });
  await test.step('r3-e6: pass; status phase: Diversify Research (met) and the secret Unveil Flagship are scored; tokens go to the fleet pool', async () => {
    await addAction(page, 'Pass');
    await done(page).click();
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'diversify', /^Choose Diversify/);
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'unveil flagship', /^Choose Unveil/);
    console.log('R3E6 WARN', JSON.stringify(await lines(live(page))));
    await status.getByRole('button', { name: 'Add one Keleres' }).click();
    await status.getByRole('button', { name: 'Add one Keleres' }).click();
    await status.getByRole('button', { name: 'Add one Fleet' }).click();
    await status.getByRole('button', { name: 'Add one Fleet' }).click();
    await status.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'direct hit', /^Choose Direct Hit/);
    await shot(page, 'r3-status-score');
    console.log('R3E6 TOTALS', JSON.stringify(await totals(page)));
    console.log('R3E6 WARN2', JSON.stringify(await lines(live(page))));
  });
  await test.step('r3-agenda: three agendas: Executive Sanctions (for), Fleet Regulations (for), Minister of Commerce (me)', async () => {
    const agendas = page.getByRole('region', { name: 'Agenda' });
    const addAgenda = async (query: string, name: string) => {
      await agendas.getByRole('button', { name: '+ Agenda' }).click();
      await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
      await choose(page, query, name);
    };
    await addAgenda('executive sanctions', 'Executive Sanctions');
    console.log('AG1 PANEL', (await panel(page).innerText()).replace(/\s+/g, ' ').slice(0, 700));
    await panel(page).getByRole('group', { name: 'Outcome' }).last().getByRole('button', { name: 'For', exact: true }).click();
    await shot(page, 'r3-agenda-sanctions');
    await done(page).click();
    await addAgenda('fleet regulations', 'Fleet Regulations');
    await panel(page).getByRole('group', { name: 'Outcome' }).last().getByRole('button', { name: 'For', exact: true }).click();
    await done(page).click();
    await addAgenda('minister of commerce', 'Minister of Commerce');
    await panel(page).getByRole('button', { name: 'Elect The Council Keleres - Argent' }).click();
    await shot(page, 'r3-agenda-minister');
    await done(page).click();
    console.log('AG TOTALS', JSON.stringify(await totals(page)));
    await page.getByRole('button', { name: /^Components/ }).click();
    await groupTab(page, /^Objectives & laws/).click();
    console.log('LAWS', (await drawer(page).innerText()).replace(/\s+/g, ' ').slice(0, 900));
    await shot(page, 'r3-laws');
    await closeDrawer(page);
  });

  await test.step('round 4 start: the laws are in force (Fleet Regulations: 4 tokens at most in the fleet pool; mine 5)', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 4', exact: true })).toHaveAttribute('aria-pressed', 'true');
    console.log('R4 TOTALS', JSON.stringify(await totals(page)));
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '1 Leadership' }).click();
    for (let i = 0; i < 2; i++) await page.getByRole('button', { name: '5 Trade' }).click();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('heading', { name: 'Leadership · primary ability' })).toBeVisible();
    console.log('R4E1 WARN', JSON.stringify(await lines(warnings(page))));
    console.log('R4E1 PANEL', (await panel(page).innerText()).replace(/\s+/g, ' ').slice(0, 900));
    await shot(page, 'r4-leadership');
  });
  await test.step('r4-e1b: Leadership primary: 3 free tokens to the tactic pool, the fourth (to the fleet pool: 6 > 4 of Fleet Regulations) costs 3 influence', async () => {
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    for (let i = 0; i < 3; i++) await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    console.log('R4E1B TOTALS 3', JSON.stringify(await totals(page)), JSON.stringify(await lines(warnings(page))));
    await tokens.getByRole('button', { name: 'Add one Fleet' }).click();
    console.log('R4E1B TOTALS 4', JSON.stringify(await totals(page)), JSON.stringify(await lines(warnings(page))));
    console.log('R4E1B PANEL', (await panel(page).innerText()).replace(/\s+/g, ' ').slice(0, 1100));
    await shot(page, 'r4-leadership-tokens');
  });
  await test.step('r4-e2: Carrier II (capacity 6, move 2): from Sem-Lore (62) to Wellon (19) with two infantry; the cargo says of 6', async () => {
    await done(page).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 19);
    await expect(page.getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await dragRoute(page, [62, 19]);
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await page.getByRole('button', { name: 'Take one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Take one Infantry' }).first().click();
    console.log('R4E2 CARGO', JSON.stringify(await lines(panel(page).getByText(/Cargo|capacity|on board/i))));
    await page.getByRole('button', { name: 'Fly' }).click();
    await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    await page.getByRole('button', { name: 'Land one Infantry' }).first().click();
    console.log('R4E2 WARN', JSON.stringify(await lines(warnings(page))));
    await shot(page, 'r4-carrier2');
    await done(page).click();
    console.log('R4E2 TOTALS', JSON.stringify(await totals(page)));
  });
  await test.step('r4-e3: Executive Order is a component action again (ready in the new round); the agent Xander is used twice in the round: the second warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'executive order', 'Executive Order');
    await expect(live(page)).toHaveCount(0);
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'xander', /^Choose Xander/);
    console.log('R4E3 WARN agent 1', JSON.stringify(await lines(warnings(page))));
    await done(page).click();
    await addAction(page, 'Component action');
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    await panel(page).getByRole('group', { name: 'Used' }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'xander', /^Choose Xander/);
    console.log('R4E3 WARN agent 2', JSON.stringify(await lines(live(page))));
    await shot(page, 'r4-agent-twice');
    await done(page).click();
  });

  await test.step('r4-e4a: the breakthrough: the Faction group of the drawer', async () => {
    await openGroup(page, /^Faction/);
    const search = drawer(page).getByRole('searchbox', { name: 'Search components' });
    for (const q of ['modernization', 'iihq', 'custodia']) {
      await search.fill(q);
      await page.waitForTimeout(600);
      console.log('R4E4A SEARCH', q, (await lines(drawer(page))).join(' ').slice(0, 700));
    }
    await search.fill('modernization');
    // BUG: the breakthrough of the Keleres is filed under the first Keleres faction (Mentak), so an Argent player's drawer offers no "Add" for it
    // and the Faction group shows "Breakthrough: none" without a way to hold it; the Took picker does not list breakthroughs at all.
    // (src/domain/components.ts add() keeps the first owner; src/ui/drawers/ComponentsPanel.tsx:120 requires def.faction === faction.)
    await expect(drawer(page).getByRole('group', { name: 'Search results' })).toContainText('I.I.H.Q. Modernization');
    await expect(drawer(page).getByRole('button', { name: /^Add I.I.H.Q./ })).toHaveCount(0);
    await search.fill('');
    await shot(page, 'r4-breakthrough');
    await closeDrawer(page);
  });

  await test.step('r4-e4: a pass with a deal to Sol (Keleres Rider and 1 trade good)', async () => {
    await addAction(page, 'Pass');
    console.log('R4E4 TOTALS', JSON.stringify(await totals(page)));
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button').nth(0).click();
    console.log('R4E4 WITH', (await panel(page).getByRole('group', { name: 'With whom' }).innerText()).replace(/\s+/g, ' '));
    await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: '+ Component' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('support for the throne');
    console.log('R4E4 PICK', (await lines(picker(page))).join(' ').slice(0, 500));
    await picker(page).getByRole('button', { name: /^Choose Support for the Throne/ }).first().click();
    await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    console.log('R4E4 WARN sol', JSON.stringify(await lines(warnings(page))));
    await shot(page, 'r4-deal-sol');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page).click();
    console.log('R4E4 TOTALS after', JSON.stringify(await totals(page)));
  });
  await test.step('r4-e5: what the holders got: the Keleres Rider with the Titans, Support for the Throne with Sol; my own list lost both', async () => {
    await openGroup(page, /^Cards/);
    const who = page.getByRole('group', { name: 'Whose components' });
    const mineText = (await drawer(page).innerText()).replace(/\s+/g, ' ');
    console.log('R4E5 MINE0', mineText.slice(0, 1800));
    await who.getByRole('button', { name: 'Titans' }).click();
    const titans = (await drawer(page).innerText()).replace(/\s+/g, ' ');
    console.log('R4E5 TITANS', titans.slice(0, 1400));
    await shot(page, 'r4-titans-cards');
    await who.getByRole('button', { name: 'Sol' }).click();
    const sol = (await drawer(page).innerText()).replace(/\s+/g, ' ');
    console.log('R4E5 SOL', sol.slice(0, 1400));
    await who.getByRole('button', { name: 'Mine' }).click();
    console.log('R4E5 MINE', (await drawer(page).innerText()).replace(/\s+/g, ' ').slice(0, 1800));
    await closeDrawer(page);
  });
  await test.step('r4-e6: Trade (my second card): 3 trade goods and Minister of Commerce (+1 per neighbour); an action card taken: Executive Sanctions limits the hand to 3', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '5 Trade' }).click();
    console.log('R4E6 HEAD', (await lines(panel(page).getByRole('heading')))?.join('|'));
    const before = await totals(page);
    console.log('R4E6 TOTALS', JSON.stringify(before));
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'rally', /^Choose Rally/);
    console.log('R4E6 WARN', JSON.stringify(await lines(warnings(page))));
    await shot(page, 'r4-hand-limit');
    await done(page).click();
  });
  await test.step('r4-e7: status phase: Negotiate Trade Routes scored by spending 5 trade goods (9 - 5 = 4); two tokens to the tactic pool', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('listitem', { name: 'Tokens and points' });
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'trade routes', /^Choose Negotiate/);
    const cost = status.getByRole('group', { name: 'What scoring cost' });
    console.log('R4E7 COST', (await lines(cost)).join(' ').slice(0, 400));
    for (let i = 0; i < 5; i++) await cost.getByRole('button', { name: /Add one trade good/i }).click();
    await status.getByRole('button', { name: 'Add one Keleres' }).click();
    await status.getByRole('button', { name: 'Add one Tactic' }).first().click();
    await status.getByRole('button', { name: 'Add one Tactic' }).first().click();
    console.log('R4E7 WARN', JSON.stringify(await lines(live(page))));
    console.log('R4E7 TOTALS', JSON.stringify(await totals(page)));
    await shot(page, 'r4-status');
    await setMode(page, 'Now');
    console.log('R4E7 NOW', JSON.stringify(await totals(page)));
    await shot(page, 'r4-now');
    await setMode(page, 'Forecast');
  });
  expect(problems).toEqual([]);
});
