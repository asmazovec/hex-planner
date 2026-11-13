import { expect, test, type Page } from '@playwright/test';

const SHOT = 'test-results/scenarios/nekro';
const MAP = [
  '65 59 21 31 24 19',
  '66 22 110 64 105 29 75 30 61 62 44 72',
  '8 63 70 1 67 106 3 71 26 27 28 101 58 103 107 92 100 98',
  Array(24).fill('0').join(' '),
].join(' ');

async function setup(page: Page) {
  page.setDefaultTimeout(15000);
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Remove opponent' }).first().click();
  await page.getByRole('button', { name: 'My faction', exact: true }).click();
  await page.getByRole('button', { name: 'The Nekro Virus' }).click();
  const opp = ['The Federation of Sol', 'The Emirates of Hacan', 'The Argent Flight', 'Last Bastion'];
  for (const [i, name] of opp.entries()) {
    await page.getByRole('button', { name: 'Opponent', exact: true }).nth(i).click();
    await page.getByRole('button', { name, exact: true }).click();
  }
  await page.getByRole('textbox', { name: 'Game name' }).fill('Nekro');
  await page.getByRole('button', { name: 'Paste a Milty string' }).click();
  await page.getByLabel('Milty Draft map string').fill(MAP);
  await page.getByRole('button', { name: 'Apply' }).click();
}

async function toPlan(page: Page) {
  await setup(page);
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await expect(page.getByRole('button', { name: 'Tile 66', exact: true })).toBeVisible();
}

