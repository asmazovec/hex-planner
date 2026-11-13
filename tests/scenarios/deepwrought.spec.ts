import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * One long game of the Deepwrought Scholarate, played through the interface. Seven players, Prophecy of Kings and
 * Thunder's Edge. Seats: 1 me (tile 95 at the top), 2 Sol, 3 Hacan, 4 Letnev, 5 Argent, 6 Nekro, 7 Last Bastion.
 * My neighbours: 36 Arnor/Lor (south), 60 Perimeter (east), 73 Cealdri/Xanhact (west). Mecatol is four hexes south:
 * 95 -> 36 -> 25 (Quann, beta) -> 19 (Wellon) -> 112.
 * Findings are kept as `// BUG:` comments where the step asserts the behaviour actually seen.
 */
const MAP = '19 20 21 22 23 24 25 26 27 28 29 30 86A0 31 32 33 34 35 36 37 38 39 40 41 42 43 88A0 44 87A0 45 46 47 48 49 50 59 95 60 61 1 62 63 16 64 65 10 66 83A0 85A0 84A0 67 58 68 69 8 70 71 92 72 73';
const OUT = 'test-results/scenarios/deepwrought';
const RIVALS = ['The Federation of Sol', 'The Emirates of Hacan', 'The Barony of Letnev', 'The Argent Flight', 'The Nekro Virus', 'Last Bastion'];

const errors: string[] = [];
const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const stage = (page: Page) => page.locator('.stage-dialog');
const summary = (page: Page, name: string) => page.locator('.summary-bar').getByRole('group', { name, exact: true });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });
const waived = (scope: Locator, code: string) => scope.locator(`li.warning-waived[data-code="${code}"]`);
const standing = (scope: Locator, code: string) => scope.locator(`li[data-code="${code}"]:not(.warning-waived)`);

let shotNo = 0;
async function shot(page: Page, name: string): Promise<void> {
  shotNo += 1;
  await page.screenshot({ path: `${OUT}/${String(shotNo).padStart(2, '0')}-${name}.png` });
  if (process.env.TRACE) console.log('TOTALS', name, JSON.stringify(await totals(page).catch(() => 'n/a')));
}

/** For writing the scenario: print what is on the screen and stop when STOP names this point. */
async function look(page: Page, name: string, scope = '.plan-panel'): Promise<void> {
  if (process.env.STOP !== name && process.env.LOOK !== name) return;
  await page.screenshot({ path: `${OUT}/look-${name}.png` });
  const buttons = await page.locator(`${scope} button, ${scope} [role=button]`).evaluateAll(all => all.filter(b => (b as HTMLElement).offsetParent !== null).map(b => (b.getAttribute('aria-label') || (b as HTMLElement).innerText || '').trim().replace(/\s*\n\s*/g, ' | ')));
  console.log(`--- LOOK ${name}\nBUTTONS: ${JSON.stringify(buttons)}\nTEXT: ${(await page.locator(scope).first().innerText()).replace(/\n+/g, ' / ')}`);
  if (process.env.STOP === name) throw new Error(`STOP at ${name}`);
}

async function total(page: Page, name: string, expected: number, mode = 'forecast'): Promise<void> {
  await expect(summary(page, name), `${name} (${mode})`).toHaveText(new RegExp(`(?<!\\d)${expected}$`));
}

async function totals(page: Page): Promise<Record<string, number>> {
  await expect(page.locator('.summary-forecast-leaving')).toHaveCount(0);
  const out: Record<string, number> = {};
  for (const n of ['Resources', 'Influence', 'Trade goods', 'Commodities', 'Tactic', 'Fleet', 'Strategy', 'VP']) {
    const text = (await summary(page, n).innerText()).replace(/\s+/g, ' ').trim();
    out[n] = Number(text.match(/(-?\d+)\s*$/)?.[1] ?? NaN);
  }
  return out;
}

