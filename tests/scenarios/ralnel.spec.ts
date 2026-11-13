import { expect, test, type Locator, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

/**
 * One long game as the Ral Nel Consortium (Thunder's Edge) through the interface only. Six players: Ral Nel, Hacan, Sol,
 * Argent, Naalu, Mentak; Prophecy of Kings and Thunder's Edge on. The map is built by hand in part, then pasted.
 */
const SEATS = ['93', '16', '1', '58', '9', '2'];
// ring 1 (6), ring 2 (12), ring 3 (18) with the homes at its corners.
const RING12 = '78 40 42 67 69 34 39 27 26 65 79 47 32 30 29 73 41 21';
const RING3 = (h: string[]) => `${h[0]} 20 62 ${h[1]} 19 64 ${h[2]} 44 36 ${h[3]} 38 61 ${h[4]} 76 24 ${h[5]} 37 50`;
const MAP = `${RING12} ${RING3(SEATS)}`;
const SHOTS = 'test-results/scenarios/ralnel';

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const summary = (page: Page, name: string) => page.getByRole('group', { name: 'Totals, now and forecast' }).getByRole('group', { name, exact: true });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });
const stage = (page: Page) => page.locator('.stage-dialog');

test.use({ actionTimeout: 10_000 });
expect.configure({ timeout: 6000 });
const errors: string[] = [];
async function dump(label: string, scope: Locator, limit = 6000) {
  const text = await scope.ariaSnapshot();
  writeFileSync(`${SHOTS}/dump-${label}.txt`, text);
  if (process.env.DUMP === label || process.env.DUMP === 'all') console.log(`--- ${label}\n${text.slice(0, limit)}`);
}
async function shot(page: Page, name: string) { await page.screenshot({ path: `${SHOTS}/${name}.png` }); }

async function total(page: Page, name: string): Promise<number> {
  const text = (await summary(page, name).innerText()).replace(/\s+/g, ' ');
  const m = text.match(/(-?\d+)\s*$/);
  return m ? Number(m[1]) : NaN;
}
async function totals(page: Page) {
  const out: Record<string, number> = {};
  for (const n of ['Resources', 'Influence', 'Trade goods', 'Commodities', 'Tactic', 'Fleet', 'Strategy', 'VP']) out[n] = await total(page, n);
  return out;
}
async function expectTotals(page: Page, want: Partial<Record<string, number>>, mode?: 'Forecast' | 'Now') {
  if (mode) {
    const toggle = page.getByRole('button', { name: mode, exact: true });
    if (await toggle.isEnabled()) await toggle.click();
  }
  await expect.poll(async () => {
    const got = await totals(page);
    return Object.fromEntries(Object.keys(want).map(k => [k, got[k]]));
  }, { message: `totals ${mode ?? ''}`, timeout: 4000 }).toEqual(want);
}

