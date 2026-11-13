import { mkdirSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * One long game as the Yssaril Tribes, eight players, Prophecy of Kings on, Thunder's Edge off.
 * Seats: 1 Yssaril (me, home 15), 2 Sol, 3 Hacan, 4 Argent, 5 Nekro, 6 Muaat, 7 Mahact, 8 Xxcha.
 * Home 15 is at the top; Mecatol Rex (112) is four hexes south of it: 15 -> 44 (asteroids) -> 36 (Arnor / Lor) -> 61 (Ang) -> 112.
 * 27 (New Albion / Starpoint) and 72 (Lisis / Velnor) touch home.
 */
const MAP = '61 40 20 21 22 19 36 33 39 23 24 28 29 30 31 32 34 38 44 79 35 37 42 43 45 46 50 59 60 62 63 64 65 66 67 41 15 27 25 1 68 69 16 70 71 58 73 74 8 75 76 4 77 78 52 80 81 14 26 72';
const RIVALS = ['Sol', 'Hacan', 'Argent', 'Nekro', 'Muaat', 'Mahact', 'Xxcha'];
const SHOTS = 'test-results/scenarios/yssaril';
const LOG = `${SHOTS}/notes.log`;
mkdirSync(SHOTS, { recursive: true });
writeFileSync(LOG, '');
const note = (s: string) => appendFileSync(LOG, `${s}\n`);

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });
const stage = (page: Page) => page.locator('.stage-dialog');
const entries = (page: Page) => page.getByRole('region', { name: 'Actions' }).locator('.entry');
const waivedLine = (scope: Locator, code: string) => scope.locator(`li.warning-waived[data-code="${code}"]`);
const standingLine = (scope: Locator, code: string) => scope.locator(`li[data-code="${code}"]:not(.warning-waived)`);
const codes = (scope: Locator) => scope.locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + (x.classList.contains('warning-waived') ? '(waived)' : '')).join(','));
const flat = async (scope: Locator, from = '', len = 1500) => { const t = (await scope.innerText()).replace(/\n+/g, ' | '); const i = from ? t.indexOf(from) : 0; return t.slice(Math.max(i, 0), Math.max(i, 0) + len); };