async function centreWhenStill(target: Locator): Promise<{ x: number; y: number }> {
  let last = '';
  await expect.poll(async () => {
    const now = JSON.stringify(await target.boundingBox());
    const still = now === last;
    last = now;
    return still;
  }, { intervals: [150] }).toBe(true);
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function tapTile(page: Page, n: number): Promise<void> {
  await centreWhenStill(tile(page, n));
  await tile(page, n).click();
}

async function dragRoute(page: Page, hexes: number[]): Promise<void> {
  const points = [];
  for (const n of hexes) points.push(await centreWhenStill(tile(page, n)));
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

async function done(page: Page): Promise<void> {
  await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
}

async function actFor(page: Page, who: string): Promise<void> {
  await panel(page).getByRole('group', { name: 'Whose action' }).getByRole('button', { name: who, exact: true }).click();
}

async function take(page: Page, unit: string, times = 1): Promise<void> {
  for (let i = 0; i < times; i += 1) await panel(page).getByRole('button', { name: `Take one ${unit}` }).first().click();
}

async function closeDrawerAny(page: Page): Promise<void> {
  await page.getByRole('group', { name: 'Drawers' }).locator('button[aria-pressed=true]').first().click();
  await expect(drawer(page)).toHaveCount(0);
}

async function openGroup(page: Page, group: RegExp): Promise<void> {
  if ((await drawer(page).count()) === 0) await page.getByRole('button', { name: /^Components/ }).click();
  await expect(drawer(page)).toBeVisible();
  const tab = groupTab(page, group);
  if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-pressed', 'true');
}
const openFaction = (page: Page) => openGroup(page, /^Faction/);

async function setupGame(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Add opponent' }).click();
  const all = ['The Deepwrought Scholarate', ...RIVALS];
  for (let i = 0; i < 7; i += 1) {
    await page.getByRole('group', { name: `Player ${i + 1}` }).getByRole('button').first().click();
    await page.getByRole('button', { name: all[i], exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('textbox', { name: 'Game name' }).fill('Deepwrought');
  await page.getByRole('button', { name: 'Paste a Milty string' }).click();
  await page.getByLabel('Milty Draft map string').fill(MAP);
  await page.getByRole('button', { name: 'Apply' }).click();
  await look(page, 'mapdialog', 'body');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await expect(tile(page, 95)).toBeVisible();
}

let page: Page;
test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  const { readdirSync, unlinkSync, mkdirSync } = await import('node:fs');
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) if (/^\d\d-.*\.png$/.test(f) || f.startsWith('look-')) unlinkSync(`${OUT}/${f}`);
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true });
  page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
});

test.afterEach(() => {
  expect(errors, 'console errors').toEqual([]);
});