async function tapTile(page: Page, n: number): Promise<void> {
  let last = '';
  let still = 0;
  await expect.poll(async () => {
    const now = JSON.stringify(await tile(page, n).boundingBox());
    still = now === last ? still + 1 : 0;
    last = now;
    return still >= 3;
  }, { intervals: [120] }).toBe(true);
  await tile(page, n).click();
}
async function centre(page: Page, n: number) {
  let last = '';
  await expect.poll(async () => { const now = JSON.stringify(await tile(page, n).boundingBox()); const still = now === last; last = now; return still; }, { intervals: [150] }).toBe(true);
  const box = (await tile(page, n).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function dragRoute(page: Page, hexes: number[]): Promise<void> {
  const points = [];
  for (const n of hexes) points.push(await centre(page, n));
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.mouse.up();
}
/** Tiles whose hexes touch the hex of tile n on the screen: neighbours by the picture, not by the code. */
async function neighbours(page: Page, n: number): Promise<number[]> {
  await page.getByRole('button', { name: 'Reset view' }).click().catch(() => undefined);
  await page.waitForTimeout(900);
  return page.evaluate(num => {
    const all = [...document.querySelectorAll('[aria-label^="Tile "]')].map(b => {
      const r = b.getBoundingClientRect();
      return { n: Number((b.getAttribute('aria-label') ?? '').replace('Tile ', '')), x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
    });
    const me = all.find(t => t.n === num)!;
    return all.filter(t => t.n !== num && Math.hypot(t.x - me.x, t.y - me.y) < me.w * 1.05).map(t => t.n);
  }, n);
}
/** Open the components stack on a group; it opens on the one it was left on, so the tab is pressed only if it is not that one. */
async function openGroup(page: Page, name: RegExp): Promise<void> {
  await page.getByRole('button', { name: /^Components/ }).click();
  await expect(drawer(page)).toBeVisible();
  if ((await groupTab(page, name).getAttribute('aria-pressed')) !== 'true') await groupTab(page, name).click();
  await expect(groupTab(page, name)).toHaveAttribute('aria-pressed', 'true');
}
async function addSource(page: Page) {
  await panel(page).getByRole('button', { name: 'Add source' }).click();
  await page.waitForTimeout(1000);
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
async function done(page: Page) { await panel(page).getByRole('button', { name: 'Done', exact: true }).click(); }

let stepPage: Page | undefined;
async function step(title: string, body: () => Promise<void>) {
  const t = Date.now();
  console.log('>>', title);
  await test.step(title, body);
  try { console.log('   totals', JSON.stringify(await totals(stepPage!))); } catch { /* not on the plan screen */ }
  console.log('   ok', ((Date.now() - t) / 1000).toFixed(1) + 's');
}

test.beforeEach(({ page }) => {
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
});
test.afterEach(() => { expect(errors, 'console errors').toEqual([]); });

test('Ral Nel Consortium: a long game through the interface', async ({ page, browser, context }) => {
  let link = '';
  stepPage = page;
  await step('create the game on the first screen, build the map by hand in part', async () => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => { if (localStorage.getItem('ti4.lang') === null) localStorage.setItem('ti4.lang', 'en'); });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'My faction', exact: true }).click();
    await page.getByRole('button', { name: 'The Ral Nel Consortium' }).click();
    const rivals = [[2, 'The Emirates of Hacan'], [3, 'The Federation of Sol'], [4, 'The Argent Flight'], [5, 'The Naalu Collective'], [6, 'The Mentak Coalition']] as const;
    for (const [i, f] of rivals) {
      await page.getByRole('group', { name: `Player ${i}` }).getByRole('button', { name: 'Opponent', exact: true }).click();
      await page.getByRole('button', { name: f }).click();
    }
    await shot(page, '01-game-screen');
    // by hand: three slots of ring 1, one by one
    for (const [slot, n] of [['0,-1', '78'], ['1,-1', '40'], ['1,0', '42']] as const) {
      await page.locator(`[data-slot="${slot}"]`).click();
      await page.getByLabel('Tile number').fill(n);
      await page.getByRole('button', { name: 'Place' }).click();
    }
    await expect(page.getByText('Empty slots: 27.')).toBeVisible();
    await dump('minimap-hand', page.getByRole('group', { name: 'Minimap' }), 3000);
    await page.getByRole('radio', { name: 'Large Galaxy' }).click();
    await dump('minimap-large', page.getByRole('group', { name: 'Minimap' }), 3000);
    await shot(page, '02-large-galaxy');
    await page.getByRole('radio', { name: 'Standard' }).click();
    await dump('minimap-back', page.getByRole('group', { name: 'Minimap' }), 3000);
    await shot(page, '03-standard-again');
  });

  await step('paste the Milty string over the hand-built part, name the game, copy the link', async () => {
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    // The map already has hand-built tiles: the game asks before it replaces them.
    await expect(page.getByText('The map already has tiles. Replace them?')).toBeVisible();
    await page.getByRole('button', { name: 'Replace map' }).click();
    await expect(page.getByText('30 tiles placed.')).toBeVisible();
    await expect(page.getByText('Home systems placed: 6.')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText(/The map is built/)).toBeVisible();
    await expect(page.getByRole('group', { name: 'Minimap' }).getByRole('button', { name: 'Slot with tile 67' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Game name' }).fill('RalNelGame');
    await page.getByRole('button', { name: 'Copy link' }).click();
    link = await page.evaluate(() => navigator.clipboard.readText());
    console.log('LINK', link);
    expect(link).toContain('name=RalNelGame');
    expect(link).toMatch(/exp=pok,te|exp=pok%2Cte/);
  });

  await step('the link opens in a fresh browser context and recreates the game', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, serviceWorkers: 'block' });
    const p2 = await ctx.newPage();
    await p2.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
    p2.on('pageerror', e => errors.push(`pageerror(link): ${e.message}`));
    await p2.goto(link);
    await expect(p2.getByRole('textbox', { name: 'Game name' })).toHaveValue('RalNelGame');
    await dump('link-game-screen', p2.getByRole('main'), 4000);
    await p2.screenshot({ path: `${SHOTS}/04-link-fresh.png` });
    await p2.getByRole('button', { name: 'Plan & map' }).click();
    for (const n of [93, 16, 1, 58, 9, 2, 112, 67, 50]) await expect(tile(p2, n)).toBeVisible();
    await ctx.close();
  });

  await step('start the game', async () => {
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 93)).toBeVisible();
    await dump('start-plan', page.locator('body'), 12000);
    await shot(page, '05-start');
  });
  await step('the components drawer: faction group, a starting technology of the choice of four', async () => {
    await page.getByRole('button', { name: /^Components/ }).click();
    await expect(drawer(page)).toBeVisible();
    await groupTab(page, /^Faction/).click();
    await dump('faction', drawer(page), 30000);
    await shot(page, '06-faction');
    // Players drawer shows the whole faction sheet: abilities, mech, technologies, ships.
    await groupTab(page, /^Technologies/).click();
    await dump('tech0', drawer(page), 8000);
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('plasma scoring');
    const results = drawer(page).getByRole('group', { name: 'Search results' });
    await results.getByRole('button', { name: 'Add Plasma Scoring' }).click();
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await expect(drawer(page).getByRole('group', { name: 'Researched technologies' })).toContainText('Plasma Scoring');
    await dump('tech1', drawer(page), 8000);
    await groupTab(page, /^Technologies/).click();
    await expect(drawer(page)).toHaveCount(0);
  });

  await step('round 1: Technology main; research Nanomachines (warfare 1 from Plasma Scoring)', async () => {
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await expect(page.getByText('Main: 7 Technology')).toBeVisible();
    await addAction(page, 'Strategy');
    await expect(panel(page).getByRole('group', { name: 'Technology · primary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'nanomachines', 'Nanomachines');
    await dump('tech-nano', panel(page), 9000);
    await shot(page, '07-research-nano');
    // The second one costs 6: Linkship II needs warfare 2 (Plasma Scoring, and Nanomachines just researched).
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'linkship', 'Linkship II');
    await dump('tech-link', panel(page), 9000);
    await shot(page, '08-research-link');
    // Rules 3.x: the second technology of the primary costs 6 resources; 3 available -> short by 3, shown in the Payment block.
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 3');
    await expect(panel(page).getByText('Not enough resources: need 6, paid 3, short by 3.')).toBeVisible();
    await expect(panel(page).getByText(/prerequisites of Linkship II/)).toHaveCount(0);
    // Not affordable now: Linkship II waits for the secondary of the next round.
    await panel(page).getByRole('button', { name: 'Remove Linkship II' }).click();
    await expect(panel(page).getByText(/short by/)).toHaveCount(0);
    await done(page);
    await expectTotals(page, { Resources: 3, Influence: 4, Strategy: 2, Tactic: 3 }, 'Forecast');
  });

  await step('component action: Nanomachines puts a PDS on Mez Lo Orz Fei Zsha', async () => {
    await addAction(page, 'Component action');
    await expect(picker(page)).toBeVisible();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('nanomachines');
    await dump('pick-nano', picker(page), 5000);
    await picker(page).getByRole('button', { name: 'Choose Nanomachines' }).click();
    await dump('nano-action', panel(page), 9000);
    await shot(page, '09-nano-action');
    await panel(page).getByRole('group', { name: 'Planet for the PDS' }).getByRole('button', { name: 'Mez Lo Orz Fei Zsha' }).click();
    await dump('nano-action2', panel(page), 9000);
    await done(page);
    await expect(tile(page, 93).getByRole('img', { name: 'PDS' })).toBeVisible();
    await dump('t93-pds', tile(page, 93));
  });

  await step('a second Nanomachines action in the same round warns: the card is exhausted', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'nanomachines', 'Nanomachines');
    await dump('nano-twice', panel(page), 9000);
    await shot(page, '10-nano-twice');
    await expect(panel(page).getByRole('list', { name: 'Warnings' }).first()).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await step('tactical 1: carrier, 4 infantry and the PDS (Miniaturization) from home to Vefut II', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 20);
    await expect(page.getByText('Active system: Vefut II')).toBeVisible();
    await expect(panel(page).getByText('Tactic tokens: 3 → 2')).toBeVisible();
    await tapTile(page, 93);
    await tapTile(page, 20);
    await expect(page.getByText('Flight Mez Lo Orz Fei Zsha / Rep Lo Orz Qet → Vefut II')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 4; i++) await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await dump('t1-source', panel(page), 12000);
    await shot(page, '11-t1-source');
    await panel(page).getByRole('button', { name: 'Take one PDS' }).click();
    // Miniaturization: a structure on board takes no capacity: the cargo stays 4 of 4, the 85.3 warning is waived.
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 4 of 4' })).toBeVisible();
    await dump('t1-pds', panel(page), 12000);
    await shot(page, '12-t1-pds');
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t1-after-fly', panel(page), 12000);
    await shot(page, '13-t1-after-fly');
    const land = panel(page).getByRole('button', { name: 'Land one Infantry' });
    for (let i = 0; i < 4; i++) await land.click();
    await panel(page).getByRole('button', { name: 'Land one PDS' }).click();
    await dump('t1-landed', panel(page), 12000);
    await expect(panel(page).getByRole('button', { name: 'Give back PDS' })).toBeVisible();
    await done(page);
    await dump('t20', tile(page, 20));
    await dump('t93-after', tile(page, 93));
    await expect(tile(page, 20).getByRole('img', { name: 'Infantry ×4' })).toBeVisible();
    await expect(tile(page, 20).getByRole('img', { name: 'PDS ×1' })).toBeVisible();
    await expect(tile(page, 93).getByRole('img', { name: 'PDS ×1' })).toHaveCount(0);
    // A conquered planet comes in exhausted: its 2 resources are not in the forecast of this round yet.
    await expectTotals(page, { Tactic: 2, Resources: 3 }, 'Forecast');
    await shot(page, '14-after-t1');
  });

  await step('setup: a Mentak fleet stands on the wormhole 39', async () => {
    await tapTile(page, 39);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Mentak' }).click();
    for (const u of ['Cruiser', 'Cruiser', 'Fighter']) await stage(page).getByRole('button', { name: u, exact: true }).click();
    await shot(page, '15-setup-39');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  await step('tactical 2: Dreadnought and the Linkship fly to 39 and fight; the Linkship is lost', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 39);
    await expect(page.getByText('Active system: Wormhole α (39)')).toBeVisible();
    await tapTile(page, 93);
    await tapTile(page, 39);
    await panel(page).getByRole('button', { name: 'Take one Dreadnought' }).click();
    await panel(page).getByRole('button', { name: 'Take one Destroyer' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t2-fly', panel(page), 12000);
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await dump('t2-battle', stage(page), 9000);
    await shot(page, '16-t2-battle');
    await stage(page).getByRole('button', { name: 'Destroyer ×1', exact: true }).click();
    await stage(page).getByRole('button', { name: /^Cruiser ×2 \(The Mentak/ }).click();
    await stage(page).getByRole('button', { name: /^Cruiser ×1 \(The Mentak/ }).click();
    await dump('t2-battle2', stage(page), 9000);
    await shot(page, '17-t2-battle-lost');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t2-after-battle', panel(page), 12000);
    await done(page);
    await dump('t39', tile(page, 39));
    await expect(tile(page, 39).getByRole('img', { name: /Dreadnought/ })).toBeVisible();
    await expect(tile(page, 39).getByRole('img', { name: /Destroyer/ })).toHaveCount(0);
    await expectTotals(page, { Tactic: 1 }, 'Forecast');
  });

  await step('tactical 3: the home system, a purchase at the dock', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 93);
    await expect(page.getByText(/Active system: Mez Lo Orz Fei Zsha/)).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = stage(page);
    await shop.getByRole('button', { name: 'Cruiser', exact: true }).click();
    for (let i = 0; i < 2; i++) await shop.getByRole('button', { name: 'Fighter', exact: true }).click();
    await dump('shop1', shop, 9000);
    await shot(page, '18-shop1');
    await shop.getByRole('button', { name: 'Close' }).click();
    await dump('t3', panel(page), 12000);
    // 3 resources buy a cruiser and two fighters; the dock holds 3 fighters in its system and 4 stand there (2 left from the start).
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 3, paid 3');
    await expect(panel(page).getByText('System Mez Lo Orz Fei Zsha / Rep Lo Orz Qet is over capacity: 1 of 0.')).toBeVisible();
    await done(page);
    await expectTotals(page, { Resources: 0, Tactic: 0, Fleet: 3 }, 'Forecast');
    await shot(page, '19-after-t3');
  });

  await step('component action: Kan Kip Rel draws 2 action cards, one goes to Hacan', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'kan kip', 'Kan Kip Rel');
    await dump('agent1', panel(page), 9000);
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    for (const [q, n] of [['sabotage', 'Sabotage'], ['direct hit', 'Direct Hit']] as const) {
      await common.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await common.getByRole('button', { name: '+ Transaction' }).click();
    await dump('agent2', panel(page), 12000);
    await shot(page, '20-agent');
    // Kan Kip Rel: "give 1 of those cards to another player" - any player; the plan holds it as a transaction, which asks a neighbour.
    await panel(page).getByRole('group', { name: 'Give' }).getByRole('button', { name: '+ Component' }).click();
    await dump('agent-give-pick', picker(page), 5000);
    // LIMIT: a card drawn in this very entry is not offered to give: only what was held before the entry (here the notes).
    await expect(picker(page).getByRole('button', { name: 'Choose Direct Hit' })).toHaveCount(0);
    await picker(page).getByRole('button', { name: 'Close' }).click();
    await panel(page).getByRole('button', { name: 'Remove: transaction' }).click();
    // The card handed to another player never reaches my hand (Kan Kip Rel note 1): only the one kept is entered.
    await panel(page).getByRole('button', { name: 'Remove Direct Hit' }).click();
    await done(page);
    // A second use of the exhausted agent warns.
    await addAction(page, 'Component action');
    await choose(page, 'kan kip', 'Kan Kip Rel');
    await dump('agent-twice', panel(page), 5000);
    await expect(panel(page).getByRole('list', { name: 'Warnings' }).first()).toContainText(/exhausted/i);
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await step('pass, then the status phase of round 1', async () => {
    await addAction(page, 'Pass');
    await dump('pass', panel(page), 9000);
    await done(page);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await dump('status1', panel(page), 12000);
    await shot(page, '21-status1');
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    await expect(tokens).toContainText('Distribute tokens: 2 left');
    for (let i = 0; i < 2; i++) await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await expect(tokens).toContainText('Distribute tokens: 0 left');
    await panel(page).getByRole('button', { name: 'Add one Ral Nel' }).click();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' }).last();
    await taken.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'rally', 'Rally');
    await dump('status1b', panel(page), 9000);
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    await expectTotals(page, { Tactic: 2, Fleet: 3, Strategy: 2, VP: 1, Resources: 5, Influence: 6 }, 'Forecast');
  });

  await step('round 2 begins; Trade main', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await expectTotals(page, { Resources: 5, Influence: 6, Tactic: 2, Fleet: 3, Strategy: 2, VP: 1 }, 'Now');
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { Resources: 5, Influence: 6, 'Trade goods': 0, Commodities: 0, Tactic: 2, Fleet: 3, Strategy: 2, VP: 1 }, 'Forecast');
    const trade = page.getByRole('button', { name: '5 Trade' });
    await trade.click(); await trade.click(); await trade.click();
    await expect(page.getByText('Main: 5 Trade')).toBeVisible();
    await shot(page, '22-round2');
    await addAction(page, 'Strategy');
    await dump('trade-primary', panel(page), 9000);
    await shot(page, '23-trade-primary');
    await panel(page).getByRole('group', { name: 'Who uses the secondary for free' }).getByRole('button', { name: 'Hacan' }).click();
    // Rules 99 (Trade): +3 trade goods, commodities replenish to the faction value of 4.
    await expectTotals(page, { 'Trade goods': 3, Commodities: 4, Strategy: 2 });
    await done(page);
    await expectTotals(page, { 'Trade goods': 3, Commodities: 4, Strategy: 2 }, 'Forecast');
  });

  await step('Technology secondary of the card of another player: Linkship II for 4 resources and a token', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Technology · secondary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'linkship', 'Linkship II');
    await dump('tech2', panel(page), 9000);
    await shot(page, '24-linkship-secondary');
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    const pay = panel(page).getByRole('group', { name: 'Payment' });
    await dump('pay-manual', pay, 5000);
    await expect(pay).toContainText('Cost 4, paid 4');
    await expectTotals(page, { Resources: 1, 'Trade goods': 3, Strategy: 1 });
    await done(page);
    await expectTotals(page, { Resources: 1, 'Trade goods': 3, Strategy: 1, Commodities: 4 }, 'Forecast');
    await shot(page, '25-after-linkship');
  });

  await step('tactical 4: the cruiser flies 93 - 50 - 37 beside the Mentak home; a deal with Mentak', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 37);
    await expect(page.getByText('Active system: Arinam / Meer')).toBeVisible();
    await tapTile(page, 93);
    await tapTile(page, 50);
    await tapTile(page, 37);
    await expect(panel(page).getByRole('heading', { name: /^Flight/ })).toBeVisible();
    await dump('t4-route', panel(page), 9000);
    await panel(page).getByRole('button', { name: 'Take one Cruiser' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    await common.getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Mentak' }).click();
    // the neighbour check: the cruiser stands in 37, next to the Mentak home 2
    await expect(panel(page).getByText(/only with a neighbour/)).toHaveCount(0);
    const give = panel(page).getByRole('group', { name: 'Give' });
    await give.getByRole('group', { name: 'Commodities' }).getByRole('button', { name: 'Add one Commodities' }).click();
    await give.getByRole('group', { name: 'Commodities' }).getByRole('button', { name: 'Add one Commodities' }).click();
    await give.getByRole('button', { name: '+ Component' }).click();
    await picker(page).getByRole('button', { name: 'Choose Nano-Link Permit' }).click();
    const get = panel(page).getByRole('group', { name: 'Get' });
    await get.getByRole('group', { name: 'Trade goods' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    await get.getByRole('group', { name: 'Trade goods' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    await dump('deal', panel(page), 9000);
    await shot(page, '26-deal');
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page);
    // the commodities given become trade goods of Mentak; mine: 4 - 2 = 2 commodities, 3 + 2 = 5 trade goods
    await expectTotals(page, { Commodities: 2, 'Trade goods': 5, Tactic: 1, Resources: 1 }, 'Forecast');
    await dump('t37', tile(page, 37));
  });

  await step('what Mentak holds after the deal: the Nano-Link Permit, with its text', async () => {
    await page.getByRole('button', { name: /^Components/ }).click();
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Mentak' }).click();
    await groupTab(page, /^Cards/).click();
    await dump('mentak-cards', drawer(page), 12000);
    await shot(page, '27-mentak-cards');
    await groupTab(page, /^Cards/).click();
    await expect(drawer(page)).toHaveCount(0);
  });

  await step('Mentak plays the Nano-Link Permit: its dock moves onto Arinam beside its home', async () => {
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mentak' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 37);
    await tapTile(page, 2);
    await tapTile(page, 37);
    await dump('mentak-route', panel(page), 9000);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    // no dock stands at the Mentak home: every faction starts with a space dock on its home planet (Setup rules)
    await expect(panel(page).getByRole('button', { name: 'Take one Space dock' })).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Back' }).click().catch(() => undefined);
    await dump('mentak-edit', panel(page), 9000);
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
    await tapTile(page, 2);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Mentak' }).click();
    await dump('stage-setup-mentak-home', stage(page), 9000);
    await shot(page, '28-setup-mentak-home');
    // BUG: a rival home starts without its space dock (placeStartUnits puts units only), so the board warns of a start that is legal.
    await expect(stage(page).getByRole('list', { name: 'Warnings' })).toContainText('System Moll Primus is over capacity: 7 of 4.');
    await stage(page).getByRole('button', { name: 'Space dock', exact: true }).click();
    await dump('stage-setup-mentak-dock', stage(page), 9000);
    await expect(stage(page).getByText('System Moll Primus is over capacity')).toHaveCount(0);
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  await step('Mentak: a tactical action on Arinam with the Nano-Link Permit moves its space dock', async () => {
    await expect(page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mentak' })).toHaveAttribute('aria-pressed', 'true');
    await addAction(page, 'Tactical action');
    await tapTile(page, 37);
    await tapTile(page, 2);
    await tapTile(page, 37);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    await panel(page).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Take one Space dock' }).click();
    await dump('mentak-dock-taken', panel(page), 12000);
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Arinam' }).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('group', { name: 'Landing on Arinam' }).getByRole('button', { name: 'Land one Space dock' }).click();
    await dump('mentak-dock-landed', panel(page), 12000);
    await shot(page, '29-mentak-dock-landed');
    await panel(page).getByRole('group', { name: 'In this turn' }).getByRole('button', { name: '+ Used' }).click();
    await dump('mentak-used-pick', picker(page), 6000);
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('nano-link');
    await picker(page).getByRole('button', { name: 'Choose Nano-Link Permit' }).click();
    await dump('mentak-dock-used', panel(page), 12000);
    await shot(page, '30-mentak-nanolink');
    await expect(panel(page).getByText('Allowed by: Nano-Link Permit (Mentak)')).toBeVisible();
    // BUG(hint): Survival Instinct ("After another player activates a system that contains your ships") is reminded of only in MY activations; here Mentak activates 37 where my cruiser stands and it is absent.
    await expect(panel(page).getByRole('button', { name: /^Survival Instinct/ })).toHaveCount(0);
    await done(page);
    await page.getByRole('group', { name: 'Whose action' }).getByRole('button', { name: 'Mine' }).click();
  });

  await step('the played Nano-Link Permit went back to the Ral Nel player (LRR 69.3)', async () => {
    await page.getByRole('button', { name: /^Components/ }).click();
    // the stack opens on the group it was left on
    await expect(groupTab(page, /^Cards/)).toHaveAttribute('aria-pressed', 'true');
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Mine' }).click();
    await dump('my-cards', drawer(page), 12000);
    await expect(drawer(page).getByRole('group', { name: 'My promissory notes' })).toContainText('Nano-Link Permit');
    await expect(drawer(page).getByRole('group', { name: 'My promissory notes' }).getByRole('button', { name: /^Nano-Link Permit/ })).toContainText('in hand');
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Mentak' }).click();
    await expect(drawer(page).getByRole('group', { name: 'Notes of other players' })).not.toContainText('Nano-Link');
    await drawer(page).getByRole('group', { name: 'Whose components' }).getByRole('button', { name: 'Mine' }).click();
    await groupTab(page, /^Cards/).click();
    await expect(drawer(page)).toHaveCount(0);
  });

  await step('tactical 5: production at home: a Linkship II, the Alarum mech and a carrier, paid with a planet and trade goods', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 93);
    await expect(page.getByText(/Active system: Mez Lo Orz Fei Zsha/)).toBeVisible();
    await expect(panel(page).getByText('Tactic tokens: 1 → 0')).toBeVisible();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = stage(page);
    await dump('shop2', shop, 9000);
    await shop.getByRole('button', { name: 'Destroyer', exact: true }).click();
    await shop.getByRole('button', { name: 'Mech, Mez Lo Orz Fei Zsha', exact: true }).click();
    await shop.getByRole('button', { name: 'Carrier', exact: true }).click();
    await shot(page, '32-shop2');
    await shop.getByRole('button', { name: 'Close' }).click();
    await dump('t5', panel(page), 12000);
    // a Linkship II (1) + the Alarum (2) + a carrier (3) = 6: Rep Lo Orz Qet 1 and 5 trade goods; 3 units are within the limit 4 (Mez 2 + 2)
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Trade goods 5');
    await expect(panel(page).getByText(/no space dock/)).toHaveCount(0);
    await expect(panel(page).getByText(/production limit|Production limit/i)).toHaveCount(0);
    await done(page);
    await expectTotals(page, { Resources: 0, 'Trade goods': 0, Tactic: 0, Commodities: 2 }, 'Forecast');
    await dump('t93-r2', tile(page, 93));
    await shot(page, '33-after-t5');
  });

  await step('component action: Nanomachines the third way, discard an action card and draw one (readied in the status phase)', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'nanomachines', 'Nanomachines');
    await expect(panel(page).getByText(/is exhausted/)).toHaveCount(0);
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    await common.getByRole('button', { name: '+ Discarded' }).click();
    await dump('discard-pick', picker(page), 5000);
    await picker(page).getByRole('button', { name: 'Choose Rally' }).click();
    await common.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'direct hit', 'Direct Hit');
    await dump('nano3', panel(page), 9000);
    await shot(page, '34-nano3');
    await done(page);
    // BUG: the discarded Rally (a cost of Nanomachines, not a play) still applies its play effect: +2 fleet tokens (3 -> 5).
    await expectTotals(page, { Fleet: 5 }, 'Forecast');
  });

  await step('pass; the commander unlocks by hand; the status phase of round 2 with an objective', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await page.getByRole('button', { name: /^Components/ }).click();
    await groupTab(page, /^Faction/).click();
    await drawer(page).getByRole('group', { name: 'Watchful Ojz: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await expect(drawer(page).getByRole('group', { name: 'Watchful Ojz: state' }).getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await dump('faction-r2', drawer(page), 9000);
    await shot(page, '35-commander-unlocked');
    await groupTab(page, /^Faction/).click();
    await expect(drawer(page)).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    await dump('status2', panel(page), 20000);
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    for (let i = 0; i < 2; i++) await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await expect(tokens).toContainText('Distribute tokens: 0 left');
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await dump('score-pick', picker(page), 9000);
    await shot(page, '36-score-pick');
    await picker(page).getByRole('button', { name: 'Choose Develop Weaponry' }).click();
    await panel(page).getByRole('button', { name: 'Add one Ral Nel' }).click();
    await dump('status2b', panel(page), 20000);
    await shot(page, '37-status2-scored');
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    await expectTotals(page, { VP: 2, Tactic: 2, Fleet: 5, Strategy: 1 }, 'Forecast');
  });

  await step('round 3 begins; the agent draws a card and a deal with Mentak brings a trade good', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { Resources: 5, Influence: 6, 'Trade goods': 0, Commodities: 2, Tactic: 2, Fleet: 5, Strategy: 1, VP: 2 }, 'Forecast');
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await expect(page.getByText('Main: 7 Technology')).toBeVisible();
    await shot(page, '38-round3');
    // Kan Kip Rel was exhausted in round 1 and readied in its status phase: no warning now
    await addAction(page, 'Component action');
    await choose(page, 'kan kip', 'Kan Kip Rel');
    await expect(panel(page).getByText(/is exhausted/)).toHaveCount(0);
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    await common.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'mining initiative', 'Mining Initiative');
    await common.getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Mentak' }).click();
    await panel(page).getByRole('group', { name: 'Give' }).getByRole('group', { name: 'Commodities' }).getByRole('button', { name: 'Add one Commodities' }).click();
    await panel(page).getByRole('group', { name: 'Get' }).getByRole('group', { name: 'Trade goods' }).getByRole('button', { name: 'Add one Trade goods' }).click();
    await panel(page).getByRole('button', { name: 'Back' }).click();
    await done(page);
    await expectTotals(page, { 'Trade goods': 1, Commodities: 1 }, 'Forecast');
  });

  await step('Technology main: Gravity Drive free and Sarween Tools for 6 (5 resources and the trade good)', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'gravity drive', 'Gravity Drive');
    await panel(page).getByRole('button', { name: /Research a technology|Another technology|Add a technology/ }).first().click();
    await choose(page, 'sarween', 'Sarween Tools');
    await dump('tech3', panel(page), 12000);
    await shot(page, '39-tech3');
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    await expect(panel(page).getByText(/short by/)).toHaveCount(0);
    await done(page);
    await expectTotals(page, { Resources: 0, Influence: 0, 'Trade goods': 0, Strategy: 1, Tactic: 2 }, 'Forecast');
  });

  await step('a secondary of the own Technology card is warned of', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByText('This strategy card is yours: only the other players resolve its secondary ability.')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await step('tactical 6: the carrier with 4 infantry from Vefut II to Mecatol Rex, Gravity Drive lends the missing move', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 112);
    await expect(page.getByText('Active system: Mecatol Rex')).toBeVisible();
    await tapTile(page, 20);
    await tapTile(page, 27);
    await tapTile(page, 78);
    await tapTile(page, 112);
    await dump('t6-route', panel(page), 9000);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 4; i++) await panel(page).getByRole('group', { name: 'Vefut II' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await dump('t6-taken', panel(page), 9000);
    await shot(page, '41-t6-taken');
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t6-flown', panel(page), 12000);
    await expect(panel(page).getByText('Carrier from Vefut II has speed 1, and the route takes 3 steps.')).toBeVisible();
    // Gravity Drive lends +1 to one ship short by exactly 1 (58.3.6): the carrier (speed 1) is short by 2 over 3 steps, so it stays warned.
    await panel(page).getByRole('group', { name: 'In this turn' }).getByRole('button', { name: '+ Used' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('gravity drive');
    await picker(page).getByRole('button', { name: 'Choose Gravity Drive' }).click();
    await expect(panel(page).getByText('Carrier from Vefut II has speed 1, and the route takes 3 steps.')).toBeVisible();
    await expect(panel(page).getByText(/Allowed by: Gravity Drive/)).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await step('setup: an infantry waits on 78; tactical 6: the Dreadnought flies 39 - 78 - Mecatol with Gravity Drive and carries it', async () => {
    await tapTile(page, 78);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 112);
    await tapTile(page, 39);
    await tapTile(page, 78);
    await tapTile(page, 112);
    await panel(page).getByRole('button', { name: 'Take one Dreadnought' }).click();
    await dump('t6b-taken', panel(page), 9000);
    await panel(page).getByRole('group', { name: /^Empty|78/ }).getByRole('button', { name: 'Take one Infantry' }).first().click();
    await dump('t6b-taken2', panel(page), 9000);
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 1 of 1' })).toBeVisible();
    await expect(panel(page).getByText(/Allowed by: Gravity Drive/)).toBeVisible();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t6b-landed', panel(page), 12000);
    await shot(page, '42-t6-landed');
    await done(page);
    await dump('t112', tile(page, 112));
    await expectTotals(page, { Tactic: 1 }, 'Forecast');
  });

  await step('tactical 7: the carrier with 4 infantry takes both planets of New Albion / Starpoint', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 27);
    await expect(panel(page).getByText('Tactic tokens: 1 → 0')).toBeVisible();
    await tapTile(page, 20);
    await tapTile(page, 27);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).click();
    for (let i = 0; i < 4; i++) await panel(page).getByRole('group', { name: 'Vefut II' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t7-flown', panel(page), 9000);
    const nova = panel(page).getByRole('group', { name: 'Landing on New Albion' });
    const star = panel(page).getByRole('group', { name: 'Landing on Starpoint' });
    for (let i = 0; i < 2; i++) await nova.getByRole('button', { name: 'Land one Infantry' }).click();
    for (let i = 0; i < 2; i++) await star.getByRole('button', { name: 'Land one Infantry' }).click();
    await dump('t7-landed', panel(page), 12000);
    await shot(page, '43-t7-landed');
    await done(page);
    await expectTotals(page, { Tactic: 0 }, 'Forecast');
    await dump('t27', tile(page, 27));
  });

  await step('the hero Director Nel is unlocked by hand, then played in the pass: 2 command tokens, then more turns after the pass', async () => {
    await openGroup(page, /^Faction/);
    await drawer(page).getByRole('group', { name: 'Director Nel: state' }).getByRole('button', { name: 'Unlocked' }).click();
    await expect(drawer(page).getByRole('group', { name: 'Director Nel: state' }).getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await groupTab(page, /^Faction/).click();
    await expect(drawer(page)).toHaveCount(0);
    await addAction(page, 'Pass');
    await panel(page).getByRole('group', { name: 'In this turn' }).getByRole('button', { name: '+ Used' }).click();
    await dump('hero-pick', picker(page), 6000);
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('director nel');
    await picker(page).getByRole('button', { name: /^Choose Director Nel/ }).click();
    await panel(page).getByRole('group', { name: 'In this turn' }).getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'upgrade', 'Upgrade');
    await dump('hero-pass', panel(page), 9000);
    await shot(page, '44-hero-pass');
    await done(page);
    await expectTotals(page, { Tactic: 2 }, 'Forecast');
  });

  await step('setup: Mentak fighters on the gravity rift 41; tactical 8 after the pass: a Linkship II attacks, the hero allows the turn', async () => {
    await tapTile(page, 41);
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('group', { name: 'Whose units' }).getByRole('button', { name: 'Mentak' }).click();
    for (const u of ['Fighter', 'Fighter', 'Cruiser']) await stage(page).getByRole('button', { name: u, exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await addAction(page, 'Tactical action');
    await tapTile(page, 41);
    await tapTile(page, 93);
    // 39 holds a Mentak fighter and stops the route: it goes round by 50 and Thibah
    await tapTile(page, 50);
    await tapTile(page, 21);
    await tapTile(page, 41);
    await dump('t8-route', panel(page), 9000);
    await panel(page).getByRole('button', { name: 'Take one Destroyer' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t8-flown', panel(page), 12000);
    await shot(page, '45-t8-flown');
    await expect(panel(page).getByText(/runs into/)).toHaveCount(0);
    await expect(panel(page).getByText(/You have already passed this round: by the rules no more actions follow.*Allowed by: Director Nel/)).toBeVisible();
    await expect(panel(page).getByRole('button', { name: /^Watchful Ojz Commander/ })).toBeVisible();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await stage(page).getByRole('button', { name: /^Fighter ×2 \(The Mentak/ }).click();
    await stage(page).getByRole('button', { name: /^Fighter ×1 \(The Mentak/ }).click();
    await dump('t8-battle', stage(page), 9000);
    await shot(page, '46-t8-battle');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await done(page);
    await expectTotals(page, { Tactic: 1, Fleet: 5 }, 'Forecast');
  });

  await step('the second pass: the purged hero is not played twice', async () => {
    await addAction(page, 'Pass');
    await panel(page).getByRole('group', { name: 'In this turn' }).getByRole('button', { name: '+ Used' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('director nel');
    await picker(page).getByRole('button', { name: /^Choose Director Nel/ }).click();
    await dump('hero-again', panel(page), 9000);
    await shot(page, '47-hero-again');
    // BUG(usability): the hero is purged by its first play, but the Pass editor shows no warning for playing it again.
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toHaveCount(0);
    await done(page);
    // the entry row in the list does say it
    const lastPass = page.getByRole('region', { name: 'Actions' }).getByRole('listitem', { name: 'Pass' }).last();
    await expect(lastPass).toContainText('Director Nel: you do not hold this component at this point.');
    await lastPass.getByRole('button', { name: 'Edit: Pass' }).click();
    await panel(page).getByRole('button', { name: 'Remove Director Nel' }).click();
    await done(page);
    await expect(lastPass).not.toContainText('you do not hold');
    await expectTotals(page, { Tactic: 1 }, 'Forecast');
    await openGroup(page, /^Faction/);
    await expect(drawer(page).getByRole('group', { name: 'Director Nel: state' }).getByRole('button', { name: 'Purged' })).toHaveAttribute('aria-pressed', 'true');
    await dump('faction-r3', drawer(page), 9000);
    await groupTab(page, /^Faction/).click();
  });

  await step('status phase of round 3: two objectives, tokens, a card', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    await expect(tokens).toContainText('Distribute tokens: 2 left');
    for (let i = 0; i < 2; i++) await tokens.getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('expand borders');
    await picker(page).getByRole('button', { name: 'Choose Expand Borders' }).click();
    await panel(page).getByRole('button', { name: /Score an objective|Another/ }).first().click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('become the gatekeeper');
    await dump('secret-pick', picker(page), 4000);
    await picker(page).getByRole('button', { name: 'Choose Become the Gatekeeper' }).click();
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Add one Ral Nel' }).click();
    await dump('status3', panel(page), 30000);
    await shot(page, '48-status3');
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
  });

  await step('agenda phase: Mecatol Rex is held, a law passes', async () => {
    await panel(page).getByRole('button', { name: '+ Agenda' }).click();
    await dump('agenda1', panel(page), 9000);
    await shot(page, '49-agenda1');
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('minister of commerce');
    await dump('agenda-pick', picker(page), 3000);
    await picker(page).getByRole('button', { name: /^Choose Minister of Commerce/ }).click();
    await dump('agenda2', panel(page), 9000);
    await shot(page, '50-agenda2');
    await panel(page).getByRole('button', { name: 'Elect The Ral Nel Consortium' }).click();
    await dump('agenda3', panel(page), 5000);
    await done(page);
    await openGroup(page, /^Objectives/);
    await dump('laws', drawer(page), 9000);
    await shot(page, '51-laws');
    await expect(drawer(page)).toContainText('Minister of Commerce');
    await groupTab(page, /^Objectives/).click();
  });

  await step('round 4 begins; Trade main with the law Minister of Commerce: +1 trade good for the neighbour Mentak', async () => {
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    await page.getByRole('button', { name: 'Add round' }).click();
    await expectTotals(page, { Resources: 10, Influence: 14, Tactic: 3, Fleet: 5, Strategy: 1, VP: 5, 'Trade goods': 0, Commodities: 1 }, 'Forecast');
    const trade = page.getByRole('button', { name: '5 Trade' });
    await trade.click(); await trade.click(); await trade.click();
    await addAction(page, 'Strategy');
    await dump('trade4', panel(page), 9000);
    await panel(page).getByRole('group', { name: 'Who uses the secondary for free' }).getByRole('button', { name: 'Hacan' }).click();
    await expectTotals(page, { Commodities: 4 });
    console.log('TRADE4', JSON.stringify(await totals(page)));
    await shot(page, '52-trade4');
    await done(page);
  });

  await step('tactical 9: production at home, the flagship Last Dispatch, the Alarum mech and two fighters', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 93);
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = stage(page);
    await shop.getByRole('button', { name: 'Flagship', exact: true }).click();
    await shop.getByRole('button', { name: 'Mech, Mez Lo Orz Fei Zsha', exact: true }).click();
    for (let i = 0; i < 2; i++) await shop.getByRole('button', { name: 'Fighter', exact: true }).click();
    await dump('shop4', shop, 9000);
    await shot(page, '53-shop4');
    await shop.getByRole('button', { name: 'Close' }).click();
    await dump('t9', panel(page), 12000);
    // 8 (Last Dispatch) + 2 (Alarum) + 1 (two fighters) = 11; 10 resources of planets and 1 trade good; four units are within the limit 4
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 11, paid 11');
    await expect(panel(page).getByRole('list', { name: 'Warnings' })).toHaveCount(0);
    await done(page);
    await expectTotals(page, { Resources: 0, Influence: 0, 'Trade goods': 3, Commodities: 4, Tactic: 2 }, 'Forecast');
    await dump('t93-r4', tile(page, 93));
    await shot(page, '54-after-t9');
  });

  await step('the breakthrough Data Skimmer and a relic are added in the components drawer', async () => {
    await openGroup(page, /^Faction/);
    await dump('bt-before', drawer(page).getByRole('group', { name: 'Breakthrough' }), 3000);
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('data skimmer');
    await dump('bt-search', drawer(page), 5000);
    await shot(page, '55-breakthrough-search');
    await drawer(page).getByRole('button', { name: 'Add Data Skimmer' }).click();
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await dump('bt-after', drawer(page), 9000);
    await expect(drawer(page).getByRole('group', { name: 'Breakthrough' })).toContainText('Data Skimmer');
    await groupTab(page, /^Faction/).click();
    await openGroup(page, /^Relics/);
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('dominus orb');
    await drawer(page).getByRole('button', { name: 'Add Dominus Orb' }).click();
    await drawer(page).getByRole('button', { name: 'Clear the search' }).click();
    await dump('relics', drawer(page), 9000);
    await shot(page, '56-relic');
    await groupTab(page, /^Relics/).click();
    await expect(drawer(page)).toHaveCount(0);
  });

  await step('component action: the action card Mining Initiative on Starpoint', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await dump('mining', panel(page), 9000);
    await panel(page).getByRole('group', { name: 'Planet' }).getByRole('button', { name: 'Starpoint', exact: true }).click();
    await dump('mining2', panel(page), 9000);
    console.log('MINING', JSON.stringify(await totals(page)));
    await done(page);
  });

  await step('the pass of round 4: Data Skimmer reminds where it is due', async () => {
    await addAction(page, 'Pass');
    await dump('pass4', panel(page), 9000);
    await shot(page, '57-pass4');
    await dump('body4', page.locator('body'), 60000);
    // BUG(hint): Data Skimmer is a reminder for the step 'round' and no screen asks for that step: the pass shows nothing of it.
    await expect(page.getByText('Data Skimmer')).toHaveCount(0);
    await done(page);
  });

  await step('tactical 10: a Linkship II (move 4) flies four steps from the rift to Vefut II without a speed warning', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 20);
    await tapTile(page, 41);
    await tapTile(page, 21);
    await tapTile(page, 78);
    await tapTile(page, 27);
    await tapTile(page, 20);
    await dump('t10-route', panel(page), 9000);
    await panel(page).getByRole('button', { name: 'Take one Destroyer' }).click();
    await panel(page).getByRole('button', { name: 'Fly' }).click();
    await dump('t10-flown', panel(page), 12000);
    await shot(page, '58-t10');
    await expect(panel(page).getByText(/has speed/)).toHaveCount(0);
    await done(page);
  });

  await step('status phase of round 4, then a reload keeps the whole game', async () => {
    await panel(page).getByRole('button', { name: 'Tokens and points' }).click();
    const tokens = panel(page).getByRole('group', { name: 'Token distribution' });
    for (let i = 0; i < 2; i++) await tokens.getByRole('button', { name: 'Add one Fleet' }).click();
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' }).last();
    await taken.getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'sabotage', 'Sabotage');
    await dump('status4', panel(page), 30000);
    await panel(page).getByRole('listitem', { name: 'Tokens and points' }).getByRole('checkbox', { name: 'Done' }).check();
    for (const item of await panel(page).getByRole('checkbox', { name: 'Done' }).all()) if (!(await item.isChecked())) await item.check();
    const forecast = await (async () => { await expectTotals(page, {}, 'Forecast'); return totals(page); })();
    const now = await (async () => { await expectTotals(page, {}, 'Now'); return totals(page); })();
    console.log('FINAL forecast', JSON.stringify(forecast), 'now', JSON.stringify(now));
    expect(now).toEqual(forecast);
    const count = await page.getByRole('region', { name: 'Actions' }).locator('.entry').count();
    console.log('ENTRIES in actions', count);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Plan & map' })).toHaveAttribute('aria-current', 'page');
    await expectTotals(page, forecast, 'Forecast');
    await expect(page.getByRole('region', { name: 'Actions' }).locator('.entry')).toHaveCount(count);
    await shot(page, '59-final');
  });

  await step('round 5: Technology main gives PDS II (a unit upgrade from red and yellow) and Neural Motivator (green)', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    const tech = page.getByRole('button', { name: '7 Technology' });
    await tech.click(); await tech.click(); await tech.click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'pds ii', 'PDS II');
    await panel(page).getByRole('button', { name: /Research a technology|Another technology|Add a technology/ }).first().click();
    await choose(page, 'neural motivator', 'Neural Motivator');
    await dump('tech5', panel(page), 12000);
    await shot(page, '60-tech5');
    await expect(panel(page).getByText(/prerequisites/)).toHaveCount(0);
    await expect(panel(page).getByRole('group', { name: 'Payment' })).toContainText('Cost 6, paid 6');
    await done(page);
    await openGroup(page, /^Technologies/);
    await dump('tech-final', drawer(page), 12000);
    await shot(page, '61-tech-final');
    for (const n of ['Plasma Scoring', 'Nanomachines', 'Gravity Drive', 'Sarween Tools', 'Neural Motivator']) await expect(drawer(page).getByRole('group', { name: 'Researched technologies' })).toContainText(n);
    // the unit upgrades stand in their own group, with the numbers they change (Linkship II: combat 9 to 8, move 3 to 4)
    await expect(drawer(page).getByRole('group', { name: 'Unit upgrades' })).toContainText('from round 5');
    await expect(drawer(page).getByRole('group', { name: 'Unit upgrades' })).toContainText('Move 3 → 4');
    await groupTab(page, /^Technologies/).click();
    await expect(drawer(page)).toHaveCount(0);
  });

  await step('tactical 11 on 37: a battle with the action card Direct Hit used; the pass with Sabotage', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 37);
    await panel(page).getByRole('group', { name: 'In this turn' }).getByRole('button', { name: '+ Used' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('direct hit');
    await picker(page).getByRole('button', { name: 'Choose Direct Hit' }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await dump('t11-battle', stage(page), 9000);
    await stage(page).getByRole('button', { name: /^Carrier ×1 \(The Mentak/ }).click();
    await shot(page, '62-t11-battle');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await dump('t11', panel(page), 12000);
    await done(page);
    await addAction(page, 'Pass');
    await panel(page).getByRole('group', { name: 'In this turn' }).getByRole('button', { name: '+ Used' }).click();
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('sabotage');
    await picker(page).getByRole('button', { name: 'Choose Sabotage' }).click();
    await done(page);
    await dump('actions-r5', page.getByRole('region', { name: 'Actions' }), 30000);
    await shot(page, '63-r5');
  });

  await step('the players drawer shows the faction sheet of Ral Nel: abilities, mech, technologies and ships with the upgrades', async () => {
    await page.getByRole('button', { name: 'Players', exact: true }).click();
    await dump('players', page.locator('body'), 90000);
    await page.waitForTimeout(900);
    await shot(page, '64-players');
    await page.mouse.click(1000, 450);
    await page.waitForTimeout(1200);
    await shot(page, '65-five-rounds');
  });

  await step('the same game in Russian: no raw keys, the faction texts are translated', async () => {
    await page.evaluate(() => localStorage.setItem('ti4.lang', 'ru'));
    await page.reload();
    await expect(page.getByRole('button', { name: 'План и карта' })).toHaveAttribute('aria-current', 'page');
    await page.waitForTimeout(800);
    const text = await page.locator('body').innerText();
    const raw = text.match(/(plan|players|map|components|ships|stage|status|common|drawer|warn|rules).[A-Za-z]+(.[A-Za-z]+)*/g) ?? [];
    console.log('RAW KEYS', JSON.stringify(raw));
    expect(raw).toEqual([]);
    await shot(page, '66-russian');
    await page.getByRole('button', { name: /^Компоненты/ }).click();
    await page.waitForTimeout(600);
    await dump('ru-components', page.locator('body'), 40000);
    await shot(page, '67-russian-components');
    const body = await page.locator('body').innerText();
    // the leaders of the faction in Russian are named in English; their texts are the Russian translations
    expect(body).toMatch(/Gravity Drive/);
    expect(body).toMatch(/[А-Яа-я]{6,}/);
  });
});
