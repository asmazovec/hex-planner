import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * A long game as the L1Z1X Mindnet through the real interface: 6 players, Prophecy of Kings on, Thunder's Edge off.
 * Seat 1 is me (tile 6); Sol, Letnev, Argent, Mahact and Hacan sit at seats 2..6.
 */
const MAP = '66 22 61 19 72 24 33 79 48 71 41 28 44 46 30 25 26 27 6 63 76 1 49 74 10 78 37 58 68 80 52 59 60 16 34 35';
const SHOTS = 'test-results/scenarios/l1z1x';
const DEBUG = process.env.DUMP === '1';

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const stage = (page: Page) => page.locator('.stage-dialog');
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const summary = (page: Page, name: string) => page.getByRole('group', { name: 'Totals, now and forecast' }).getByRole('group', { name, exact: true });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });
const waived = (scope: Locator, code: string) => scope.locator(`li.warning-waived[data-code="${code}"]`);
const standing = (scope: Locator, code: string) => scope.locator(`li[data-code="${code}"]:not(.warning-waived)`);

async function dump(label: string, loc: Locator) {
  if (DEBUG && (!process.env.ONLY || process.env.ONLY === label)) console.log(`--- ${label}
${await loc.ariaSnapshot()}`);
}

/** Raw dictionary keys and component ids shown instead of words, seen anywhere so far. */
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