test('round 1', async () => {
  await test.step('the game from the first screen', async () => {
    await setupGame(page);
    console.log('START', JSON.stringify(await totals(page)));
    await shot(page, 'start');
    await look(page, 'start');
  });

  await test.step('the faction group of the drawer', async () => {
    await openFaction(page);
    await shot(page, 'faction-drawer');
    await look(page, 'faction', '[role=dialog][aria-label=Components]');
    await groupTab(page, /^Technologies/).click();
    await look(page, 'techs', '[role=dialog][aria-label=Components]');
    await groupTab(page, /^Cards/).click();
    await look(page, 'cards', '[role=dialog][aria-label=Components]');
    await closeDrawerAny(page);
  });

  await test.step('the starting technologies are added in the drawer', async () => {
    await openGroup(page, /^Technologies/);
    for (const [q, n] of [['neural motivator', 'Neural Motivator'], ['sarween', 'Sarween Tools']]) {
      await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill(q);
      await drawer(page).getByRole('group', { name: 'Search results' }).getByRole('button', { name: `Add ${n}` }).click();
    }
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await look(page, 'starttech', '[role=dialog][aria-label=Components]');
    await closeDrawerAny(page);
    await total(page, 'Resources', 4);
  });

  await test.step('R1: Technology as the main card: both faction technologies', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'hydrothermal', 'Hydrothermal Mining');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'radical advancement', 'Radical Advancement');
    await shot(page, 'tech-card');
    await look(page, 'techcard');
    await done(page);
    await total(page, 'Resources', 0);
    await total(page, 'Strategy', 2);
  });

  await test.step('R1: tactical action to Arnor / Lor with the carrier and a landing', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 36);
    await dragRoute(page, [95, 36]);
    await take(page, 'Carrier');
    await take(page, 'Dreadnought');
    await take(page, 'Infantry', 3);
    await take(page, 'Fighter', 1);
    await look(page, 'tact1');
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 4 of 5' })).toBeVisible();
    await page.getByRole('button', { name: 'Fly' }).click();
    const landOn = async (planet: string, n: number) => {
      const group = panel(page).getByRole('group', { name: planet });
      for (let i = 0; i < n; i += 1) await group.getByRole('button', { name: 'Land one Infantry' }).click();
    };
    await landOn('Arnor', 2);
    await landOn('Lor', 1);
    await look(page, 'tact1b');
    await done(page);
    await total(page, 'Tactic', 2);
    await shot(page, 'arnor-taken');
  });

  await test.step('R1: the home system, production over the limit', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 95);
    await total(page, 'Tactic', 1);
    await panel(page).getByRole('button', { name: /Open the shop/ }).click();
    await shot(page, 'shop-open');
    await look(page, 'shop', '.stage-dialog');
    for (let i = 0; i < 7; i += 1) await stage(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await look(page, 'prod1');
    await expect(panel(page).getByText('Production 6, and 7 units are built: each fighter and infantry counts.')).toBeVisible();
    // BUG: the payment block of the tactical editor prices 7 fighters at 4 (no Sarween Tools discount) while the warning, the
    // replay, needs 3 (Sarween Tools: -1 on the combined cost): the block autopays 4 and the title says "Cost 4".
    await expect(panel(page).getByText('Cost 4, paid 0')).toBeVisible();
    await expect(panel(page).getByText('Not enough resources: need 3, paid 0, short by 3.')).toBeVisible();
    await expect(panel(page).getByText('System Ikatena is over capacity: 7 of 0.')).toBeVisible();
    await shot(page, 'production-over');
    await done(page);
    await total(page, 'Fleet', 3);
  });

  await test.step('R1: the agent as a component action, then a second time', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'carrina', 'Doctor Carrina');
    await look(page, 'agent');
    await shot(page, 'agent-action');
    await done(page);
    await addAction(page, 'Component action');
    await choose(page, 'carrina', 'Doctor Carrina');
    await expect(panel(page).locator('li[data-code=componentExhausted]')).toHaveCount(1);
    await done(page);
  });

  await test.step('R1: Trade as the secondary of another player', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '5 Trade' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Trade · secondary ability' })).toBeVisible();
    await total(page, 'Commodities', 3);
    await total(page, 'Strategy', 1);
    await done(page);
  });

  await test.step('R1: Sol researches with the secondary of my card: the agent shows its reminder', async () => {
    await actFor(page, 'Sol');
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'gravity drive', 'Gravity Drive');
    await look(page, 'solsecondary');
    await shot(page, 'sol-technology');
    await done(page);
    await actFor(page, 'Mine');
  });

  await test.step('R1: a pass that takes eight action cards: the hand limit', async () => {
    await addAction(page, 'Pass');
    const took = panel(page).getByRole('group', { name: 'Taken and discarded' });
    for (const [query, name] of [['mining initiative', 'Mining Initiative'], ['economic initiative', 'Economic Initiative'], ['war effort', 'War Effort'], ['industrial initiative', 'Industrial Initiative'], ['sabotage', 'Sabotage'], ['direct hit', 'Direct Hit'], ['diplomatic pressure', 'Diplomatic Pressure'], ['unexpected action', 'Unexpected Action']]) {
      await took.getByRole('button', { name: '+ Took' }).click();
      await choose(page, query, name);
    }
    await look(page, 'pass1');
    await shot(page, 'pass-hand');
    await expect(panel(page).getByText('The hand holds 8 action cards and the limit is 7: the excess is discarded at once.')).toBeVisible();
    await done(page);
  });

  await test.step('R1: the status entry: reminders of Hydrothermal Mining and Radical Advancement, tokens, a public objective', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await look(page, 'status1');
    await shot(page, 'status-reminders');
    await expect(panel(page).getByText('Hydrothermal Mining').first()).toBeVisible();
    await expect(panel(page).getByText('Radical Advancement').first()).toBeVisible();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Strategy' }).click();
    await panel(page).getByRole('button', { name: 'Add one Deepwrought' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'diversify research', 'Diversify Research');
    await look(page, 'status1b');
    await total(page, 'VP', 1);
    await total(page, 'Tactic', 2);
  });
});