async function sum(page: Page, name: string): Promise<number> {
  await expect(page.locator('.summary-bar .summary-forecast-leaving')).toHaveCount(0);
  const text = await page.locator(`.summary-cell[aria-label="${name}"]`).innerText();
  const m = text.match(/(-?\d+)\s*$/);
  if (!m) throw new Error(`no number in summary ${name}: ${text}`);
  return Number(m[1]);
}
async function sumNow(page: Page, name: string): Promise<number> {
  await expect(page.locator('.summary-bar .summary-forecast-leaving')).toHaveCount(0);
  const text = await page.locator(`.summary-cell[aria-label="${name}"]`).innerText();
  const m = text.match(/(-?\d+)/);
  if (!m) throw new Error(`no number in summary ${name}: ${text}`);
  return Number(m[1]);
}
const ALL = ['Resources', 'Influence', 'Trade goods', 'Commodities', 'Tactic', 'Fleet', 'Strategy', 'VP'];
async function sums(page: Page, names: string[] = ALL) { const out: Record<string, number> = {}; for (const n of names) out[n] = await sum(page, n); return out; }
async function sumsNow(page: Page, names: string[] = ALL) { const out: Record<string, number> = {}; for (const n of names) out[n] = await sumNow(page, n); return out; }
const mode = (page: Page, which: 'Forecast' | 'Now') => page.getByRole('button', { name: which, exact: true }).click();
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` });

async function waitStill(target: Locator) {
  let last = '';
  await expect.poll(async () => { const now = JSON.stringify(await target.boundingBox()); const still = now === last; last = now; return still; }, { intervals: [150] }).toBe(true);
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function dragRoute(page: Page, hexes: number[]) {
  const points = [];
  for (const n of hexes) points.push(await waitStill(tile(page, n)));
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.mouse.up();
}
async function choose(page: Page, query: string, name: string, id?: string) {
  const d = picker(page);
  await d.getByRole('searchbox', { name: 'Search components' }).fill(query);
  const scope = id ? d.getByTestId(`component-${id}`) : d;
  await scope.getByRole('button', { name: `Choose ${name}`, exact: true }).click();
  await expect(picker(page)).toHaveCount(0);
}
async function addAction(page: Page, type: string) {
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.locator('.action-list').getByRole('button', { name: type, exact: true }).click();
}
const done = (page: Page) => panel(page).getByRole('button', { name: 'Done', exact: true }).click();
async function chooseCard(page: Page, card: string, taps = 3) { for (let i = 0; i < taps; i++) await page.getByRole('button', { name: card }).click(); }
const take = (page: Page, unit: string, group?: string) => (group ? panel(page).getByRole('group', { name: group }) : panel(page)).getByRole('button', { name: `Take one ${unit}`, exact: true }).first().click();
const usedBlock = (page: Page) => panel(page).locator('[role="group"]').filter({ has: page.getByRole('button', { name: '+ Used' }) }).last();
const takenBlock = (page: Page) => panel(page).getByRole('group', { name: 'Taken and discarded' });

async function createGame(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '＋ Add opponent' }).click();
  await page.getByRole('button', { name: '＋ Add opponent' }).click();
  await page.getByRole('button', { name: 'My faction', exact: true }).click();
  await page.getByRole('button', { name: 'The Yssaril Tribes' }).click();
  for (let i = 0; i < RIVALS.length; i++) {
    await page.getByRole('button', { name: 'Opponent', exact: true }).nth(i).click();
    await page.getByRole('button', { name: new RegExp(RIVALS[i]) }).first().click();
  }
  await page.getByRole('textbox', { name: 'Game name' }).fill('Yssaril long game');
  await page.getByRole('button', { name: 'Paste a Milty string' }).click();
  await page.getByLabel('Milty Draft map string').fill(MAP);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText(/tiles placed/)).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await expect(tile(page, 15)).toBeVisible();
}

test.describe.configure({ mode: 'serial' });
test.use({ actionTimeout: 15_000, navigationTimeout: 30_000 });

test('Yssaril: a long game, three rounds', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  const noErrors = () => expect(errors, errors.join('\n')).toEqual([]);
  const problems: string[] = [];
  const attempt = async (label: string, fn: () => Promise<void>) => {
    await test.step(label, async () => {
      try { await fn(); } catch (e) { problems.push(label + ' :: ' + String((e as Error).message).split('\n').slice(0, 12).join(' | ')); note('PROBLEM ' + problems[problems.length - 1]); await shot(page, 'fail-' + label.replace(/\W+/g, '-').slice(0, 40)); }
    });
  };
  const openDrawer = async (group?: RegExp) => {
    if (!(await drawer(page).count())) await page.getByRole('button', { name: /^Components/ }).click();
    if (group) { const t = groupTab(page, group); if ((await t.getAttribute('aria-pressed')) !== 'true') await t.click(); }
  };
  const closeDrawer = async () => { await page.locator('.tab-fan > button[aria-pressed=true]').click(); await expect(drawer(page)).toHaveCount(0); };
  void testInfo; void readFileSync; void noErrors; void closeDrawer;

  await test.step('create the game on the first screen', async () => {
    await createGame(page);
    note(`start sums ${JSON.stringify(await sums(page))}`);
    await shot(page, '01-start');
  });

  await attempt('what the faction drawer shows at the start', async () => {
    await openDrawer(/^Faction/);
    note('faction drawer: ' + await flat(drawer(page), '', 4000));
    note('faction ids: ' + await drawer(page).locator('[data-testid^="component-"]').evaluateAll(a => a.map(x => x.getAttribute('data-testid')).join(' ')));
    await shot(page, '02-faction-drawer');
    await groupTab(page, /^Technologies/).click();
    note('techs at start: ' + await flat(drawer(page), '', 1500));
    await groupTab(page, /^Cards/).click();
    note('cards at start: ' + await flat(drawer(page), '', 2500));
    await closeDrawer();
  });
  await attempt('R1 Politics primary: Scheming draws three action cards, one is discarded', async () => {
    await chooseCard(page, '3 Politics');
    await addAction(page, 'Strategy');
    note('E1 panel: ' + await flat(panel(page), 'PRIMARY', 2500));
    note('E1 groups: ' + await panel(page).getByRole('group').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).join(' | ')));
    await shot(page, '03-politics');
    const taken = takenBlock(page);
    await taken.getByRole('button', { name: '+ Took' }).click();
    note('E1 action card picker: ' + await flat(picker(page), '', 300));
    await choose(page, 'sabotage', 'Sabotage');
    for (const [q, n] of [['direct hit', 'Direct Hit'], ['mining initiative', 'Mining Initiative']] as const) { await taken.getByRole('button', { name: '+ Took' }).click(); await choose(page, q, n); }
    note('E1 after took: ' + await flat(panel(page), 'Taken', 1500));
    note('E1 warnings: ' + await codes(panel(page)));
    await shot(page, '04-politics-cards');
  });
  await attempt('R1 E1 Scheming: discard one of the three; the hint of Scheming', async () => {
    await takenBlock(page).getByRole('button', { name: '+ Discarded' }).click();
    note('E1 discard picker: ' + await flat(picker(page), '', 400));
    await choose(page, 'mining initiative', 'Mining Initiative');
    note('E1 after discard: ' + await flat(panel(page), 'Taken', 1500));
    note('E1 hints: ' + await panel(page).locator('.hint, [data-hint], .step-hints, [class*=hint]').evaluateAll(a => a.map(x => x.className + ':' + (x as HTMLElement).innerText).join(' || ')));
    note('E1 text has Scheming: ' + /Scheming/.test(await panel(page).innerText()));
    await shot(page, '05-politics-discard');
    await done(page);
    note(`after E1 ${JSON.stringify(await sums(page))}`);
  });

  await attempt('R1 E2 tactical: carriers, cruiser and infantry to New Albion / Starpoint', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 27).click();
    await expect(page.getByText('Active system: New Albion / Starpoint')).toBeVisible();
    await dragRoute(page, [15, 27]);
    for (const u of ['Carrier', 'Carrier', 'Cruiser', 'Fighter', 'Fighter', 'Infantry', 'Infantry', 'Infantry', 'Infantry']) await take(page, u);
    note('E2 picker: ' + await flat(panel(page), 'Fleet', 1800));
    await shot(page, '06-e2-picker');
    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    note('E2 after fly: ' + await flat(panel(page), '', 2500));
    const na = panel(page).getByRole('group', { name: 'Landing on New Albion' });
    const sp = panel(page).getByRole('group', { name: 'Landing on Starpoint' });
    await na.getByRole('button', { name: 'Land one Infantry' }).click();
    await na.getByRole('button', { name: 'Land one Infantry' }).click();
    await sp.getByRole('button', { name: 'Land one Infantry' }).click();
    await sp.getByRole('button', { name: 'Land one Infantry' }).click();
    note('E2 landed: ' + await flat(panel(page), '', 2500));
    note('E2 warnings: ' + await codes(panel(page)));
    await shot(page, '07-e2');
    await done(page);
    note(`after E2 ${JSON.stringify(await sums(page))}`);
  });
  await attempt('look at home stage (start units on planets or in space?)', async () => {
    await mode(page, 'Now');
    await tile(page, 15).click();
    note('HOME stage now: ' + await stage(page).locator('[aria-label]').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).filter(Boolean).join(' | ')));
    await shot(page, '08-home-stage-now');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    await mode(page, 'Forecast');
    await tile(page, 15).click();
    note('HOME stage forecast: ' + await stage(page).locator('[aria-label]').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).filter(Boolean).join(' | ')));
    await shot(page, '09-home-stage-forecast');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });
  await attempt('R1 E3 component action: Stall Tactics, the mech deploys on New Albion', async () => {
    await addAction(page, 'Component action');
    note('E3 picker: ' + await flat(picker(page), '', 1200));
    await choose(page, 'stall tactics', 'Stall Tactics');
    note('E3 panel: ' + await flat(panel(page), '', 2500));
    note('E3 groups: ' + await panel(page).getByRole('group').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).join(' | ')));
    note('E3 warnings: ' + await codes(panel(page)));
    await shot(page, '10-stall');
    await takenBlock(page).getByRole('button', { name: '+ Discarded' }).click();
    note('E3 discard picker: ' + await flat(picker(page), '', 500));
    await choose(page, 'direct hit', 'Direct Hit');
    note('E3 warnings after discard: ' + await codes(panel(page)));
    await usedBlock(page).getByRole('button', { name: '+ Used' }).click();
    note('E3 used picker: ' + await flat(picker(page), '', 700));
    await choose(page, 'blackshade', 'Blackshade Infiltrator');
    note('E3 after mech: ' + await flat(panel(page), '', 2500));
    await shot(page, '11-stall-mech');
    note('E3 warnings after mech: ' + await codes(panel(page)));
  });
  await attempt('R1 E3 planet of the mech, done', async () => {
    await usedBlock(page).getByRole('button', { name: 'New Albion', exact: true }).click();
    await shot(page, '12-stall-mech-planet');
    note('E3 planet chosen: ' + await flat(panel(page), 'Used', 1200) + ' // ' + await codes(panel(page)));
    await done(page);
    await tile(page, 27).click();
    note('27 stage: ' + await stage(page).locator('[aria-label]').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).filter(Boolean).join(' | ')));
    await shot(page, '13-27-stage');
    await stage(page).getByRole('button', { name: 'Close' }).click();
    note(`after E3 ${JSON.stringify(await sums(page))}`);
  });

  await attempt('R1 E4 tactical at home: production paid with planets', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 15).click();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const s = stage(page);
    await s.getByRole('button', { name: 'Carrier', exact: true }).click();
    await s.getByRole('button', { name: /^Mech/ }).first().click();
    note('E4 stage: ' + (await s.innerText()).replace(/\n/g, ' | ').slice(-900));
    note('E4 mech buttons: ' + await s.getByRole('button').evaluateAll(a => a.map(x => x.getAttribute('aria-label') || x.textContent).filter(x => /mech/i.test(x ?? '')).join(' | ')));
    await shot(page, '14-e4-prod');
    await s.getByRole('button', { name: 'Close' }).click();
    note('E4 panel: ' + await flat(panel(page), 'Production', 2200));
    note('E4 warnings: ' + await codes(panel(page)));
    await shot(page, '15-e4-panel');
  });
  await attempt('R1 E4 done, E5 pass with a transaction, E6 status phase', async () => {
    await done(page);
    note(`after E4 ${JSON.stringify(await sums(page))}`);
    await addAction(page, 'Pass');
    await done(page);
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    note('status panel: ' + await flat(panel(page), 'STATUS', 3000));
    note('status hints: ' + await panel(page).locator('li, .hint, [class*=hint], [class*=reminder]').evaluateAll(a => a.map(x => x.className + ':' + (x as HTMLElement).innerText.slice(0, 100)).filter(x => /Neural|Scheming|draw/i.test(x)).join(' || ')));
    await shot(page, '16-status');
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    const taken = takenBlock(page);
    for (const [q, n] of [['courageous', 'Courageous to the End'], ['lost star', 'Lost Star Chart'], ['plague', 'Plague']] as const) { await taken.getByRole('button', { name: '+ Action card' }).or(taken.getByRole('button', { name: '+ Took' })).first().click(); await choose(page, q, n); }
    await taken.getByRole('button', { name: '+ Discarded' }).click();
    await choose(page, 'plague', 'Plague');
    note('status after: ' + await flat(panel(page), 'STATUS', 3000));
    note('status warnings: ' + await codes(panel(page)));
    await shot(page, '17-status-cards');
    note('status top buttons: ' + await panel(page).getByRole('button').evaluateAll(a => a.slice(0, 6).map(x => (x.getAttribute('aria-label') || x.textContent) + '/' + x.tagName).join(' | ')));
    if (await panel(page).getByRole('button', { name: 'Done', exact: true }).count()) await done(page);
    note(`after status ${JSON.stringify(await sums(page))}`);
  });
  await attempt('R2 starts: planets ready, tokens carried over', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 2', exact: true })).toBeVisible();
    const s = await sums(page);
    note(`R2 start ${JSON.stringify(s)}`);
    expect(s).toEqual({ Resources: 7, Influence: 7, 'Trade goods': 0, Commodities: 0, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 });
  });

  await attempt('R2 Technology primary: Transparasteel Plating free, Mageon Implants (3 biotic) second', async () => {
    await chooseCard(page, '7 Technology');
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'mageon', 'Mageon Implants');
    note('R2 mi first: ' + await flat(panel(page), 'PRIMARY', 1800) + ' // ' + await codes(panel(page)));
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'transparasteel', 'Transparasteel Plating');
    note('R2 tp second: ' + await flat(panel(page), 'PRIMARY', 2200) + ' // ' + await codes(panel(page)));
    await shot(page, '18-tech-primary');
  });
  await attempt('R2 tech: right order, the specialty of New Albion lifts the third biotic', async () => {
    await panel(page).getByRole('button', { name: 'Remove Mageon Implants' }).click();
    await panel(page).getByRole('button', { name: 'Remove Transparasteel Plating' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'transparasteel', 'Transparasteel Plating');
    note('R2 tp only: ' + await flat(panel(page), 'Technology:', 700) + ' // ' + await codes(panel(page)));
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'mageon', 'Mageon Implants');
    note('R2 tp+mi: ' + await flat(panel(page), 'Technology:', 1100) + ' // ' + await codes(panel(page)));
    note('R2 specialty buttons: ' + await panel(page).getByRole('button').evaluateAll(a => a.map(x => (x.getAttribute('aria-label') || x.textContent) + ':' + x.getAttribute('aria-pressed')).filter(x => /albion|specialt|biotic/i.test(x)).join(' | ')));
    await panel(page).getByRole('button', { name: /^New Albion/ }).first().click();
    note('R2 after specialty: ' + await flat(panel(page), 'Technology:', 1300) + ' // ' + await codes(panel(page)));
    await shot(page, '19-tech-specialty');
  });
  await attempt('R2 tech: pay with the other planets, New Albion exhausted for the specialty', async () => {
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    note('R2 manual buttons: ' + await panel(page).getByRole('button').evaluateAll(a => a.map(x => (x.getAttribute('aria-label') || x.textContent) + ':' + x.getAttribute('aria-pressed')).filter(x => /Starpoint|Retillion|Shalloq|Albion|trade/i.test(x)).join(' | ')));
    await shot(page, '20-manual-pay');
    note('R2 manual text: ' + await flat(panel(page), 'Cost', 500));
    await panel(page).getByRole('button', { name: /^New Albion 1/ }).click();
    await panel(page).getByRole('button', { name: /^Shalloq 1/ }).click();
    note('R2 repaid: ' + await flat(panel(page), 'Technology:', 1000) + ' // ' + await codes(panel(page)));
    await shot(page, '21-repaid');
    expect(await codes(panel(page))).toBe('');
    await done(page);
    note(`after R2 tech ${JSON.stringify(await sums(page))}`);
  });
  await attempt('R2 rival tab: what Sol can be given', async () => {
    await panel(page).getByRole('button', { name: 'Sol', exact: true }).first().click();
    await page.getByRole('button', { name: 'Add action' }).click();
    note('Sol action list: ' + await page.locator('.action-list').innerText().then(t => t.replace(/\n+/g, ' | ')));
    await shot(page, '22-sol-actions');
    await page.locator('.action-list').getByRole('button', { name: 'Manual adjustment', exact: true }).click();
    note('Sol manual: ' + await flat(panel(page), '', 1800));
    await shot(page, '23-sol-manual');
  });
  await attempt('R2 Sol draws three action cards; I look at the hand with Mageon Implants and take one', async () => {
    await panel(page).getByRole('textbox', { name: 'Label' }).fill('Sol draws cards');
    for (const [q, n] of [['veto', 'Veto'], ['bribery', 'Bribery'], ['reparations', 'Reparations']] as const) { await takenBlock(page).getByRole('button', { name: '+ Took' }).click(); await choose(page, q, n); }
    note('Sol took: ' + await flat(panel(page), 'WITH THIS', 900) + ' // ' + await codes(panel(page)));
    await done(page);
    await panel(page).getByRole('button', { name: 'Mine', exact: true }).first().click();
    await addAction(page, 'Component action');
    await choose(page, 'mageon', 'Mageon Implants');
    note('MI panel: ' + await flat(panel(page), 'ACTION SETUP', 1600) + ' // ' + await codes(panel(page)));
    note('MI groups: ' + await panel(page).getByRole('group').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).join(' | ')));
    await shot(page, '24-mi');
  });
  await attempt('R2 Mageon Implants: whose hand, which card', async () => {
    await panel(page).getByRole('group', { name: 'Whose hand' }).getByRole('button', { name: 'Sol', exact: true }).click();
    note('MI after player: ' + await flat(panel(page), 'ACTION SETUP', 900));
    note('MI groups: ' + await panel(page).getByRole('group').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).join(' | ')));
    await shot(page, '25-mi-whose');
    const card = panel(page).getByRole('group', { name: 'Card from the hand' });
    note('MI card buttons: ' + await card.getByRole('button').evaluateAll(a => a.map(x => x.textContent).join(' | ')));
    await card.getByRole('button', { name: /Veto/ }).click();
    note('MI after card: ' + await flat(panel(page), 'ACTION SETUP', 900) + ' // ' + await codes(panel(page)));
    await done(page);
    await openDrawer(/^Cards/);
    note('my hand after MI: ' + await flat(drawer(page), 'Action cards', 600));
    await drawer(page).getByRole('button', { name: 'Sol', exact: true }).click();
    note('Sol hand after MI: ' + await flat(drawer(page), 'Action cards', 600));
    await shot(page, '26-sol-hand');
    await drawer(page).getByRole('button', { name: 'Mine', exact: true }).click();
    await closeDrawer();
  });
  await attempt('R2 tactical to Quann next to Sol, with Spy Net given to Sol', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 25).click();
    await expect(page.getByText('Active system: Quann')).toBeVisible();
    await dragRoute(page, [27, 25]);
    for (const u of ['Carrier', 'Cruiser']) await take(page, u);
    await take(page, 'Infantry', 'New Albion'); await take(page, 'Infantry', 'Starpoint'); await take(page, 'Mech', 'New Albion');
    note('R2 quann picker: ' + await flat(panel(page), 'Fleet', 900));
    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    const q = panel(page).getByRole('group', { name: 'Landing on Quann' });
    await q.getByRole('button', { name: 'Land one Infantry' }).first().click();
    await q.getByRole('button', { name: 'Land one Infantry' }).first().click();
    await q.getByRole('button', { name: 'Land one Mech' }).first().click();
    note('R2 quann action: ' + await flat(panel(page), '', 1800) + ' // ' + await codes(panel(page)));
    await shot(page, '27-quann');
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Sol', exact: true }).click();
    await panel(page).getByRole('button', { name: '+ Component' }).first().click();
    await choose(page, 'spy net', 'Spy Net');
    note('R2 spynet transaction: ' + await flat(panel(page), 'IN THIS', 1500) + ' // ' + await codes(panel(page)));
    await shot(page, '28-spynet-given');
  });
  await attempt('R2 Sol plays Spy Net and takes a card from my hand', async () => {
    await panel(page).getByRole('button', { name: 'Back' }).click();
    note('R2 quann after back: ' + await flat(panel(page), 'IN THIS', 700) + ' // ' + await codes(panel(page)));
    await done(page);
    note(`after Quann ${JSON.stringify(await sums(page))}`);
    await openDrawer(/^Cards/);
    await drawer(page).getByRole('button', { name: 'Sol', exact: true }).click();
    note('Sol cards with Spy Net: ' + await flat(drawer(page), 'promissory', 900));
    await shot(page, '29-sol-notes');
    await drawer(page).getByRole('button', { name: 'Mine', exact: true }).click();
    note('my notes after giving Spy Net: ' + await flat(drawer(page), 'My promissory', 700));
    await closeDrawer();
    await panel(page).getByRole('button', { name: 'Sol', exact: true }).first().click();
    await addAction(page, 'Pass');
    await usedBlock(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'spy net', 'Spy Net');
    note('Sol spynet used: ' + await flat(panel(page), 'ACTION SETUP', 1200) + ' // ' + await codes(panel(page)));
    note('Sol spynet groups: ' + await panel(page).getByRole('group').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).join(' | ')));
    await shot(page, '30-sol-spynet');
  });
  await attempt('R2 Spy Net choices: whose hand', async () => {
    const card = panel(page).getByRole('group', { name: 'Card from the hand' });
    const offered = await card.getByRole('button').allInnerTexts();
    note('Sol spynet offered: ' + offered.join(' | '));
    // BUG (Y1): the choice of a component named in «Used» of a rival's entry reads the rival's own hand (UsesBlock.tsx:61 passes no `shared`).
    expect(offered.sort()).toEqual(['Bribery', 'Reparations']);
    await done(page);
  });

  await attempt('R2 unlock my leaders in the drawer: commander (7 action cards) and hero (3 scored objectives)', async () => {
    await openDrawer(/^Faction/);
    const commander = drawer(page).getByTestId('component-leader:yssarilcommander');
    const hero = drawer(page).getByTestId('component-leader:yssarilhero');
    await commander.getByRole('button', { name: 'Unlocked' }).click();
    await hero.getByRole('button', { name: 'Unlocked' }).click();
    await expect(commander.getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await expect(drawer(page).getByTestId('component-leader:yssarilagent').getByRole('button', { name: 'Unlocked' })).toHaveAttribute('aria-pressed', 'true');
    await shot(page, '31-leaders');
    await closeDrawer();
  });

  await attempt('R2 Sol activates Quann where my units stand: the commander reminder', async () => {
    await panel(page).getByRole('button', { name: 'Sol', exact: true }).first().click();
    await addAction(page, 'Tactical action');
    await tile(page, 25).click();
    await expect(page.getByText('Active system: Quann')).toBeVisible();
    note('Sol tactical 25 panel: ' + await flat(panel(page), '', 1500) + ' // ' + await codes(panel(page)));
    await shot(page, '32-sol-quann');
    note('So Ata anywhere: ' + /So Ata/.test(await panel(page).innerText()));
    await done(page);
  });
  await attempt('R2 hand over the limit of seven: Crafty allows it', async () => {
    await panel(page).getByRole('button', { name: 'Mine', exact: true }).first().click();
    await addAction(page, 'Manual adjustment');
    await panel(page).getByRole('textbox', { name: 'Label' }).fill('More cards');
    for (const [q, n] of [['rally', 'Rally'], ['sanction', 'Sanction'], ['insider', 'Insider Information'], ['solar flare', 'Solar Flare'], ['war machine', 'War Machine']] as const) {
      await takenBlock(page).getByRole('button', { name: '+ Took' }).click(); await choose(page, q, n);
    }
    note('R2 nine cards: ' + await codes(panel(page)));
    await shot(page, '33-nine-cards');
    note('R2 nine cards text: ' + await flat(panel(page), '', 1800));
    await done(page);
    note('R2 list warnings: ' + await codes(page.getByRole('region', { name: 'Actions' })));
    await openDrawer(/^Cards/);
    note('hand count: ' + await flat(drawer(page), 'Action cards', 1500));
    await closeDrawer();
  });
  await attempt('R2 hero Kyver: component action, three cards taken, purged; a second play is warned of', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'kyver', 'Kyver, Blade and Key');
    note('Kyver panel: ' + await flat(panel(page), 'ACTION SETUP', 1000) + ' // ' + await codes(panel(page)));
    for (const [q, n] of [['spy', 'Spy'], ['summit', 'Summit'], ['unexpected', 'Unexpected Action']] as const) {
      await takenBlock(page).getByRole('button', { name: '+ Took' }).click(); await choose(page, q, n);
    }
    await shot(page, '34-kyver');
    await done(page);
    await openDrawer(/^Faction/);
    await expect(drawer(page).getByTestId('component-leader:yssarilhero').getByRole('button', { name: 'Purged' })).toHaveAttribute('aria-pressed', 'true');
    await closeDrawer();
    await addAction(page, 'Component action');
    await choose(page, 'kyver', 'Kyver, Blade and Key');
    note('Kyver again: ' + await codes(panel(page)));
    await expect(standingLine(panel(page), 'componentNotHeld')).toHaveCount(1);
    await panel(page).getByRole('button', { name: 'Delete' }).or(panel(page).getByRole('button', { name: 'Back' })).first().click().catch(() => undefined);
  });
  await attempt('R2 pass: the agent Ssruu in «Used», a second use warns', async () => {
    note('R2 entries now: ' + (await entries(page).evaluateAll(a => a.map(x => (x as HTMLElement).innerText.split('\n')[0]))).join(' > '));
    if (await panel(page).getByRole('button', { name: 'Done', exact: true }).count()) await done(page);
    await addAction(page, 'Pass');
    await usedBlock(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'ssruu', 'Ssruu');
    note('Ssruu once: ' + await codes(panel(page)));
    expect(await codes(panel(page))).toBe('');
    await done(page);
    await addAction(page, 'Manual adjustment');
    await panel(page).getByRole('textbox', { name: 'Label' }).fill('Ssruu again');
    await usedBlock(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'ssruu', 'Ssruu');
    note('Ssruu twice: ' + await codes(panel(page)));
    await shot(page, '35-ssruu-twice');
    await expect(standingLine(panel(page), 'componentExhausted')).toHaveCount(1);
    await done(page);
  });

  await attempt('R2 status: tokens, an objective that is not met, action cards with Neural Motivator and Scheming', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Fleet' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'expand borders', 'Expand Borders');
    await panel(page).getByRole('button', { name: 'Add one Yssaril' }).click();
    note('R2 status text: ' + await flat(panel(page), 'STATUS', 2500) + ' // ' + await codes(panel(page)));
    await shot(page, '36-status2');
    note(`after R2 status ${JSON.stringify(await sums(page))}`);
  });
  await attempt('R2 status cards: two with Neural Motivator and one more with Scheming, one discarded', async () => {
    const taken = takenBlock(page);
    for (const [q, n] of [['upgrade', 'Upgrade'], ['war effort', 'War Effort'], ['mining initiative', 'Mining Initiative']] as const) { await taken.getByRole('button', { name: '+ Action card' }).or(taken.getByRole('button', { name: '+ Took' })).first().click(); await choose(page, q, n); }
    await taken.getByRole('button', { name: '+ Discarded' }).click();
    await choose(page, 'upgrade', 'Upgrade');
    note('R2 status warnings: ' + await codes(panel(page)));
    await shot(page, '37-status2-cards');
  });

  await attempt('R3 starts; Trade as the main card; the relic Dynamis Core is taken first', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    await expect(page.getByRole('button', { name: 'Round 3', exact: true })).toBeVisible();
    note(`R3 start ${JSON.stringify(await sums(page))}`);
    expect(await sums(page)).toEqual({ Resources: 9, Influence: 8, 'Trade goods': 0, Commodities: 0, Tactic: 3, Fleet: 4, Strategy: 2, VP: 1 });
    await chooseCard(page, '5 Trade');
    await addAction(page, 'Manual adjustment');
    await panel(page).getByRole('textbox', { name: 'Label' }).fill('Relic: Dynamis Core');
    await takenBlock(page).getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'dynamis', 'Dynamis Core');
    await done(page);
    await addAction(page, 'Strategy');
    note('R3 trade panel: ' + await flat(panel(page), 'PRIMARY', 2000) + ' // ' + await codes(panel(page)));
    await shot(page, '38-trade');
    await done(page);
    note(`after R3 trade ${JSON.stringify(await sums(page))}`);
  });
  await attempt('R3 Dynamis Core: trade goods equal to the commodity value 3 + 2', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'dynamis', 'Dynamis Core');
    await done(page);
    note(`after Dynamis ${JSON.stringify(await sums(page))}`);
    expect(await sums(page, ['Trade goods'])).toEqual({ 'Trade goods': 8 });
  });

  await attempt('R3 setup: Sol fleet in Lisis / Velnor (tile 72) by hand', async () => {
    await tile(page, 72).click();
    await stage(page).getByRole('button', { name: 'Setup', exact: true }).click();
    await stage(page).getByRole('button', { name: 'Sol', exact: true }).click();
    for (const u of ['Cruiser', 'Destroyer']) await stage(page).getByRole('button', { name: u, exact: true }).click();
    await shot(page, '39-setup72');
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  await attempt('R3 production at home: the flagship for 8, paid with trade goods', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 15).click();
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const s = stage(page);
    note('R3 prod buttons: ' + await s.getByRole('button').evaluateAll(a => a.map(x => x.getAttribute('aria-label') || x.textContent).filter(x => /flagship|dread|carrier/i.test(x ?? '')).join(' | ')));
    await s.getByRole('button', { name: 'Flagship', exact: true }).click();
    note('R3 prod stage: ' + (await s.innerText()).replace(/\n/g, ' | ').slice(-700));
    await shot(page, '40-flagship-prod');
    await s.getByRole('button', { name: 'Close' }).click();
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    note('R3 prod pay buttons: ' + await panel(page).getByRole('button').evaluateAll(a => a.map(x => (x.getAttribute('aria-label') || x.textContent) + ':' + x.getAttribute('aria-pressed')).filter(x => /Starpoint|Retillion|Shalloq|Albion|Quann|trade/i.test(x)).join(' | ')));
    // clear the planets chosen automatically
    for (const name of [/^Starpoint 3/, /^Retillion 2/, /^Shalloq 1/, /^New Albion 1/, /^Quann 2/]) {
      const b = panel(page).getByRole('button', { name }).first();
      if (await b.count() && (await b.getAttribute('aria-pressed')) === 'true') await b.click();
    }
    for (let i = 0; i < 8; i++) await panel(page).getByRole('button', { name: /^Add one trade good/i }).click();
    note('R3 prod paid: ' + await flat(panel(page), 'Production', 900) + ' // ' + await codes(panel(page)));
    await shot(page, '41-flagship-paid');
    note('R3 pressed planets: ' + await panel(page).getByRole('button').evaluateAll(a => a.map(x => (x.getAttribute('aria-label') || x.textContent) + ':' + x.getAttribute('aria-pressed')).filter(x => /Starpoint|Retillion|Shalloq|Albion|Quann/i.test(x)).join(' | ')));
    await done(page);
    note(`after flagship ${JSON.stringify(await sums(page))}`);
    expect(await sums(page, ['Resources', 'Trade goods'])).toEqual({ Resources: 9, 'Trade goods': 0 });
  });
  await attempt('R3 tactical: the flagship flies through Sol ships in Lisis and the gravity rift to Arnor / Lor', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 36).click();
    await expect(page.getByText('Active system: Arnor / Lor')).toBeVisible();
    await dragRoute(page, [15, 72, 41, 36]);
    await take(page, 'Flagship');
    await take(page, 'Infantry');
    note('R3 flagship picker: ' + await flat(panel(page), 'Fleet', 1200) + ' // ' + await codes(panel(page)));
    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    const arnor = panel(page).getByRole('group', { name: 'Landing on Arnor' });
    await arnor.getByRole('button', { name: 'Land one Infantry' }).click();
    note('R3 flagship action: ' + await flat(panel(page), '', 2200) + ' // ' + await codes(panel(page)));
    await shot(page, '42-flagship-route');
    note('R3 route lines: ' + await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + (x.classList.contains('warning-waived') ? '(waived)' : '') + ': ' + (x as HTMLElement).innerText.replace(/\n+/g, ' ')).join(' || ')));
  });
  await attempt('R3 flagship route: the pass through the Sol ships is not allowed by the flagship ability', async () => {
    // The home system holds my command token after the production action: the sourceActivated warning is the rule (LRR 6.2) and stands.
    await expect(standingLine(panel(page), 'sourceActivated')).toHaveCount(1);
    // BUG (Y2): Y'sia Y'ssrila "can move through systems that contain other player's ships", yet routeBlocked stands, not allowed by anything.
    await expect(standingLine(panel(page), 'routeBlocked')).toHaveCount(1);
    await expect(waivedLine(panel(page), 'routeBlocked')).toHaveCount(0);
    await done(page);
    note(`after flagship move ${JSON.stringify(await sums(page))}`);
  });

  await attempt('R3 tactical: the flagship takes the infantry from Arnor to Mecatol Rex', async () => {
    await addAction(page, 'Tactical action');
    await tile(page, 112).click();
    await expect(page.getByText('Active system: Mecatol Rex')).toBeVisible();
    await dragRoute(page, [36, 61, 112]);
    await take(page, 'Flagship');
    await take(page, 'Infantry', 'Arnor');
    await panel(page).getByRole('button', { name: 'Fly', exact: true }).click();
    const mr = panel(page).getByRole('group', { name: 'Landing on Mecatol Rex' });
    await mr.getByRole('button', { name: 'Land one Infantry' }).click();
    note('R3 mecatol: ' + await flat(panel(page), '', 2600) + ' // ' + await codes(panel(page)));
    await shot(page, '43-mecatol');
  });
  await attempt('R3 Mecatol done; Technology secondary: the unit upgrade Infantry II', async () => {
    await done(page);
    note(`after Mecatol ${JSON.stringify(await sums(page))}`);
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'infantry ii', 'Infantry II');
    note('R3 inf2: ' + await flat(panel(page), 'Technology:', 1200) + ' // ' + await codes(panel(page)));
    await shot(page, '44-infantry2');
    note('R3 inf2 groups: ' + await panel(page).getByRole('group').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).join(' | ')));
  });
  await attempt('R3 Infantry II paid, Mining Initiative, Stall Tactics with a mech on Mecatol Rex', async () => {
    await done(page);
    note(`after Infantry II ${JSON.stringify(await sums(page))}`);
    expect(await sums(page, ['Resources', 'Strategy'])).toEqual({ Resources: 5, Strategy: 1 });
    await addAction(page, 'Component action');
    await choose(page, 'mining initiative', 'Mining Initiative');
    await panel(page).getByRole('button', { name: 'Starpoint', exact: true }).click();
    await done(page);
    note(`after Mining ${JSON.stringify(await sums(page))}`);
    await addAction(page, 'Component action');
    await choose(page, 'stall tactics', 'Stall Tactics');
    await takenBlock(page).getByRole('button', { name: '+ Discarded' }).click();
    await choose(page, 'solar flare', 'Solar Flare');
    await usedBlock(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'blackshade', 'Blackshade Infiltrator');
    note('R3 stall mech planets: ' + await usedBlock(page).getByRole('button').evaluateAll(a => a.map(x => x.textContent).join(' | ')));
    await usedBlock(page).getByRole('button', { name: 'Mecatol Rex', exact: true }).click();
    note('R3 stall: ' + await codes(panel(page)));
    await shot(page, '45-stall2');
    await done(page);
    await tile(page, 112).click();
    note('112 stage: ' + await stage(page).locator('[aria-label]').evaluateAll(a => a.map(x => x.getAttribute('aria-label')).filter(Boolean).join(' | ')).then(t => t.slice(0, 500)));
    await stage(page).getByRole('button', { name: 'Close' }).click();
  });

  await attempt('R3 technologies by hand in the drawer: Gravity Drive, Sarween Tools, Plasma Scoring', async () => {
    await openDrawer(/^Technologies/);
    for (const [q, n] of [['gravity drive', 'Gravity Drive'], ['sarween', 'Sarween Tools'], ['plasma scoring', 'Plasma Scoring']] as const) {
      await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill(q);
      await drawer(page).getByRole('group', { name: 'Search results' }).getByRole('button', { name: `Add ${n}` }).first().click();
      await page.waitForTimeout(300);
    }
    await drawer(page).getByRole('searchbox', { name: 'Search components' }).fill('');
    await page.waitForTimeout(400);
    note('R3 techs: ' + await flat(drawer(page), 'Researched', 1100));
    await shot(page, '46-techs');
    await closeDrawer();
  });
  await attempt('R3 pass, status: tokens, Corner the Market with 2 of 4 industrial planets, cards', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Fleet' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'corner the market', 'Corner the Market');
    await panel(page).getByRole('button', { name: 'Add one Yssaril' }).click();
    note('R3 status: ' + await flat(panel(page), 'STATUS', 1800) + ' // ' + await codes(panel(page)));
    await shot(page, '47-status3');
    const taken = takenBlock(page);
    for (const [q, n] of [['blitz', 'Blitz'], ['counterstroke', 'Counterstroke'], ['hack election', 'Hack Election']] as const) { await taken.getByRole('button', { name: '+ Action card' }).or(taken.getByRole('button', { name: '+ Took' })).first().click(); await choose(page, q, n); }
    note(`after R3 status ${JSON.stringify(await sums(page))}`);
  });

  await attempt('R3 agenda: Mecatol Rex is mine; a law is voted', async () => {
    await page.getByRole('region', { name: 'Agenda' }).getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'fleet regulations', 'Fleet Regulations');
    note('R3 agenda: ' + await flat(panel(page), '', 1200) + ' // ' + await codes(panel(page)));
    await shot(page, '48-agenda');
    await done(page);
    await openDrawer(/^Objectives/);
    note('laws: ' + await flat(drawer(page), '', 1200));
    await closeDrawer();
    note(`end of R3 ${JSON.stringify(await sums(page))}`);
  });
  await attempt('twist 1: change the purchase of round 1 (carrier + mech short by 2): the warning goes, later rounds recompute', async () => {
    await page.getByRole('button', { name: 'Round 1', exact: true }).click();
    const list = page.getByRole('region', { name: 'Actions' });
    note('R1 list: ' + await flat(list, '', 1800));
    expect(await standingLine(list, 'shortResources').count()).toBeGreaterThan(0);
    await entries(page).filter({ hasText: 'Tactical action · Retillion' }).first().click();
    await page.getByRole('button', { name: /^Edit: Tactical action · Retillion/ }).first().click();
    note('R1 E4 reopened: ' + await flat(panel(page), '', 600));
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    await stage(page).getByRole('button', { name: /^Give back Carrier/ }).first().click();
    await stage(page).getByRole('button', { name: 'Close' }).click();
    note('R1 E4 after change: ' + await flat(panel(page), 'Production', 500) + ' // ' + await codes(panel(page)));
    await shot(page, '49-twist1');
    await done(page);
    note('R1 warnings after twist: ' + await codes(list));
  });
  await attempt('twist 2: delete the first move of round 1 (New Albion / Starpoint): later rounds warn; Undo brings everything back', async () => {
    const list = page.getByRole('region', { name: 'Actions' });
    const missing = list.locator('li[data-code="unitsMissing"], li[data-code="landingOverLimit"], li[data-code="placeNotControlled"], li[data-code="planetExhausted"], li[data-code="prerequisitesMissing"], li[data-code="shortResources"]');
    const base = [] as number[];
    for (const r of [1, 2, 3]) { await page.getByRole('button', { name: `Round ${r}`, exact: true }).click(); await page.waitForTimeout(300); base.push(await missing.count()); }
    note('missing-ish warnings per round before: ' + base.join(','));
    await page.getByRole('button', { name: 'Round 1', exact: true }).click();
    await page.getByRole('listitem', { name: /^Tactical action · New Albion/ }).getByRole('button', { name: 'Delete' }).click();
    await page.waitForTimeout(600);
    const after = [] as number[];
    const kinds: string[] = [];
    for (const r of [1, 2, 3]) { await page.getByRole('button', { name: `Round ${r}`, exact: true }).click(); await page.waitForTimeout(400); after.push(await missing.count()); kinds.push(r + ':' + await codes(list)); }
    note('after delete: ' + after.join(',') + ' // ' + kinds.join(' ## '));
    await shot(page, '50-after-delete');
    expect(after.reduce((a, b) => a + b, 0)).toBeGreaterThan(base.reduce((a, b) => a + b, 0));
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await page.waitForTimeout(600);
    const back = [] as number[];
    for (const r of [1, 2, 3]) { await page.getByRole('button', { name: `Round ${r}`, exact: true }).click(); await page.waitForTimeout(300); back.push(await missing.count()); }
    note('after undo: ' + back.join(','));
    expect(back).toEqual(base);
    note(`R3 sums after undo ${JSON.stringify(await sums(page))}`);
  });
  await attempt('twist 3: in round 2 drag the Sol tactical action above the Sol pass: actionAfterPass goes away', async () => {
    await page.getByRole('button', { name: 'Round 2', exact: true }).click();
    const list = page.getByRole('region', { name: 'Actions' });
    const rows = list.getByRole('listitem');
    const names = async () => (await entries(page).evaluateAll(a => a.map(x => (x as HTMLElement).innerText.split('\n').slice(0, 2).join(' ')))).join(' > ');
    note('R2 order before: ' + await names());
    const afterPass = list.locator('li[data-code="actionAfterPass"]:not(.warning-waived)');
    expect(await afterPass.count()).toBe(1);
    const dragRow = async (fromIndex: number, toIndex: number) => {
      const handle = rows.nth(fromIndex).getByRole('button', { name: 'Drag to move' });
      const to = (await rows.nth(toIndex).boundingBox())!;
      const from = (await handle.boundingBox())!;
      await handle.hover();
      await page.mouse.down();
      await page.waitForTimeout(100);
      await page.mouse.move(from.x + from.width / 2, from.y + (to.y - from.y) / 2, { steps: 10 });
      await page.mouse.move(from.x + from.width / 2, to.y + to.height / 2 + (toIndex > fromIndex ? 30 : -30), { steps: 20 });
      await page.mouse.up();
      await page.waitForTimeout(700);
    };
    const dragBy = async (index: number, dy: number) => {
      const h = (await rows.nth(index).getByRole('button', { name: 'Drag to move' }).boundingBox())!;
      await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
      await page.mouse.down();
      await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2 + dy / 2, { steps: 10 });
      await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2 + dy, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(700);
    };
    void dragRow;
    const rowBox = (await rows.nth(5).boundingBox())!;
    note('row5 box ' + JSON.stringify(rowBox) + ' row4 ' + JSON.stringify(await rows.nth(4).boundingBox()));
    await dragBy(5, -(rowBox.height * 0.8));
    note('R2 order after: ' + await names());
    await shot(page, '51-reordered');
    expect(await afterPass.count()).toBe(0);
  });
  note('PROBLEMS ' + JSON.stringify(problems));
  note('ERRORS ' + JSON.stringify(errors));
});