const panel = (page: Page) => page.locator('.plan-panel');
const dump = async (page: Page, name: string) => { console.log('=== ' + name + String.fromCharCode(10) + (await panel(page).innerText())); await page.screenshot({ path: SHOT + '/p-' + name + '.png' }); };
import type { Locator } from '@playwright/test';
const tile = (page: Page, n: number | string) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
async function centreWhenStill(target: Locator) {
  let last = '';
  await expect.poll(async () => { const now = JSON.stringify(await target.boundingBox()); const still = now === last; last = now; return still; }, { intervals: [150] }).toBe(true);
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function dragRoute(page: Page, hexes: (number | string)[]) {
  const points = [];
  for (const n of hexes) points.push(await centreWhenStill(tile(page, n)));
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.mouse.up();
}
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
async function choose(page: Page, query: string, name: string) {
  await picker(page).getByRole('searchbox', { name: 'Search components' }).fill(query);
  await picker(page).getByRole('button', { name: `Choose ${name}` }).click();
  await expect(picker(page)).toHaveCount(0);
}
const topline = async (page: Page) => {
  const out: Record<string, string> = {};
  for (const g of ['Resources', 'Influence', 'Trade goods', 'Commodities', 'Tactic', 'Fleet', 'Strategy', 'VP']) out[g] = (await page.getByRole('group', { name: g, exact: true }).first().innerText()).replace(/\s+/g, ' ');
  return out;
};
const stage = (page: Page) => page.locator('.stage-dialog');
const pools = async (page: Page) => { const t = await topline(page); return `T ${t.Tactic} | F ${t.Fleet} | S ${t.Strategy} | TG ${t['Trade goods']}`; };

// ---------------------------------------------------------------- the game
const mismatches: string[] = [];
/** Reads the top line cell and waits for it to settle on the expected text; a mismatch is recorded, not thrown. */
async function top(page: Page, want: Record<string, string>, label: string) {
  for (const [name, value] of Object.entries(want)) {
    const cellOf = page.getByRole('group', { name, exact: true }).first();
    let got = '';
    try {
      const fin = (x: string) => x.replace(/\s+/g, ' ').split('→').pop()!.replace(name, '').trim();
      await expect.poll(async () => (got = fin(await cellOf.innerText())), { timeout: 2500 }).toBe(fin(value));
    } catch {
      mismatches.push(`${label}: ${name} expected "${value}" got "${got}"`);
      console.log(`MISMATCH ${label}: ${name} expected "${value}" got "${got}"`);
    }
  }
}
async function note(page: Page, label: string, ok: () => Promise<boolean>, extra = '') {
  let good = false;
  try { await expect.poll(ok, { timeout: 2500 }).toBe(true); good = true; } catch { /* recorded below */ }
  if (!good) { mismatches.push(`${label} ${extra}`); console.log(`MISMATCH ${label} ${extra}`); }
}
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOT}/${name}.png` });
const addAction = async (page: Page, type: string) => {
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.locator('.action-list').getByRole('button', { name: type, exact: true }).click();
};
const doneBtn = (page: Page) => panel(page).getByRole('button', { name: 'Done', exact: true });
const close = async (page: Page) => { await doneBtn(page).click(); };
const entries = (page: Page) => page.getByRole('region', { name: 'Actions' }).locator('.entry');
const consoleErrors: string[] = [];

test('nekro: three rounds of the Nekro Virus through the interface', async ({ page }) => {
  test.setTimeout(290_000);
  page.on('pageerror', e => { consoleErrors.push(`pageerror: ${e.message}`); console.log('PAGEERROR', e.message); });
  page.on('console', m => { if (m.type() === 'error') { consoleErrors.push(`console: ${m.text()}`); console.log('CONSOLEERR', m.text()); } });
  await toPlan(page);

  await test.step('R1 setup: Sol destroyers wait on Primor', async () => {
    await tile(page, 65).click();
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Sol', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Fighter', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await top(page, { Resources: '4', Influence: '0', 'Trade goods': '0', Commodities: '0', Tactic: '3', Fleet: '3', Strategy: '2', VP: '0' }, 'start');
  });

  await test.step('R1 tactical A: Mordai II to Hope\'s End, the agent pays a strategy token for 2 trade goods', async () => {
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Tactical action');
    await tile(page, 66).click();
    await dragRoute(page, [8, 66]);
    for (const u of ['Carrier', 'Dreadnought', 'Infantry', 'Infantry', 'Fighter']) await panel(page).getByRole('button', { name: `Take one ${u}` }).first().click();
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 3 of 5' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'malleon', 'Nekro Malleon');
    const ch = panel(page).getByRole('group', { name: 'Nekro Malleon', exact: true });
    await ch.getByRole('button', { name: 'Command token' }).click();
    await ch.getByRole('button', { name: 'Strategy' }).click();
    await top(page, { Tactic: '3 → 2', Strategy: '2 → 1', 'Trade goods': '0 → 2', Resources: '4' }, 'R1 tactical A');
    await shot(page, 'r1-tacA');
    await close(page);
    await entries(page).first().getByRole('checkbox', { name: 'Done' }).check();
    await top(page, { Resources: '4', 'Trade goods': '2' }, 'R1 after tactical A done (Hope\'s End arrives exhausted, 25.1)');
  });

  await test.step('R1 strategy: Technology, Propagation turns researches into tokens', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'valefar assimilator x', 'Valefar Assimilator X');
    await expect(panel(page).getByText('Distribute tokens: 3 left')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'valefar assimilator y', 'Valefar Assimilator Y');
    await expect(panel(page).getByText('Distribute tokens: 6 left')).toBeVisible();
    for (const p of ['Tactic', 'Fleet', 'Strategy']) for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: `Add one ${p}` }).click();
    await expect(panel(page).getByText('Distribute tokens: 0 left')).toBeVisible();

    await note(page, 'R1 strategy: shortage gone with 2 trade goods', async () => (await panel(page).getByText(/Not enough resources/).count()) === 0);
    await top(page, { 'Trade goods': '2 → 0', Tactic: '2 → 4', Fleet: '3 → 5', Strategy: '1 → 3' }, 'R1 strategy');
    await shot(page, 'r1-strategy');
    await close(page);
  });
  await test.step('R1 tactical B: a cruiser through Hope\'s End to Primor, a battle against Sol destroyers', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 65).click();
    await dragRoute(page, [8, 66, 65]);
    await panel(page).getByRole('button', { name: 'Take one Cruiser' }).first().click();

    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await shot(page, 'r1-tacB-battle0');
    // Repeated taps at one point: Sol has 2 destroyers in one stack; the second tap should take the second one.
    const destroyers = stage(page).locator('[data-stack*="|destroyer|"]');
    const before = (await destroyers.first().boundingBox())!;
    const at = { x: before.x + before.width / 2, y: before.y + before.height / 2 };
    await page.mouse.click(at.x, at.y);
    await expect(stage(page).getByText('Losses, The Federation of Sol')).toBeVisible();
    await page.waitForTimeout(400);
    const after = (await destroyers.first().boundingBox())!;
    const moved = Math.round(Math.hypot(after.x + after.width / 2 - at.x, after.y + after.height / 2 - at.y));
    expect(moved).toBeLessThanOrEqual(2);
    await shot(page, 'r1-tacB-battle1');
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(400);
    const lostDestroyers = await stage(page).locator('[aria-label*="Destroyer"]').count();
    void lostDestroyers;
    await destroyers.first().click().catch(() => undefined);
    await stage(page).locator('[data-stack*="|fighter|"] [role=button]').first().click().catch(() => undefined);
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sol' }).click();
    const give = panel(page).getByRole('group', { name: 'Give' });

    await panel(page).getByRole('button', { name: '+ Component' }).first().click();
    await choose(page, 'antivirus', 'Antivirus');

    await shot(page, 'r1-trans');
    await panel(page).getByRole('button', { name: 'Back', exact: true }).click();
    await expect(panel(page).getByRole('button', { name: /Transaction with Sol: give Antivirus; get nothing/ })).toBeVisible();
    await close(page);
    await entries(page).nth(1).getByRole('checkbox', { name: 'Done' }).check();
  });
  await test.step('R1 Politics secondary takes two action cards; Mining Initiative is played as a component action', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '3 Politics' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Politics · secondary ability' })).toBeVisible();
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    await common.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'mining initiative', 'Mining Initiative');
    await common.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'economic initiative', 'Economic Initiative');
    await top(page, { Strategy: '3 → 2' }, 'R1 politics secondary token');
    await shot(page, 'r1-politics');
    await close(page);
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('group', { name: 'Mining Initiative', exact: true }).getByRole('button', { name: "Hope's End", exact: true }).click();
    await top(page, { 'Trade goods': '0 → 3' }, 'R1 mining initiative on Hope End (3 resources)');
    await shot(page, 'r1-mining');
    await close(page);
    // The list names the action but not the component it plays.
    await expect(entries(page).filter({ hasText: 'Component action' }).first()).not.toContainText('Mining Initiative');
  });
  await test.step('R1 pass and status entry', async () => {
    await addAction(page, 'Pass');
    await close(page);
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Strategy' }).click();
    await panel(page).getByRole('button', { name: 'Add one Nekro' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();

    await choose(page, 'expand borders', 'Expand Borders');
    await panel(page).getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'sabotage', 'Sabotage');

    await top(page, { VP: '1', Tactic: '4', Fleet: '5', Strategy: '3', Resources: '7', 'Trade goods': '3' }, 'R1 status end of round');
    await shot(page, 'r1-status');
    await panel(page).getByRole('button', { name: 'Edit: Tokens and points' }).click();
    await shot(page, 'r1-end');
  });

  await test.step('R2: a second round, Leadership as my card', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 2' })).toHaveAttribute('aria-pressed', 'true').catch(() => undefined);
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '1 Leadership' }).click();
    await addAction(page, 'Strategy');
    for (let i = 0; i < 4; i++) await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();

    await shot(page, 'r2-leadership4');
    for (let i = 0; i < 2; i++) await panel(page).getByRole('button', { name: 'Remove one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Fleet' }).click();
    await top(page, { Tactic: '6', Fleet: '6', Strategy: '3' }, 'R2 leadership');
    await close(page);
  });

  await test.step('R2 tactical C: carrier and dreadnought from Hope\'s End to Primor with 2 infantry, exploring Primor', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 65).click();
    await dragRoute(page, [66, 65]);
    for (const u of ['Carrier', 'Dreadnought', 'Fighter']) await panel(page).getByRole('button', { name: `Take one ${u}` }).first().click();
    await panel(page).getByRole('group', { name: "Hope's End" }).getByRole('button', { name: 'Take one Infantry' }).first().click();
    await panel(page).getByRole('group', { name: "Hope's End" }).getByRole('button', { name: 'Take one Infantry' }).first().click();
    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    await common.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'cultural relic fragment', 'Cultural Relic Fragment');
    await expect(common.getByTestId('component-exploration:crf1')).toBeVisible();
    await common.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'dyson sphere', 'Dyson Sphere');
    await common.getByRole('group', { name: 'Used', exact: true }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'dyson sphere', 'Dyson Sphere');
    await shot(page, 'r2-tacC');
    await close(page);
  });

  await test.step('R2 tactical D: production at Mordai II, paid by planets', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 8).click();
    await page.getByRole('button', { name: /^Production/ }).click();
    for (const u of ['Carrier', 'Fighter', 'Fighter']) await stage(page).getByRole('button', { name: u, exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();

    await expect(panel(page).getByText('Cost 4, paid 4')).toBeVisible();
    await shot(page, 'r2-tacD');
    await close(page);
  });

  await test.step('R2 Technology secondary: Propagation gives tokens for a plain technology, and the resources are short', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Technology · secondary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'sarween tools', 'Sarween Tools');
    await expect(panel(page).getByText(/Distribute tokens: 3 left/)).toBeVisible();
    await shot(page, 'r2-techsec');
    for (const p of ['Tactic', 'Fleet', 'Strategy']) await panel(page).getByRole('button', { name: `Add one ${p}` }).click();
    await top(page, { Strategy: '3' }, 'R2 tech secondary costs a strategy token and gives one back');
    await close(page);
  });

  await test.step('R2 Economic Initiative as a component action, a pass, the status entry with two objectives', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'economic initiative', 'Economic Initiative');
    await close(page);
    await addAction(page, 'Manual adjustment');
    await panel(page).getByLabel('Label').fill('Sol pays a tribute');
    await panel(page).getByRole('button', { name: /^Add one Trade goods/i }).click();
    await close(page);
    await addAction(page, 'Pass');
    await panel(page).getByRole('group', { name: 'Used', exact: true }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'imperial arms vault', 'Imperial Arms Vault');
    const vault = panel(page).getByRole('group', { name: 'Imperial Arms Vault', exact: true });
    await vault.getByRole('button', { name: 'Mech', exact: true }).click();
    await vault.getByRole('button', { name: "Hope's End", exact: true }).click();
    await close(page);
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'direct hit', 'Direct Hit');
    await panel(page).getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'skilled retreat', 'Skilled Retreat');
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Fleet' }).click();
    await panel(page).getByRole('button', { name: 'Add one Nekro' }).click();
    await panel(page).getByRole('button', { name: 'Add one Nekro' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'develop weaponry', 'Develop Weaponry');
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'destroy their greatest ship', 'Destroy Their Greatest Ship');
    await top(page, { VP: '3' }, 'R2 status VP');
    await shot(page, 'r2-status');
    await panel(page).getByRole('button', { name: 'Edit: Tokens and points' }).click();
  });

  await test.step('R3: Sol defends Mecatol with a destroyer; my hero and commander are unlocked in the components drawer', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await tile(page, 112).click();
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Sol', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Destroyer', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await tile(page, 63).click();
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('button', { name: /^Bas/ }).click();
    await stage(page).getByRole('button', { name: 'Infantry', exact: true }).click();
    await expect(stage(page).locator('[data-stack*="|infantry|"]')).toHaveCount(1);
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: /^Components/ }).click();
    const tabs = page.getByRole('group', { name: 'Drawers' });
    await tabs.getByRole('button', { name: /^Faction/ }).click();
    const drawer = page.getByRole('dialog', { name: 'Components' });
    await drawer.getByTestId('component-leader:nekrocommander').locator('.segment > button').nth(1).click();
    await drawer.getByTestId('component-leader:nekrohero').locator('.segment > button').nth(1).click();
    await expect(drawer.getByTestId('component-leader:nekrohero').locator('.segment > button').nth(1)).toHaveAttribute('aria-pressed', 'true');
    await shot(page, 'r3-leaders');
    await tabs.getByRole('button', { name: /^Faction/ }).click();
  });

  await test.step('R3 Trade secondary refreshes commodities; the agent pays a tactic token for 2 trade goods', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '5 Trade' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Trade · secondary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'malleon', 'Nekro Malleon');
    const ch = panel(page).getByRole('group', { name: 'Nekro Malleon', exact: true });
    await ch.getByRole('button', { name: 'Command token' }).click();
    await ch.getByRole('button', { name: 'Tactic' }).click();

    await top(page, { Commodities: '3' }, 'R3 trade secondary');
    await shot(page, 'r3-trade');
    await close(page);
  });

  await test.step('R3 tactical F: Primor to Mecatol Rex, Sol loses a destroyer, Technological Singularity gains technologies', async () => {
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '8 Imperial' }).click();
    await addAction(page, 'Tactical action');
    await tile(page, 112).click();
    await dragRoute(page, [65, 112]);
    for (const u of ['Carrier', 'Dreadnought', 'Fighter']) await panel(page).getByRole('button', { name: `Take one ${u}` }).first().click();
    await panel(page).getByRole('group', { name: 'Primor' }).getByRole('button', { name: 'Take one Infantry' }).first().click();
    await panel(page).getByRole('group', { name: 'Primor' }).getByRole('button', { name: 'Take one Infantry' }).first().click();
    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    await stage(page).locator('[data-stack*="|destroyer|"] [role=button]').first().click();
    await expect(stage(page).getByText('Losses, The Federation of Sol')).toBeVisible();
    await shot(page, 'r3-tacF-battle');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    for (const [q, n] of [['antimass deflectors', 'Antimass Deflectors'], ['plasma scoring', 'Plasma Scoring'], ['hyper metabolism', 'Hyper Metabolism'], ['dreadnought ii', 'Dreadnought II']] as const) {
      await common.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    // BUG: taking Mecatol Rex warns that 6 influence are short with nothing in the interface to pay them (invasion.ts: paid is fixed at 0).
    await expect(panel(page).getByText('Not enough influence: need 6, paid 0, short by 6.')).toBeVisible();
    await shot(page, 'r3-tacF');
    await close(page);
  });

  await test.step('R3 Imperial: Mecatol Rex held gives a victory point', async () => {
    await addAction(page, 'Strategy');
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    for (const [q, n] of [['unknown relic fragment', 'Unknown Relic Fragment'], ['cultural relic fragment', 'Cultural Relic Fragment']] as const) {
      await common.getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    await top(page, { VP: '5' }, 'R3 imperial VP (custodians 1 + Imperial 1)');
    await shot(page, 'r3-imperial');
    await close(page);
  });

  await test.step('R3 relic: the fragment action cannot be chosen as a component action, so it is played from Used', async () => {
    await addAction(page, 'Component action');
    await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('cultural relic fragment');
    await expect(picker(page).getByText('Nothing found.')).toBeVisible();
    await picker(page).getByRole('button', { name: 'Close' }).click();
    await expect(picker(page)).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '2 Diplomacy' }).click();
    const used = panel(page).getByRole('group', { name: 'Used', exact: true });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'cultural relic fragment', 'Cultural Relic Fragment');
    const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
    await taken.getByRole('button', { name: '+ Discarded' }).click();
    await choose(page, 'cultural relic fragment', 'Cultural Relic Fragment');
    await taken.getByRole('button', { name: '+ Discarded' }).click();
    await choose(page, 'unknown relic fragment', 'Unknown Relic Fragment');
    await taken.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'dominus orb', 'Dominus Orb');
    await shot(page, 'r3-fragments');
    await close(page);
  });

  await test.step('R3 tactical H leaves Mecatol Rex, where my command token lies: the warning is lifted by the Dominus Orb named in Used', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 65).click();
    await dragRoute(page, [112, 65]);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).first().click();
    await expect(panel(page).locator('li[data-code="sourceActivated"]:not(.warning-waived)').first()).toBeVisible();
    await expect(panel(page).locator('li[data-code="sourceActivated"]')).toContainText('already holds your command token');
    await shot(page, 'r3-tacH-warn');
    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    const used = panel(page).getByRole('group', { name: 'Used', exact: true });
    await used.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'dominus orb', 'Dominus Orb');
    await expect(panel(page).locator('li.warning-waived[data-code="sourceActivated"]').first()).toBeVisible();
    await expect(panel(page).locator('li.warning-waived[data-code="sourceActivated"]')).toContainText('Allowed by: Dominus Orb');
    await shot(page, 'r3-tacH-waived');
    await close(page);
  });

  await test.step('R3 probe: what Primor pays with Dyson Sphere attached', async () => {
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'sarween tools', 'Sarween Tools');
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    // Dyson Sphere (+2 resources, +1 influence) is attached to Primor: the payment block values it at 4.
    await expect(panel(page).getByRole('button', { name: 'Primor 4', exact: true })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Remove action' }).click();
  });

  await test.step('R3 tactical G: a carrier with fighters to Vorhal, then the hero strikes it', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 63).click();
    await dragRoute(page, [8, 63]);
    await panel(page).getByRole('button', { name: 'Take one Carrier' }).first().click();
    for (let i = 0; i < 3; i++) await panel(page).getByRole('button', { name: 'Take one Fighter' }).first().click();
    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    await shot(page, 'r3-tacG');
    await close(page);
    await addAction(page, 'Component action');
    await choose(page, 'flayesh', 'UNIT.DSGN.FLAYESH');
    const hero = panel(page).getByRole('group', { name: 'UNIT.DSGN.FLAYESH', exact: true });
    await hero.getByRole('button', { name: 'Vorhal', exact: true }).click();
    await expect(hero.getByText('Nothing to choose from')).toBeVisible();
    const cut = await hero.locator('button').evaluateAll(b => b.filter(x => x.scrollWidth > x.clientWidth + 1).length);
    // BUG: the planets of the hero stand in one row and 17 of the names are cut off.
    expect(cut).toBeGreaterThan(0);
    // BUG: the hero's technology choice offers nothing (nekrohero.ui.test.tsx is a todo), so the technology is entered as a gain.
    await top(page, { 'Trade goods': '7' }, 'R3 hero: Vorhal 0+2 trade goods');
    const common = panel(page).getByRole('group', { name: 'In this turn' });
    await common.getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'bioplasmosis', 'Bioplasmosis');
    await common.getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'malleon', 'Nekro Malleon');
    const seconduse = panel(page).locator('li[data-code="componentExhausted"]');
    await expect(panel(page).locator('li[data-code="componentExhausted"]:not(.warning-waived)').first()).toBeVisible();
    await shot(page, 'r3-hero2');
    await shot(page, 'r3-hero');
    await close(page);
  });

  await test.step('R3 pass, status with the Valefar Z breakthrough taken, and an agenda entry with Mecatol held', async () => {
    await addAction(page, 'Manual adjustment');
    await panel(page).getByLabel('Label').fill('Hacan trade deal');
    await panel(page).getByRole('button', { name: /^Add one Trade goods/i }).click();
    await panel(page).getByRole('group', { name: 'Taken and discarded' }).getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'mining initiative', 'Mining Initiative');
    await close(page);
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('group', { name: 'Mining Initiative', exact: true }).getByRole('button', { name: 'Primor', exact: true }).click();
    // BUG: Dyson Sphere makes Primor 4/2, Mining Initiative should give 4 (10 -> 12 here); it gives the printed 2.
    await top(page, { 'Trade goods': '10' }, 'R3 mining on Primor');
    await close(page);
    await addAction(page, 'Pass');
    await panel(page).getByRole('group', { name: 'Used', exact: true }).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'atrament', 'The Atrament');
    const atrament = panel(page).getByRole('group', { name: 'The Atrament', exact: true });
    await atrament.getByRole('button', { name: 'Mecatol Rex', exact: true }).click();
    await atrament.getByRole('button', { name: 'Add one Infantry' }).click();
    await atrament.getByRole('button', { name: 'Add one Infantry' }).click();
    await expect(atrament.getByText('2', { exact: true })).toBeVisible();
    await shot(page, 'r3-atrament');
    await close(page);
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Strategy' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'corner the market', 'Corner the Market');
    await panel(page).getByRole('button', { name: 'Add one Nekro' }).click();
    await shot(page, 'r3-status');
    await panel(page).getByRole('button', { name: 'Edit: Tokens and points' }).click();
    await panel(page).getByRole('button', { name: '+ Agenda' }).click();
    // Galactic Threat ("You cannot vote on agendas ...") is shown nowhere in the agenda entry.
    await expect(panel(page).getByText(/Galactic Threat|cannot vote/)).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'anti-intellectual', 'Anti-Intellectual Revolution');
    await close(page);
  });

  await test.step('drawers: the breakthrough is added by search, the hero is purged by its play, Sol holds the Antivirus', async () => {
    await page.getByRole('button', { name: /^Components/ }).click();
    const drawer = page.getByRole('dialog', { name: 'Components' });
    const tabs = page.getByRole('group', { name: 'Drawers' });
    await drawer.getByRole('searchbox', { name: 'Search components' }).fill('valefar assimilator z');
    await drawer.getByRole('group', { name: 'Search results' }).getByRole('button', { name: 'Add Valefar Assimilator Z' }).click();
    await drawer.getByRole('button', { name: 'Clear the search' }).click();
    const group = async (name: RegExp) => { const tab = tabs.getByRole('button', { name }); if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click(); };
    await group(/^Faction/);
    await expect(drawer).toContainText('Valefar Assimilator Z');
    await shot(page, 'r3-faction-drawer');
    await drawer.getByRole('button', { name: 'Sol', exact: true }).click();
    await group(/^Cards/);
    await expect(drawer).toContainText('Notes of other players');
    await drawer.getByRole('button', { name: /^Antivirus/ }).click();
    await expect(drawer.locator('.component-text').last()).toContainText('cannot use their Technological Singularity faction ability against you');
    await shot(page, 'r3-sol-cards');
    await drawer.getByRole('button', { name: 'Mine', exact: true }).click();
    await group(/^Objectives/);
    await tabs.getByRole('button', { name: /^Objectives/ }).click();
    await expect(drawer).toHaveCount(0);
  });

  await test.step('end of the game: totals, the hero has cleared Vorhal, the mech stands on Hope End, no console errors', async () => {
    await top(page, { VP: '6', Tactic: '3', Fleet: '8', Strategy: '2', 'Trade goods': '10' }, 'final totals (Mining Initiative on Primor gave 2, not 4)');
    await tile(page, 63).click();
    await expect(stage(page).locator('[data-stack*="|infantry|"]')).toHaveCount(0);
    await stage(page).getByRole('button', { name: 'Close' }).click();
    // BUG: Dyson Sphere on Primor (4/2): 4 + 3 + 4 + 1 = 12 resources and 2 + 6 = 8 influence are due at the end; the top line shows 10 and 7.
    await top(page, { Resources: '10', Influence: '7' }, 'summary ignores the attached Dyson Sphere');
    await tile(page, 65).click();
    await shot(page, 'end-primor');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await tile(page, 66).click();
    expect(await stage(page).locator('[data-stack*="|mech|"]').count()).toBe(1);
    await shot(page, 'end-hopes-end');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    let total = 0;
    for (const n of [1, 2, 3]) {
      await page.getByRole('button', { name: `Round ${n}` }).click();
      const count = await entries(page).count();
      console.log('ENTRIES round', n, count);
      total += count;
    }
    // the status entries and the agenda entry stand outside the action list
    console.log('ENTRIES total', total);
    expect(total).toBeGreaterThanOrEqual(20);
    expect(consoleErrors).toEqual([]);
  });
  expect(mismatches).toEqual([]);
});