test('round 2', async () => {
  await test.step('R2: a new round, the planets are ready again', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 2', exact: true })).toBeVisible();
    console.log('R2 START', JSON.stringify(await totals(page)));
    await total(page, 'Resources', 7);
    await total(page, 'Influence', 7);
    await total(page, 'Commodities', 3);
    await total(page, 'Tactic', 2);
    await total(page, 'Strategy', 2);
    await total(page, 'VP', 1);
  });

  await test.step('R2: Leadership as the main card', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '1 Leadership' }).click();
    await addAction(page, 'Strategy');
    await look(page, 'leadership');
    await shot(page, 'leadership');
    for (const [t, n] of [['Tactic', 3], ['Fleet', 3], ['Strategy', 2]] as const) {
      for (let i = 0; i < n; i += 1) await panel(page).getByRole('button', { name: `Add one ${t}` }).click();
    }
    await look(page, 'leadership2');
    await shot(page, 'leadership-over');
    await expect(panel(page).getByText('Not enough influence: need 15, paid 7, short by 8.')).toBeVisible();
    for (const t of ['Tactic', 'Fleet', 'Strategy']) await panel(page).getByRole('button', { name: `Remove one ${t}` }).click();
    await expect(panel(page).getByText('2 bought beyond the free ones, influence to pay: 6.')).toBeVisible();
    await expect(panel(page).getByText('Cost 6, paid 6')).toBeVisible();
    await done(page);
    await total(page, 'Tactic', 4);
    await total(page, 'Fleet', 5);
    await total(page, 'Strategy', 3);
    await total(page, 'Influence', 1);
    // Influence 6 is paid with Ikatena and Lor: their resources go with them (4 + 1).
    await total(page, 'Resources', 2);
  });

  await test.step('R2: Mining Initiative on Ikatena, a deal with Sol for trade goods', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('button', { name: 'Ikatena', exact: true }).click();
    await total(page, 'Trade goods', 4);
    await done(page);
  });

  await test.step('R2: the home system: the flagship and a mech, a deal in the same turn', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 95);
    await total(page, 'Tactic', 3);
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sol' }).click();
    const give = panel(page).getByRole('group', { name: 'Give' });
    const get = panel(page).getByRole('group', { name: 'Get' });
    for (let i = 0; i < 3; i += 1) await give.getByRole('button', { name: 'Add one Commodities' }).click();
    for (let i = 0; i < 3; i += 1) await get.getByRole('button', { name: 'Add one Trade goods' }).click();
    await look(page, 'deal-sol');
    await shot(page, 'deal-sol');
    await panel(page).getByRole('button', { name: 'Back', exact: true }).click();
    await total(page, 'Trade goods', 7);
    await total(page, 'Commodities', 0);
    await panel(page).getByRole('button', { name: /Open the shop/ }).click();
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Mech', exact: true }).click();
    await look(page, 'shop2', '.stage-dialog');
    await shot(page, 'shop-flagship');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    console.log('UNITS95', JSON.stringify(await tile(page, 95).locator('[data-unit]').evaluateAll(all => all.map(u => [u.getAttribute('data-unit'), u.getAttribute('aria-label'), u.textContent]))));
    await look(page, 'prod2');
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    await look(page, 'manualpay');
    await shot(page, 'manual-pay');
    const plus = panel(page).getByRole('button', { name: 'Add one trade good' });
    console.log('TGPLUS enabled', await plus.isEnabled());
    await plus.click({ force: true });
    // BUG: the 3 trade goods of the deal made earlier in the same action cannot pay for its production: the editor caps the stepper at the 4 held
    // before the entry ("5/4"), the replay says "Not enough trade goods: need 5, have 4", while the summary shows 7 after the deal.
    await expect(panel(page).getByText('Not enough trade goods: need 5, have 4.')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove one trade good' }).click();
    await expect(panel(page).getByText('Not enough resources: need 9, paid 6, short by 3.')).toBeVisible();
    await done(page);
    await total(page, 'Trade goods', 3);
    await total(page, 'Commodities', 0);
    await total(page, 'Fleet', 5);
  });

  await test.step('R2: tactical action through the wormhole neighbour: Arnor / Lor to Quann', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 25);
    await dragRoute(page, [36, 25]);
    await take(page, 'Carrier');
    await take(page, 'Dreadnought');
    const arnor = panel(page).getByRole('group', { name: 'Arnor' });
    await arnor.getByRole('button', { name: 'Take one Infantry' }).click();
    await arnor.getByRole('button', { name: 'Take one Infantry' }).click();
    await look(page, 'quann');
    await page.getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('group', { name: 'Quann' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Quann' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await look(page, 'quann2');
    await shot(page, 'quann');
    await done(page);
    await total(page, 'Tactic', 2);
  });

  await test.step('R2: Technology as a secondary: Antimass Deflectors, resources short', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'antimass', 'Antimass Deflectors');
    await look(page, 'techsec');
    await shot(page, 'tech-secondary');
    await expect(panel(page).getByText('Not enough resources: need 4, paid 3, short by 1.')).toBeVisible();
    await done(page);
    await total(page, 'Strategy', 2);
  });

  await test.step('R2: Industrial Initiative as a component action: one trade good for each industrial planet', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'industrial initiative', 'Industrial Initiative');
    await look(page, 'indinit');
    await total(page, 'Trade goods', 2);
    await done(page);
  });

  await test.step('R2: the second action of the agent in a new round of the same plan is readied only in the status phase', async () => {
    await addAction(page, 'Pass');
    const dropped = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await dropped.getByRole('button', { name: '+ Discarded' }).click();
    await choose(page, 'sabotage', 'Sabotage');
    await dropped.getByRole('button', { name: '+ Discarded' }).click();
    await choose(page, 'direct hit', 'Direct Hit');
    await look(page, 'pass2');
    await done(page);
  });

  await test.step('R2: the status entry: two objectives scored, tokens', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Deepwrought' }).click();
    await panel(page).getByRole('button', { name: 'Add one Deepwrought' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'develop weaponry', 'Develop Weaponry');
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'spark a rebellion', 'Spark a Rebellion');
    await look(page, 'status2');
    await shot(page, 'status2');
    await total(page, 'VP', 3);
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Strategy' }).click();
    await total(page, 'Tactic', 3);
  });
});