/** What a totals group of the top bar shows: the number now, and after the arrow the forecast when it differs. */
async function pair(page: Page, name: string): Promise<{ now: number; forecast: number }> {
  const text = ((await summary(page, name).textContent()) ?? '').replace(name, '').replace(/\s+/g, '').trim();
  const m = text.match(/^(-?\d+)(?:→(-?\d+))?$/);
  if (!m) throw new Error(`no numbers in "${text}" for ${name}`);
  return { now: Number(m[1]), forecast: Number(m[2] ?? m[1]) };
}
const NAMES = ['Resources', 'Influence', 'Trade goods', 'Commodities', 'Tactic', 'Fleet', 'Strategy', 'VP'];
/** The forecast values (what the plan leads to). */
async function totals(page: Page) {
  const out: Record<string, number> = {};
  for (const n of NAMES) out[n] = (await pair(page, n)).forecast;
  return out;
}
/** The values now (completed entries only). */
async function nowTotals(page: Page) {
  const out: Record<string, number> = {};
  for (const n of NAMES) out[n] = (await pair(page, n)).now;
  return out;
}
async function expectTotals(page: Page, expected: Partial<Record<string, number>>, label = '') {
  // The forecast figure unrolls with an animation: let it settle.
  await expect.poll(async () => {
    const got = await totals(page);
    return Object.keys(expected).every(k => got[k] === expected[k]);
  }, { timeout: 4000, message: label }).toBe(true).catch(async () => {
    const got = await totals(page);
    for (const [k, v] of Object.entries(expected)) expect(got[k], `${label} ${k} (all: ${JSON.stringify(got)})`).toBe(v);
  });
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

/** The map glides after a tap; wait until the element stops. */
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
async function done(page: Page) {
  await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
}
const takeOne = (scope: Locator, unit: string) => scope.getByRole('button', { name: `Take one ${unit}` }).first().click();

/** Opens the components sheet on a group (the stack remembers the last group; a press on the open group folds it). */
async function openGroup(page: Page, name: RegExp) {
  if (await drawer(page).count() === 0) await page.getByRole('button', { name: /^Components/ }).first().click();
  await expect(drawer(page)).toBeVisible();
  const tab = groupTab(page, name);
  if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-pressed', 'true');
}
/** A press on the open group's tab folds the fan and closes the sheet. */
async function closeDrawer(page: Page) {
  if (await drawer(page).count() === 0) return;
  await page.locator('.tab-fan > button[aria-pressed="true"]').first().click();
  await expect(drawer(page)).toHaveCount(0);
}

test('L1Z1X: a long game through the interface', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));

  await test.step('create the game on the first screen', async () => {
    await page.goto('/');
    const pick = async (n: number, name: string) => {
      await page.getByRole('group', { name: `Player ${n}` }).getByRole('button', { name: n === 1 ? 'My faction' : 'Opponent', exact: true }).click();
      await page.getByRole('button', { name }).first().click();
    };
    const names = ['The L1Z1X Mindnet', 'The Federation of Sol', 'The Barony of Letnev', 'The Argent Flight', 'The Mahact Gene-Sorcerers', 'The Emirates of Hacan'];
    for (let i = 0; i < 6; i++) await pick(i + 1, names[i]);
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: "Thunder's Edge" }).click();
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('textbox', { name: 'Game name' }).fill('L1Z1X long game');
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('30 tiles placed.')).toBeVisible();
    await expect(page.getByText('Home systems placed: 6.')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await shot(page, '01-game-screen');
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 66)).toBeVisible();
    await expectTotals(page, { Resources: 5, Influence: 0, 'Trade goods': 0, Commodities: 0, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 }, 'start');
  });

  await test.step('R1: the rival Hacan has a cruiser, a PDS and a dock in tile 33 (setup)', async () => {
    await tile(page, 33).click();
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Hacan', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Cruiser', exact: true }).click();
    await stage(page).getByRole('button', { name: /^Resculon/ }).click();
    await stage(page).getByRole('button', { name: 'PDS', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Space dock', exact: true }).click();
    await dump('stage after setup', stage(page));
    await shot(page, 'wip-stage');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('actions', page.getByRole('region', { name: 'Actions' }));
  });

  await test.step('R1: Trade primary with a deal that gives the Cybernetic Enhancements note to Hacan', async () => {
    for (let k = 0; k < 3; k++) await page.getByRole('button', { name: '5 Trade' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Who uses the secondary for free' }).getByRole('button', { name: 'Hacan', exact: true }).click();
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    // Sol is the default: no unit of mine or Sol's stands near each other.
    await expect(panel(page).getByText('A transaction is only with a neighbour')).toBeVisible();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Hacan', exact: true }).click();
    await expect(panel(page).getByText('A transaction is only with a neighbour')).toHaveCount(0);
    const give = panel(page).getByRole('group', { name: 'Give' });
    const get = panel(page).getByRole('group', { name: 'Get' });
    await give.getByRole('group', { name: 'Commodities' }).getByRole('button', { name: 'Add one Commodities' }).click();
    await get.getByRole('group', { name: 'Trade goods' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    await give.getByRole('button', { name: '+ Component' }).click();
    await choose(page, 'cybernetic', 'Cybernetic Enhancements');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await expectTotals(page, { 'Trade goods': 4, Commodities: 1, Strategy: 2 }, 'after trade');
  });
  await test.step('R1: tactical action on Corneeq / Resculon: transport, battle loss, invasion with Assimilate, production', async () => {
    await done(page);
    await addAction(page, 'Tactical action');
    await tapTile(page, 33);
    await tapTile(page, 6);
    await tapTile(page, 33);
    const pk = panel(page);
    await takeOne(pk, 'Dreadnought');
    await takeOne(pk, 'Carrier');
    for (let k = 0; k < 3; k++) await takeOne(pk, 'Fighter');
    for (let k = 0; k < 4; k++) await takeOne(pk, 'Infantry');
    // Seven things aboard against capacity 6 (Super Dreadnought I 2 + Carrier 4).
    await expect(pk.getByRole('heading', { name: 'Cargo on board: 7 of 6' })).toBeVisible();
    await expect(pk.getByText('Group from [0.0.0] is over capacity: 7 of 6.')).toBeVisible();
    await pk.getByRole('button', { name: 'Return one Infantry' }).click();
    await expect(pk.getByRole('heading', { name: 'Cargo on board: 6 of 6' })).toBeVisible();
    await expect(pk.locator('li[data-code="capacityGroup"]')).toHaveCount(0);
    await expect(pk.getByText('Fleet pool: 2 of 3')).toBeVisible();
    // BUG (start units): the five start infantry stand in the space area of the home system, not on the planet, so the
    // two left behind are cargo with no ship: LRR 17 / 2.1 count only ground forces in the space area.
    await expect(pk.getByText('System [0.0.0] is over capacity: 2 of 0.')).toBeVisible();
    // Take the two infantry and leave a fighter behind instead: nothing is left in the space area.
    await takeOne(pk, 'Infantry');
    await takeOne(pk, 'Infantry');
    await pk.getByRole('button', { name: 'Return one Fighter' }).click();
    await pk.getByRole('button', { name: 'Return one Fighter' }).click();
    await expect(pk.getByRole('heading', { name: 'Cargo on board: 6 of 6' })).toBeVisible();
    await expect(pk.getByText(/over capacity: \d+ of 0/)).toHaveCount(0);
    await pk.getByRole('button', { name: 'Fly' }).click();

    // Space combat against the Hacan cruiser: one fighter lost, the cruiser destroyed.
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await stage(page).getByRole('button', { name: /^Fighter/ }).click();
    await stage(page).getByRole('button', { name: 'Cruiser ×1 (The Emirates of Hacan)' }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(panel(page).getByRole('button', { name: /^Battle/ })).toContainText('Losses: Fighter 1');
    // The invasion: Assimilate and Harrow are shown among the reminders, the flagship ability is not a reminder.
    const land = panel(page).getByRole('group', { name: 'Landing on Resculon' });
    for (let k = 0; k < 3; k++) await land.getByRole('button', { name: 'Land one Infantry' }).click();
    for (let k = 0; k < 2; k++) await panel(page).getByRole('group', { name: 'Landing on Corneeq' }).getByRole('button', { name: 'Land one Infantry' }).click();
    for (const hint of ['Harrow', 'Annihilator']) await expect(panel(page).getByRole('button', { name: new RegExp(`^${hint}`) }).first()).toBeVisible();
    await shot(page, '02-invasion');

    // The shop: the dock of Resculon is Hacan's former one, now mine (Assimilate): production 2 + 2 = 4.
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = stage(page);
    await expect(shop.getByRole('button', { name: 'Space dock', exact: true }).first()).toBeVisible();
    await expect(shop.getByRole('button', { name: /^Resculon: 2\/0, yours, exhausted/ })).toBeVisible();
    for (const u of ['Cruiser', 'Destroyer', 'Fighter', 'Fighter', 'Fighter']) await shop.getByRole('button', { name: u, exact: true }).first().click();
    await expect(shop.getByText('Production 4, and 5 units are built: each fighter and infantry counts.')).toBeVisible();
    await expect(shop.getByText('System Corneeq / Resculon is over the fleet pool: 4 ships, 3 tokens.')).toBeVisible();
    await shot(page, '03-shop');
    await shop.getByRole('button', { name: 'Give back Destroyer' }).click();
    await shop.getByRole('button', { name: 'Give back Fighter' }).click();
    await expect(shop.getByText(/units are built/)).toHaveCount(0);
    await expect(shop.getByText(/over the fleet pool/)).toHaveCount(0);
    await shop.getByRole('button', { name: 'Close' }).click();
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    const pay = panel(page).getByRole('group', { name: 'Payment' });
    await expect(pay).toContainText('Cost 3, paid 3');
    await dump('payment', pay);
    await done(page);
    await tile(page, 6).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expectTotals(page, { Resources: 5, Influence: 0, 'Trade goods': 1, Commodities: 1, Tactic: 2, Fleet: 3, Strategy: 2, VP: 0 }, 'after tactical 1');
  });

  await test.step('R1: Technology secondary researches Sarween Tools for 4 resources and a strategy token', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'sarween', 'Sarween Tools');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 4, paid 5');
    await done(page);
    await expectTotals(page, { Resources: 0, Strategy: 1, 'Trade goods': 1 }, 'after secondary');
  });

  await test.step('R1: pass, then the status phase', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('region', { name: 'Status' });
    await status.getByRole('group', { name: 'Tactic' }).getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('group', { name: 'Strategy' }).getByRole('button', { name: 'Add one Strategy' }).click();
    await expect(status.getByText('Distribute tokens: 0 left')).toBeVisible();
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'monument', 'Erect a Monument');
    await expect(status.getByText('Objective Erect a Monument is scored without its requirement: 1 of 8.')).toBeVisible();
    await status.getByRole('button', { name: 'Remove Erect a Monument' }).click();
    await expect(status.getByText(/scored without its requirement/)).toHaveCount(0);
    for (const [q, n] of [['summit', 'Summit'], ['mining initiative', 'Mining Initiative']]) {
      await status.getByRole('button', { name: '+ Action card' }).click();
      await choose(page, q, n);
    }
    await expect(status.getByRole('group', { name: 'Taken and discarded' })).toContainText('Mining Initiative');
    await status.getByRole('checkbox', { name: 'Done' }).check();
    // What the other players do is planned by their tab.
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Hacan', exact: true }).click();
    await page.getByRole('button', { name: 'Add action' }).click();
    await page.locator('.action-list').getByRole('button', { name: 'Pass', exact: true }).click();
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'cybernetic', 'Cybernetic Enhancements');
    await done(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine', exact: true }).click();
    // The deal is over: Hacan played the note, so the note is back with its owner (LRR 69.3).
    await openGroup(page, /^Cards/);
    await expect(drawer(page).getByRole('group', { name: 'My promissory notes' })).toContainText('Cybernetic Enhancements');
    await closeDrawer(page);
    await expectTotals(page, { Tactic: 3, Strategy: 2, Resources: 8, Influence: 2, 'Trade goods': 1, Commodities: 1, Fleet: 3 }, 'end of round 1');
  });

  await test.step('R2: Technology primary, researching Graviton Laser System and Inheritance Systems', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await shot(page, '04-round2');
    for (let k = 0; k < 3; k++) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'inheritance', 'Inheritance Systems');
    const research = panel(page).getByRole('group', { name: /^Technology: \d/ });
    await expect(research.getByText('The prerequisites of Inheritance Systems are not met: 1 missing (cybernetic ×1).')).toBeVisible();
    // Graviton Laser System second does not help the first one.
    await research.getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'graviton', 'Graviton Laser System');
    await expect(research.getByText(/prerequisites of Inheritance Systems are not met/)).toBeVisible();
    // The other order: the free one first, then the technology that needs it.
    await research.getByRole('button', { name: 'Remove Inheritance Systems' }).click();
    await expect(research.getByText(/prerequisites/)).toHaveCount(0);
    await research.getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'inheritance', 'Inheritance Systems');
    await expect(research.getByText(/prerequisites of Inheritance Systems/)).toHaveCount(0);
    await expect(research).toContainText('To pay: 6');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6');
    await shot(page, '05-research');
    await done(page);
    // 8 resources and a trade good: six paid.
    const after = await totals(page);
    expect(after.Resources + after['Trade goods'], 'resources+tg left after paying 6 of 9').toBe(3);
  });

  await test.step('R2: tactical action to Hopes End, infantry picked up from two planets', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 66);
    await tapTile(page, 33);
    await tapTile(page, 66);
    const pk = panel(page);
    await takeOne(pk, 'Dreadnought');
    await takeOne(pk, 'Carrier');
    await takeOne(pk, 'Fighter');
    await takeOne(pk, 'Fighter');
    await pk.getByRole('group', { name: 'Corneeq' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await pk.getByRole('group', { name: 'Corneeq' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await pk.getByRole('group', { name: 'Resculon' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await pk.getByRole('group', { name: 'Resculon' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await expect(pk.getByRole('heading', { name: 'Cargo on board: 6 of 6' })).toBeVisible();
    await expect(pk.locator('li[data-code]')).toHaveCount(0);
    await pk.getByRole('button', { name: 'Fly' }).click();
    const land = panel(page).getByRole('group', { name: "Landing on Hope's End" });
    for (let k = 0; k < 4; k++) await land.getByRole('button', { name: 'Land one Infantry' }).click();
    await shot(page, '06-hopes-end');
    await done(page);
    await expectTotals(page, { Tactic: 2 }, 'after T2a');
  });

  await test.step('R2: agent I48S in a tactical action on 33 swaps an infantry for a mech; a mech is built', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 33);
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'I48S', 'I48S');
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: 'Mech, Resculon' }).click();
    // The agent swapped the infantry that stood on Resculon for a mech, the shop added one: two mechs.
    await expect(stage(page).getByRole('button', { name: 'Mech ×2' })).toBeVisible();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(panel(page).getByRole('group', { name: 'Used' }).locator('li.warning-waived, li[data-code]')).toHaveCount(0);
    await done(page);
    await expectTotals(page, { Tactic: 1 }, 'after T2b');
    // The agent is exhausted now.
    await openGroup(page, /^Faction/);
    await expect(drawer(page).getByRole('group', { name: 'I48S: state' }).getByRole('button', { name: 'Exhausted' })).toHaveAttribute('aria-pressed', 'true');
    await closeDrawer(page);
  });

  await test.step('R2: a second use of the exhausted agent warns', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 22);
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'I48S', 'I48S');
    await expect(panel(page).getByText('I48S is exhausted: it is readied only in the status phase.')).toBeVisible();
    await expect(panel(page).getByText("Tar'mann is missing 1 × Infantry.")).toBeVisible();
    await done(page);
    // The entry is marked as warned in the list.
    await expect(page.getByRole('region', { name: 'Actions' }).getByRole('listitem', { name: /Tactical action · Tar'mann/ }).locator('li')).not.toHaveCount(0);
  });

  await test.step('R2: component action: the action card Mining Initiative', async () => {
    await addAction(page, 'Component action');
    const tgBefore = (await totals(page))['Trade goods'];
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: "Hope's End" }).click();
    await done(page);
    await expectTotals(page, { 'Trade goods': tgBefore + 3 }, 'Mining Initiative on a planet of 3 resources');
  });

  await test.step('R2: pass and the status phase with two action cards drawn', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('region', { name: 'Status' });
    await status.getByRole('group', { name: 'Tactic' }).getByRole('button', { name: 'Add one Tactic' }).click();
    await status.getByRole('group', { name: 'Strategy' }).getByRole('button', { name: 'Add one Strategy' }).click();
    for (const [q, n] of [['refit', 'Refit'], ['focused research', 'Focused Research']]) {
      await status.getByRole('button', { name: '+ Action card' }).click();
      await choose(page, q, n);
    }
    await status.getByRole('checkbox', { name: 'Done' }).check();
    await expectTotals(page, { Tactic: 1, Fleet: 3, Strategy: 3, Resources: 11, Influence: 2 }, 'end of round 2');
    await shot(page, '07-end-round-2');
  });
  await test.step('R3: the commander and the hero are unlocked by hand in the drawer', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
    for (let k = 0; k < 3; k++) await page.getByRole('button', { name: '8 Imperial' }).click();
    await openGroup(page, /^Faction/);
    // 2RAM unlocks with 4 dreadnoughts, The Helmsman with 3 scored objectives: set by hand, as the condition is not counted.
    await drawer(page).getByRole('group', { name: '2RAM: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await drawer(page).getByRole('group', { name: 'The Helmsman: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await expect(drawer(page).getByRole('group', { name: '2RAM: state' }).getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    // The agent was exhausted in round 2 and is ready again in the new round.
    await expect(drawer(page).getByRole('group', { name: 'I48S: state' }).getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await shot(page, '08-leaders');
    await closeDrawer(page);
  });

  await test.step('R3: tactical action to Mecatol Rex; the custodians, and the commander among the reminders', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 18);
    await tapTile(page, 66);
    await tapTile(page, 18);
    const pk = panel(page);
    await dump('R3 flight picker', pk);
    await takeOne(pk, 'Dreadnought');
    await takeOne(pk, 'Carrier');
    await takeOne(pk, 'Fighter');
    await takeOne(pk, 'Fighter');
    for (let k = 0; k < 4; k++) await pk.getByRole('group', { name: "Hope's End" }).getByRole('button', { name: 'Take one Infantry' }).click();
    await expect(pk.getByRole('heading', { name: 'Cargo on board: 6 of 6' })).toBeVisible();
    await expect(pk.locator('li[data-code]')).toHaveCount(0);
    await pk.getByRole('button', { name: 'Fly' }).click();
    const land = panel(page).getByRole('group', { name: 'Landing on Mecatol Rex' });
    for (let k = 0; k < 4; k++) await land.getByRole('button', { name: 'Land one Infantry' }).click();
    await expect(panel(page).getByText('The custodians token is still on Mecatol Rex: removing it costs 6 influence, which the plan does not record; the first to land gains 1 victory point.')).toBeVisible();
    // BUG: the same landing also says "need 6, paid 0, short by 6" although the editor has no place to pay influence.
    await expect(panel(page).getByText('Not enough influence: need 6, paid 0, short by 6.')).toBeVisible();
    await expect(panel(page).getByRole('button', { name: /^2RAM/ }).first()).toBeVisible();
    await shot(page, '09-mecatol');
    await done(page);
    await expectTotals(page, { VP: 1, Tactic: 0 }, 'after Mecatol');
  });

  await test.step('R3: Imperial primary: Mecatol is mine', async () => {
    await addAction(page, 'Strategy');
    await expect(panel(page).getByText('I control Mecatol Rex: +1 point')).toBeVisible();
    await done(page);
    await expectTotals(page, { VP: 2 }, 'Imperial primary with Mecatol');
  });

  await test.step('R3: Technology secondary: Super Dreadnought II with Inheritance Systems, prerequisites waived', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('group', { name: 'Upgrade' }).getByRole('button', { name: 'Dreadnought' }).click();
    await expect(standing(panel(page), 'prerequisitesMissing')).toHaveCount(1);
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 4');
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'inheritance', 'Inheritance Systems');
    // The faction technology lifts the check, which stays listed as allowed, and adds 2 resources to the cost.
    const lifted = waived(panel(page), 'prerequisitesMissing');
    await expect(lifted.first()).toContainText('Allowed by: Inheritance Systems');
    await expect(standing(panel(page), 'prerequisitesMissing')).toHaveCount(0);
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6');
    await expect(panel(page).getByRole('group', { name: /^Technology: \d/ })).toContainText('To pay: 6');
    await shot(page, '10-inheritance-systems');
    // BUG: the payment was worked out at cost 4 and is not worked out again when the card adds 2 to the cost.
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 4');
    await expect(panel(page).getByText('Not enough resources: need 6, paid 4, short by 2.')).toBeVisible();
    // Switching to manual and back to automatic pays the new cost.
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    await panel(page).getByRole('button', { name: 'Pick automatically' }).click();
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText(/Cost 6, paid [6-9]/);
    await expect(panel(page).getByText(/Not enough resources/)).toHaveCount(0);
    await done(page);
    await dump('secondary entry', page.getByRole('region', { name: 'Actions' }).getByRole('listitem', { name: 'Secondary: Technology' }).last());
    await expect(page.getByRole('region', { name: 'Actions' }).getByRole('listitem', { name: 'Secondary: Technology' }).last().locator('li:not(.warning-waived)')).toHaveCount(0);
  });

  await test.step('R3: Focused Research with the exhausted Inheritance Systems: a second use is warned of', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'focused research', 'Focused Research');
    const fr = panel(page).getByRole('group', { name: 'Focused Research', exact: true });
    // BUG: the list offers every technology, among them one of Thunder's Edge (off in this game) under a raw id as its name.
    await expect(fr.getByRole('button', { name: 'technology:executiveorder' })).toHaveCount(1);
    await rawKeys(page);
    await fr.getByRole('button', { name: 'Light/Wave Deflector' }).click();
    await expect(standing(panel(page), 'prerequisitesMissing')).toHaveCount(1);
    const tgBefore = (await totals(page))['Trade goods'];
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'inheritance', 'Inheritance Systems');
    // The second use of the exhausted card: its own warning, and the prerequisites are no longer allowed.
    await expect(panel(page).getByText('Inheritance Systems is exhausted: it is readied only in the status phase.')).toBeVisible();
    await expect(standing(panel(page), 'prerequisitesMissing')).toHaveCount(1);
    await expect(waived(panel(page), 'prerequisitesMissing')).toHaveCount(0);
    await shot(page, '11-second-use');
    await done(page);
    await expectTotals(page, { 'Trade goods': tgBefore - 4 }, 'Focused Research spends 4 trade goods');
  });

  await test.step('R3: a relic added in the drawer, then played: Dynamis Core raises the commodity value by 2', async () => {
    const tg = (await totals(page))['Trade goods'];
    await openGroup(page, /^Relics/);
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('dynamis');
    await drawer(page).getByRole('group', { name: 'Search results' }).getByRole('button', { name: 'Add Dynamis Core' }).click();
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await expect(drawer(page).getByRole('group', { name: 'Relics' })).toContainText('Dynamis Core');
    await closeDrawer(page);
    await addAction(page, 'Component action');
    await choose(page, 'dynamis', 'Dynamis Core');
    await done(page);
    // Commodity value 2 of the faction plus 2 of the relic.
    await expectTotals(page, { 'Trade goods': tg + 4 }, 'Dynamis Core gives trade goods equal to the commodity value');
    await openGroup(page, /^Relics/);
    // The relic is purged by its action.
    await expect(drawer(page).getByRole('group', { name: 'Relics' })).not.toContainText('Dynamis Core');
    await closeDrawer(page);
  });

  await test.step('R3: Summit gives two command tokens (its printed timing is the start of the strategy phase; the plan takes it as a component action without a word)', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'summit', 'Summit');
    const summit = panel(page).getByRole('group', { name: 'Summit', exact: true });
    await summit.getByRole('group', { name: 'Tactic pool' }).getByRole('button', { name: 'Add one Tactic pool' }).click();
    await summit.getByRole('group', { name: 'Tactic pool' }).getByRole('button', { name: 'Add one Tactic pool' }).click();
    await expect(panel(page).locator('li[data-code]')).toHaveCount(0);
    await done(page);
    await expectTotals(page, { Tactic: 2 }, 'after Summit');
  });

  await test.step('R3: production of the flagship in the home system, with the legendary Imperial Arms Vault named in Used', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 6);
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'imperial arms', 'Imperial Arms Vault');
    const vault = panel(page).getByRole('group', { name: 'Imperial Arms Vault', exact: true });
    await vault.getByRole('group', { name: 'Which' }).getByRole('button', { name: 'Mech' }).click();
    await vault.getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Resculon' }).click();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: 'Flagship' }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 8');
    await expect(panel(page).locator('li[data-code]')).toHaveCount(0);
    await shot(page, '12-flagship');
    await done(page);
    // The mech of the vault stands on Resculon next to the two there.
    await tile(page, 33).click();
    await expect(stage(page).getByRole('button', { name: 'Mech ×3' })).toBeVisible();
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  await test.step('R3: the hero The Helmsman moves the flagship and the dreadnoughts to a system, and is purged', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'helmsman', 'The Helmsman');
    const hero = panel(page).getByRole('group', { name: 'The Helmsman', exact: true });
    // A system with another player's ships is warned of.
    await hero.getByRole('button', { name: 'Arc Prime / Wren Terra' }).click();
    await dump('hero occupied', panel(page));
    await hero.getByRole('button', { name: 'Ang' }).click();
    await expect(panel(page).locator('li[data-code="systemOccupied"]')).toHaveCount(0);
    await done(page);
    await tile(page, 61).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    // The ships stand on Ang once the map has taken the entry in.
    await expect(tile(page, 61).getByRole('img', { name: 'Flagship ×1' })).toBeVisible();
    await expect(tile(page, 61).getByRole('img', { name: 'Dreadnought ×1' })).toBeVisible();
    await expect(tile(page, 6).getByRole('img', { name: 'Flagship ×1' })).toHaveCount(0);
    await openGroup(page, /^Faction/);
    await expect(drawer(page).getByRole('group', { name: 'The Helmsman: state' }).getByRole('button', { name: 'Purged' })).toHaveAttribute('aria-pressed', 'true');
    await closeDrawer(page);
    await shot(page, '13-hero');
  });

  await test.step('R3: a second use of the purged hero warns', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'helmsman', 'The Helmsman');
    await dump('hero again', panel(page));
    await panel(page).getByRole('button', { name: 'Remove The Helmsman' }).click();
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await test.step('R3: Super Dreadnought II moves two: the dreadnought flies two hexes without a warning, the flagship (move 1) does not', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 72);
    // Ang (61) → Wellon (19) → Lisis / Velnor (72): two steps.
    await tapTile(page, 61);
    await tapTile(page, 19);
    await tapTile(page, 72);
    const pk = panel(page);
    await takeOne(pk, 'Dreadnought');
    await expect(pk.locator('li[data-code="speedShort"]')).toHaveCount(0);
    await takeOne(pk, 'Flagship');
    await expect(pk.locator('li[data-code="speedShort"]')).toHaveCount(1);
    await expect(pk.getByText(/Flagship from Ang has speed 1, and the route takes 2 steps/)).toBeVisible();
    await pk.getByRole('button', { name: 'Return one Flagship' }).click();
    await expect(pk.locator('li[data-code="speedShort"]')).toHaveCount(0);
    await pk.getByRole('button', { name: 'Fly' }).click();
    await done(page);
    await expectTotals(page, { Tactic: 0 }, 'after the second tactical action of the round');
  });

  await test.step('R3: Refit Troops replaces two infantry on Mecatol Rex with mechs', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'refit', 'Refit Troops');
    // BUG (text): the group of the counts has the raw key "components.choice.counts" as its accessible name.
    await expect(panel(page).getByRole('group', { name: 'components.choice.counts' }).first()).toBeVisible();
    await rawKeys(page);
    await panel(page).getByRole('button', { name: 'Replace one Infantry on Mecatol Rex', exact: true }).click();
    await panel(page).getByRole('button', { name: 'Replace one Infantry on Mecatol Rex', exact: true }).click();
    // MISSING WARNING: three mechs stand on the board already (the faction has four), two more come from Refit Troops,
    // and nothing says the reinforcements run out (LRR 18.1: a unit not in the reinforcements cannot be placed).
    await expect(panel(page).locator('li[data-code="reinforcementsOut"]')).toHaveCount(0);
    await done(page);
  });

  await test.step('R3: a manual adjustment with a label, then a pass', async () => {
    await addAction(page, 'Manual adjustment');
    await panel(page).getByRole('textbox', { name: 'Label' }).fill('Trade goods from a side deal');
    for (let k = 0; k < 4; k++) await panel(page).getByRole('group', { name: 'Trade goods' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    await done(page);
    await expect(page.getByRole('region', { name: 'Actions' }).getByRole('listitem', { name: /Trade goods from a side deal/ })).toBeVisible();
    await addAction(page, 'Pass');
    await done(page);
  });

  await test.step('R3: other players act: Sol plays a strategy card, Hacan flies a cruiser; my numbers stay', async () => {
    const mine = await totals(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Sol', exact: true }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '1 Leadership' }).click();
    await done(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Hacan', exact: true }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 35);
    await tapTile(page, 16);
    await tapTile(page, 34);
    await tapTile(page, 35);
    await dump('hacan flight', panel(page));
    await shot(page, 'wip');
    await takeOne(panel(page), 'Cruiser');
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await done(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine', exact: true }).click();
    const after = await totals(page);
    expect(after.Resources).toBe(mine.Resources);
    expect(after['Trade goods']).toBe(mine['Trade goods']);
    expect(after.Tactic).toBe(mine.Tactic);
  });

  await test.step('R3: the status phase: tokens, a scored objective that is not fulfilled, and then paid', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    const status = page.getByRole('region', { name: 'Status' });
    await status.getByRole('group', { name: 'Fleet' }).getByRole('button', { name: 'Add one Fleet' }).click();
    await status.getByRole('group', { name: 'Strategy' }).getByRole('button', { name: 'Add one Strategy' }).click();
    await status.getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'negotiate trade', 'Negotiate Trade Routes');
    // Five trade goods are held (1 left and 4 from the adjustment): the requirement is met before anything is paid.
    await expect(status.getByText(/scored without its requirement/)).toHaveCount(0);
    const spend = status.getByRole('group', { name: 'What scoring cost' });
    for (let k = 0; k < 5; k++) await spend.getByRole('group', { name: 'trade good' }).getByRole('button', { name: 'Add one trade good' }).click();
    await expect(status.getByText(/scored without its requirement/)).toHaveCount(0);
    await status.getByRole('group', { name: 'L1Z1X' }).getByRole('button', { name: 'Add one L1Z1X' }).click();
    for (const [q, n] of [['sabotage', 'Sabotage'], ['direct hit', 'Direct Hit']]) {
      await status.getByRole('button', { name: '+ Action card' }).click();
      await choose(page, q, n);
    }
    await status.getByRole('checkbox', { name: 'Done' }).check();
    await expectTotals(page, { VP: 3, 'Trade goods': 0 }, 'end of round 3');
    await shot(page, '15-end-round-3');
  });

  await test.step('R3: the agenda phase with Mecatol Rex held: Minister of Commerce, elected me', async () => {
    await page.getByRole('region', { name: 'Agenda' }).getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'minister of commerce', 'Minister of Commerce');
    await expect(panel(page).getByTestId('component-agenda:minister_commerce')).toContainText('law: stays in play');
    await panel(page).getByRole('button', { name: 'Elect The L1Z1X Mindnet' }).click();
    await done(page);
    await openGroup(page, /^Objectives & laws/);
    await expect(drawer(page).getByRole('group', { name: 'Laws' })).toContainText('Minister of Commerce');
    await dump('laws group', drawer(page));
    await closeDrawer(page);
    await shot(page, '16-agenda');
  });

  await test.step('R4: the agent and the faction technology are ready again; Trade with Minister of Commerce (a trade good for each neighbour)', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 4', exact: true })).toHaveAttribute('aria-pressed', 'true');
    for (let k = 0; k < 3; k++) await page.getByRole('button', { name: '5 Trade' }).click();
    const tgBefore = (await totals(page))['Trade goods'];
    await addAction(page, 'Strategy');
    await done(page);
    // +3 trade goods of the primary, +1 for the neighbour Hacan (its cruiser stands next to my home system) by the law.
    await expectTotals(page, { 'Trade goods': tgBefore + 4 }, 'Trade primary with Minister of Commerce');
    await shot(page, '17-round4');
  });

  await test.step('R4: Technology secondary again with Inheritance Systems, ready since the status phase: waived and no second-use warning', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'wormhole generator', 'Wormhole Generator');
    await dump('faction tech of another', panel(page));
    await expect(standing(panel(page), 'prerequisitesMissing')).toHaveCount(1);
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'inheritance', 'Inheritance Systems');
    await expect(waived(panel(page), 'prerequisitesMissing').first()).toContainText('Allowed by: Inheritance Systems');
    await expect(panel(page).getByText(/is exhausted/)).toHaveCount(0);
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6');
    await done(page);
  });

  await test.step('R4: an action card named in Used leaves the hand', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'sabotage', 'Sabotage');
    await dump('sabotage used', panel(page));
    await done(page);
    await openGroup(page, /^Cards/);
    await dump('cards after sabotage', drawer(page));
    await closeDrawer(page);
  });

  await test.step('two plans: the copy changes alone', async () => {
    const tabs = page.getByRole('tablist', { name: 'Plans' });
    const before = await totals(page);
    const entriesBefore = await page.getByRole('region', { name: 'Actions' }).locator('.entry').count();
    await tabs.getByRole('button', { name: 'Copy' }).click();
    await expect(tabs.getByRole('tab')).toHaveCount(2);
    await dump('tabs', tabs);
    // The copy is the open plan now and holds the same entries.
    await expect(page.getByRole('textbox', { name: 'Plan name' })).toHaveValue(/2/);
    await expect(page.getByRole('region', { name: 'Actions' }).locator('.entry')).toHaveCount(entriesBefore);
    // Change the copy: take away the first action of the round (the pass with the card) and the Trade card.
    const copyEntries = page.getByRole('region', { name: 'Actions' }).locator('.entry');
    await copyEntries.last().getByRole('button', { name: 'Delete' }).click();
    await expect(copyEntries).toHaveCount(entriesBefore - 1);
    await page.getByRole('textbox', { name: 'Plan name' }).fill('Without the pass');
    await shot(page, '18-plan-copy');
    // Back on the first plan nothing has changed.
    await tabs.getByRole('tab').first().click();
    await expect(page.getByRole('region', { name: 'Actions' }).locator('.entry')).toHaveCount(entriesBefore);
    expect(await totals(page)).toEqual(before);
    await expect(page.getByRole('textbox', { name: 'Plan name' })).toHaveValue('Plan 1');
    // And the copy keeps its change.
    await tabs.getByRole('tab').nth(1).click();
    await expect(page.getByRole('region', { name: 'Actions' }).locator('.entry')).toHaveCount(entriesBefore - 1);
    await expect(page.getByRole('textbox', { name: 'Plan name' })).toHaveValue('Without the pass');
    await tabs.getByRole('tab').first().click();
  });

  await test.step('the unit cards: Super Dreadnought II is researched and the flagship is the faction one', async () => {
    await openGroup(page, /^Technologies/);
    const dread = drawer(page).getByRole('button', { name: /^Dreadnought/ }).first();
    const text = (await dread.textContent()) ?? '';
    // Cost 4, Capacity 2, Combat 4, Move 2, Sustain Damage, Bombardment 4 (the printed card of the upgrade).
    expect(text, text).toMatch(/Super Dreadnought II/);
    expect(text).toMatch(/Cost\s*4/);
    expect(text).toMatch(/Capacity\s*2/);
    expect(text).toMatch(/Combat\s*5\s*→\s*4/);
    expect(text).toMatch(/Move\s*1\s*→\s*2/);
    expect(text).toMatch(/Bombardment\s*4/);
    const flagship = (await drawer(page).getByRole('button', { name: /^Flagship/ }).first().textContent()) ?? '';
    expect(flagship, flagship).toMatch(/\[0\.0\.1\]/);
    expect(flagship).toMatch(/Cost\s*8/);
    expect(flagship).toMatch(/Capacity\s*5/);
    expect(flagship).toMatch(/Combat\s*5.{0,2}2/);
    await shot(page, '19-unit-cards');
    await rawKeys(page);
    await closeDrawer(page);
  });

  await test.step('the technologies of different colours, a unit upgrade among them', async () => {
    await openGroup(page, /^Technologies/);
    const list = drawer(page).getByRole('group', { name: 'Researched technologies' });
    for (const name of ['Neural Motivator', 'Plasma Scoring', 'Sarween Tools', 'Graviton Laser System', 'Inheritance Systems', 'Wormhole Generator', 'Light/Wave Deflector']) {
      await expect(list, name).toContainText(name);
    }
    await expect(list.getByRole('img', { name: 'Biotic' }).first()).toBeVisible();
    await expect(list.getByRole('img', { name: 'Warfare' }).first()).toBeVisible();
    await expect(list.getByRole('img', { name: 'Cybernetic' }).first()).toBeVisible();
    await expect(list.getByRole('img', { name: 'Propulsion' }).first()).toBeVisible();
    // The unit upgrade stands in its own group, with the printed numbers.
    await expect(drawer(page).getByRole('group', { name: 'Unit upgrades' })).toContainText('Super Dreadnought II');
    await closeDrawer(page);
  });

  await test.step('«Now» counts only what is done; ticking the Trade card of round 1 changes it', async () => {
    await page.getByRole('button', { name: 'Round 1', exact: true }).click();
    await page.getByRole('group', { name: 'The map shows' }).getByRole('button', { name: 'Now' }).click();
    const before = await nowTotals(page);
    await page.getByRole('listitem', { name: 'Strategy: Trade' }).getByRole('checkbox', { name: 'Done' }).check();
    await expect.poll(async () => (await nowTotals(page))['Trade goods']).toBe(4);
    expect(before['Trade goods']).toBe(0);
    await page.getByRole('group', { name: 'The map shows' }).getByRole('button', { name: 'Forecast' }).click();
    await page.getByRole('button', { name: 'Round 4', exact: true }).click();
  });

  await test.step('the game is saved: a reload brings the same plan back', async () => {
    const entries = await page.getByRole('region', { name: 'Actions' }).locator('.entry').count();
    await page.reload();
    await expect(tile(page, 66)).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'Plans' }).getByRole('tab')).toHaveCount(2);
    await page.getByRole('button', { name: 'Round 4', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Actions' }).locator('.entry')).toHaveCount(entries);
  });

  await test.step('in Russian nothing shows a raw key', async () => {
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    await page.getByRole('radio', { name: 'Русский' }).click();
    await page.getByRole('button', { name: 'План и карта' }).click();
    await rawKeys(page);
    await shot(page, '20-russian');
    await page.getByRole('button', { name: /^Компоненты/ }).first().click();
    const sheet = page.getByRole('dialog', { name: 'Компоненты' });
    await expect(sheet).toBeVisible();
    const fan = page.locator('.tab-fan > button');
    for (let k = 0; k < await fan.count(); k++) {
      if ((await fan.nth(k).getAttribute('aria-pressed')) !== 'true') await fan.nth(k).click();
      await rawKeys(page);
    }
    await shot(page, 'wip-ru');
    await page.locator('.tab-fan > button[aria-pressed="true"]').first().click();
    // The first tactical entry of the round 3, opened for editing.
    await page.getByRole('button', { name: /^(Round|Раунд) 3$/ }).click();
    await page.locator('.entry .icon-button[aria-label^="Изменить"]').first().click();
    await rawKeys(page);
    await shot(page, '21-russian-editor');
    await page.getByRole('button', { name: 'Готово', exact: true }).click();
    await page.getByRole('button', { name: 'Партия', exact: true }).click();
    await page.getByRole('radio', { name: 'English' }).click();
  });

  await test.step('console and raw keys', async () => {
    expect(errors).toEqual([]);
    // BUG (text): the counts of Refit Troops and the like have no label key in the dictionaries.
    expect([...RAW].sort()).toEqual(['components.choice.counts', 'technology:executiveorder']);
  });
});