test('round 3', async () => {
  await test.step('R3: a new round; the numbers carried over', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 3', exact: true })).toBeVisible();
    console.log('R3 START', JSON.stringify(await totals(page)));
    await total(page, 'Resources', 9);
    await total(page, 'Influence', 8);
    await total(page, 'Trade goods', 2);
    await total(page, 'Commodities', 0);
    await total(page, 'Tactic', 3);
    await total(page, 'Strategy', 3);
    await total(page, 'VP', 3);
  });

  await test.step('R3: the commander and the hero are unlocked in the drawer', async () => {
    await openFaction(page);
    await drawer(page).getByTestId('component-leader:deepwroughtcommander').locator('.segment > button').nth(1).click();
    await drawer(page).getByTestId('component-leader:deepwroughthero').locator('.segment > button').nth(1).click();
    await shot(page, 'leaders-unlocked');
    await look(page, 'leaders', '[role=dialog][aria-label=Components]');
    await closeDrawerAny(page);
  });

  await test.step('R3: Technology as the main card: Plasma Scoring free, Hybrid Crystal Fighter II paid with planets', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'plasma scoring', 'Plasma Scoring');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'hybrid crystal', 'Hybrid Crystal Fighter II');
    await expect(panel(page).locator('li[data-code=prerequisitesMissing]')).toHaveCount(0);
    await look(page, 'tech3');
    await shot(page, 'tech3');
    await done(page);
  });

  await test.step('R3: the hero purges a technology of Sol', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'ta zern', 'Ta Zern');
    await shot(page, 'hero');
    // BUG: the technology choice lists every technology key of the packs: another faction's technologies (Planesplitter of the Obsidian,
    // Neuroglaive of the Naalu, which are not in the deck of the Deepwrought player) and the raw key "technology:iihq", which is no technology of the catalog.
    await expect(panel(page).getByRole('button', { name: 'technology:iihq', exact: true })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Gravity Drive', exact: true }).click();
    await look(page, 'hero2');
    await done(page);
    await openGroup(page, /^Technologies/);
    await drawer(page).getByRole('button', { name: 'Sol', exact: true }).click();
    await look(page, 'solhold', '[role=dialog][aria-label=Components]');
    await expect(drawer(page).getByRole('group', { name: 'Researched technologies' })).not.toContainText('Gravity Drive');
    await drawer(page).getByRole('button', { name: 'Mine', exact: true }).click();
    await expect(drawer(page)).toContainText('Hybrid Crystal Fighter');
    await closeDrawerAny(page);
    await openFaction(page);
    await look(page, 'heropurged', '[role=dialog][aria-label=Components]');
    await closeDrawerAny(page);
  });

  await test.step('R3: the flagship through my system to Quann; Share Knowledge given to Hacan; the breakthrough taken', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 25);
    await dragRoute(page, [95, 36, 25]);
    await take(page, 'Flagship');
    await look(page, 'flag');
    await shot(page, 'flagship-route');
    await page.getByRole('button', { name: 'Fly' }).click();
    await look(page, 'flag2');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Hacan' }).click();
    await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: '+ Component' }).click();
    await picker(page).getByRole('button', { name: 'Choose Share Knowledge' }).first().click();
    await look(page, 'deal-hacan');
    await shot(page, 'deal-share-knowledge');
    await panel(page).getByRole('button', { name: 'Back', exact: true }).click();
    await look(page, 'flag3');
    await done(page);
  });

  await test.step('R3: the breakthrough in the faction group', async () => {
    await openFaction(page);
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('visionaria');
    await drawer(page).getByRole('button', { name: 'Add Visionaria Select' }).click();
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await expect(drawer(page).getByTestId('component-breakthrough:deepwroughtbt')).toBeVisible();
    await look(page, 'bt', '[role=dialog][aria-label=Components]');
    await shot(page, 'breakthrough');
    await closeDrawerAny(page);
  });

  await test.step('R3: Visionaria Select as a component action, a second time', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'visionaria', 'Visionaria Select');
    await look(page, 'btaction');
    await shot(page, 'breakthrough-action');
    await expect(panel(page).getByText('Visionaria Select', { exact: false }).first()).toBeVisible();
    await done(page);
    await addAction(page, 'Component action');
    await choose(page, 'visionaria', 'Visionaria Select');
    await expect(panel(page).locator('li[data-code=componentExhausted]')).toHaveCount(1);
    await done(page);
  });

  await test.step('R3: Hacan plays Share Knowledge: the technology on the card', async () => {
    await actFor(page, 'Hacan');
    await addAction(page, 'Component action');
    await choose(page, 'share knowledge', 'Share Knowledge');
    await look(page, 'sk');
    await shot(page, 'share-knowledge');
    await panel(page).getByRole('button', { name: 'Plasma Scoring', exact: true }).click();
    await done(page);
    await actFor(page, 'Mine');
    await openGroup(page, /^Technologies/);
    await drawer(page).getByRole('button', { name: 'Hacan', exact: true }).click();
    await expect(drawer(page).getByRole('group', { name: 'Researched technologies' })).toContainText('Plasma Scoring');
    await drawer(page).getByRole('button', { name: 'Mine', exact: true }).click();
    await closeDrawerAny(page);
  });

  await test.step('R3: from Quann to Wellon and on to Mecatol Rex, the third and the fourth token', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 19);
    await dragRoute(page, [25, 19]);
    await take(page, 'Carrier');
    await take(page, 'Dreadnought');
    const quann = panel(page).getByRole('group', { name: 'Quann' });
    await quann.getByRole('button', { name: 'Take one Infantry' }).click();
    await quann.getByRole('button', { name: 'Take one Infantry' }).click();
    await page.getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('group', { name: 'Wellon' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Wellon' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await done(page);
    await total(page, 'Tactic', 1);
  });

  await test.step('R3: Mecatol Rex taken with the last tokens: the custodians, one token over the pool', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 112);
    await dragRoute(page, [19, 112]);
    await take(page, 'Carrier');
    await take(page, 'Dreadnought');
    const wellon = panel(page).getByRole('group', { name: 'Wellon' });
    await wellon.getByRole('button', { name: 'Take one Infantry' }).click();
    await wellon.getByRole('button', { name: 'Take one Infantry' }).click();
    await page.getByRole('button', { name: 'Fly' }).click();
    const land = panel(page).getByRole('group', { name: 'Landing on Mecatol Rex' }).getByRole('button', { name: 'Land one Infantry' });
    await land.click();
    await land.click();
    await look(page, 'mecatol');
    await shot(page, 'mecatol');
    await done(page);
    await total(page, 'Tactic', 0);
    await addAction(page, 'Tactical action');
    await tapTile(page, 36);
    await look(page, 'overtoken');
    await shot(page, 'tokens-over');
    await expect(panel(page).getByText('Tactic: not enough tokens, the pool goes below zero (-1).')).toBeVisible();
    await done(page);
  });

  await test.step('R3: a relic from the drawer, played, with the agent in Used', async () => {
    await openGroup(page, /^Relics/);
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('dynamis core');
    await drawer(page).getByRole('button', { name: 'Add Dynamis Core' }).click();
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await closeDrawerAny(page);
    await shot(page, 'relic-added');
    await addAction(page, 'Component action');
    await choose(page, 'dynamis core', 'Dynamis Core');
        await panel(page).getByRole('button', { name: '+ Used' }).click();
        await choose(page, 'carrina', 'Doctor Carrina');
    await look(page, 'relic');
    await shot(page, 'relic-used');
    await done(page);
  });

  await test.step('R3: the home system again: dreadnoughts over the supply, a second flagship, the fleet pool', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 95);
    await panel(page).getByRole('button', { name: /Open the shop/ }).click();
    for (let i = 0; i < 6; i += 1) await stage(page).getByRole('button', { name: 'Dreadnought', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Flagship', exact: true }).click();
    await shot(page, 'shop-over');
    await look(page, 'shopover', '.stage-dialog');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await look(page, 'prod3');
    await shot(page, 'production-over-3');
    await done(page);
  });

  await test.step('R3: a pass', async () => {
    await addAction(page, 'Pass');
    await done(page);
  });

  await test.step('R3: the status entry: Radical Advancement swaps Neural Motivator for Instinct Training, an objective, tokens', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const gains = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await gains.getByRole('button', { name: '+ Discarded' }).click();
    await choose(page, 'neural motivator', 'Neural Motivator');
    await gains.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'instinct training', 'Instinct Training');
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'expand borders', 'Expand Borders');
    await panel(page).getByRole('button', { name: 'Add one Deepwrought' }).click();
    await look(page, 'status3');
    await shot(page, 'status3');
    await total(page, 'VP', 5);
  });

  await test.step('R3: the agenda phase with Mecatol Rex held: a law', async () => {
    const agendas = page.getByRole('region', { name: 'Agenda' });
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'anti-intellectual', 'Anti-Intellectual Revolution');
    await panel(page).getByRole('button', { name: 'For', exact: true }).click();
    await done(page);
    await openGroup(page, /^Objectives & laws/);
    await expect(drawer(page).getByRole('group', { name: 'Laws' })).toContainText('Anti-Intellectual Revolution');
    await expect(drawer(page).getByRole('group', { name: 'Objectives' })).toContainText('Expand Borders');
    await shot(page, 'laws-objectives');
    await closeDrawerAny(page);
  });

  await test.step('after the status phase Share Knowledge is back with me and Hacan has lost Plasma Scoring', async () => {
    await openGroup(page, /^Technologies/);
    await drawer(page).getByRole('button', { name: 'Hacan', exact: true }).click();
    await look(page, 'hacanafter', '[role=dialog][aria-label=Components]');
    // BUG: the note was played by Hacan, and the status phase did not end it: the replay runs the onStatusEnd moment for my components only, so Hacan keeps
    // Plasma Scoring after the status phase and the note does not go back to the Deepwrought player (text of the card: "Return that technology ... at the end of the status phase").
    await expect(drawer(page).getByRole('group', { name: 'Researched technologies' })).toContainText('Plasma Scoring');
    await drawer(page).getByRole('button', { name: 'Mine', exact: true }).click();
    await closeDrawerAny(page);
    await openGroup(page, /^Cards/);
    await look(page, 'sknote', '[role=dialog][aria-label=Components]');
    await expect(drawer(page).getByTestId('component-promissory:shareknowledge@me')).toBeVisible();
    await closeDrawerAny(page);
  });

  await test.step('the plan as a whole: Now and Forecast', async () => {
    let mine = 0;
    for (const n of [1, 2, 3]) {
      await page.getByRole('button', { name: `Round ${n}`, exact: true }).click();
      mine += await panel(page).locator('.entry:not(.entry-rival)').count();
    }
    console.log('ENTRIES', mine, 'all', await panel(page).locator('.entry').count());
    await shot(page, 'round3-end');
    await page.getByRole('button', { name: 'Now', exact: true }).click();
    await shot(page, 'now-view');
    console.log('NOW', JSON.stringify(await totals(page)));
    await page.getByRole('button', { name: 'Forecast', exact: true }).click();
    console.log('FORECAST', JSON.stringify(await totals(page)));
    await look(page, 'end');
  });
  // <<NEXT>>
  // <<NEXT>>
});
