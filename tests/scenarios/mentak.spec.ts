import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * One long game as The Mentak Coalition (seat 1 of 7), played through the interface. Expansions: Prophecy of Kings,
 * without Thunder's Edge. The map is a Milty string of 60 tokens: the seven home systems (2 Mentak, 1 Sol, 16 Hacan,
 * 10 Letnev, 56 Empyrean, 55 Titans, 14 Xxcha) and the hyperlanes of the 7-player layout place themselves.
 *
 * Layout of what is near the Mentak home (tile 2 at the top, seat 1): 26 Lodor (3/1) below it, then 19 Wellon (1/2),
 * 67 Cormund (2/0, gravity rift) and the centre 18; 59 Archon Vail (1/3) to its right and 25 Quann (2/1) below that;
 * 27 New Albion (1/1) + Starpoint (3/1) to its left; 20 Vefut II (2/2); 66 Hope's End (3/0, legendary).
 */
const MAP = '67 39 22 23 24 40 19 66 28 29 30 31 0 32 33 34 35 21 26 25 36 37 38 42 43 44 0 45 0 46 47 48 49 50 60 20 2 59 41 1 61 62 16 63 64 10 65 0 0 0 68 56 69 70 55 71 72 14 73 27';
const RIVALS = ['The Federation of Sol', 'The Emirates of Hacan', 'The Barony of Letnev', 'The Empyrean', 'The Titans of Ul', 'The Xxcha Kingdom'];
const SHOTS = 'test-results/scenarios/mentak';

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');
const entry = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });

const errors: string[] = [];

/** The text of the plan panel in one line, for the log. */
const dump = async (page: Page) => (await page.locator('.plan-panel').innerText()).split(String.fromCharCode(10)).filter(Boolean).join(' / ').slice(0, 1500);

/** The number a top summary shows; with a change («3 → 2») the number after the arrow. */
async function sum(page: Page, name: string, which: 'first' | 'last' = 'last'): Promise<number> {
  const text = (await page.getByRole('group', { name, exact: true }).first().innerText()).replace(/\s+/g, ' ');
  const nums = text.match(/-?\d+/g);
  return Number(which === 'first' ? nums![0] : nums![nums!.length - 1]);
}
async function sums(page: Page, which: 'first' | 'last' = 'last'): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const n of ['Resources', 'Influence', 'Trade goods', 'Commodities', 'Tactic', 'Fleet', 'Strategy', 'VP']) out[n] = await sum(page, n, which);
  return out;
}
const mode = (page: Page, name: 'Forecast' | 'Now') => page.getByRole('button', { name, exact: true }).click();

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

async function still(target: Locator): Promise<void> {
  let last = '';
  for (let i = 0; i < 40; i += 1) {
    const now = JSON.stringify(await target.boundingBox());
    if (now === last) return;
    last = now;
    await target.page().waitForTimeout(150);
  }
}
async function tapTile(page: Page, n: number): Promise<void> {
  await still(tile(page, n));
  await tile(page, n).click();
}

async function addAction(page: Page, type: string): Promise<void> {
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.locator('.action-list').getByRole('button', { name: type, exact: true }).click();
}

async function choose(page: Page, query: string, name: string, _unused?: string): Promise<void> {
  await picker(page).getByRole('searchbox', { name: 'Search components' }).fill(query);
  await picker(page).getByRole('button', { name: `Choose ${name}` }).first().click();
  await expect(picker(page)).toHaveCount(0);
}

async function done(page: Page): Promise<void> {
  await panel(page).getByRole('button', { name: 'Done', exact: true }).click();
}

async function openDrawer(page: Page, group?: RegExp): Promise<void> {
  if (!(await drawer(page).isVisible())) await page.getByRole('button', { name: /^Components/ }).click();
  await expect(drawer(page)).toBeVisible();
  await page.waitForTimeout(500);
  // The group left open last time opens again; pressing it would fold the fan.
  if (group && (await groupTab(page, group).getAttribute('aria-pressed')) !== 'true') await groupTab(page, group).click();
}
async function closeDrawer(page: Page): Promise<void> {
  if (await drawer(page).isVisible()) {
    // The open group is the first tab of the fan, at the height of the stack: pressing it folds the fan and closes the sheet.
    await still(page.locator('.tab-fan > button[aria-pressed=true]').first());
    const box = (await page.locator('.tab-fan > button[aria-pressed=true]').first().boundingBox())!;
    await page.mouse.click(box.x + 17, box.y + 60);
    await expect(drawer(page)).toHaveCount(0);
  }
}

const take = (scope: Locator, unit: string) => scope.getByRole('button', { name: `Take one ${unit}` }).first().click();

test.describe.configure({ mode: 'serial' });

test('Mentak, seven players, three rounds', async ({ page }) => {
  test.setTimeout(Number(process.env.T ?? 280_000));
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  const noErrors = () => expect(errors, errors.join('\n')).toEqual([]);

  await test.step('first screen: Mentak, six opponents, Prophecy of Kings without Thunder\'s Edge, the map pasted', async () => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: "Thunder's Edge" }).click();
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'My faction', exact: true }).click();
    // With Thunder's Edge off its factions are not offered.
    await expect(page.getByRole('button', { name: 'The Firmament' })).toHaveCount(0);
    await page.getByRole('button', { name: 'The Mentak Coalition' }).click();
    await page.getByRole('button', { name: '＋ Add opponent' }).click();
    for (let i = 0; i < RIVALS.length; i += 1) {
      await page.getByRole('button', { name: 'Opponent', exact: true }).nth(i).click();
      await page.getByRole('button', { name: RIVALS[i] }).click();
    }
    await expect(page.getByRole('heading', { name: 'Players' })).toBeVisible();
    await expect(page.getByText('7 of 8')).toBeVisible();
    // The sheet of my faction: home, start units, technologies, abilities.
    const sheet = await page.locator('body').innerText();
    for (const text of ['Moll Primus', 'Plasma Scoring', 'Sarween Tools', 'Ambush', 'Pillage', 'Mirror Computing', 'Salvage Operations', 'Suffi An', "S'ula Mentarion", 'Ipswitch, Loose Cannon', 'Fourth Moon', 'Moll Terminus']) {
      expect(sheet, `the sheet of Mentak names ${text}`).toContain(text);
    }
    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP);
    await page.getByRole('button', { name: 'Apply' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('textbox', { name: 'Game name' }).fill('Mentak long game');
    await shot(page, '01-game-screen');
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 2)).toBeVisible();
    await noErrors();
  });

  await test.step('the start: 4 resources, 1 influence, 3/3/2 tokens', async () => {
    expect(await sums(page)).toEqual({ Resources: 4, Influence: 1, 'Trade goods': 0, Commodities: 0, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 });
    await expect(tile(page, 2).getByRole('img', { name: 'Carrier ×1' })).toBeVisible();
    await expect(tile(page, 2).getByRole('img', { name: 'Cruiser ×2' })).toBeVisible();
    await expect(tile(page, 2).getByRole('img', { name: 'Fighter ×3' })).toBeVisible();
    await expect(tile(page, 2).getByRole('img', { name: 'Infantry ×4' })).toBeVisible();
    await expect(tile(page, 2).getByRole('img', { name: 'Space dock' })).toBeVisible();
    await shot(page, '02-start');
  });

  await test.step('round 1: the strategy card Technology, researched with prerequisites (Scanlink free, Predictive Intelligence for 6)', async () => {
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    await addAction(page, 'Strategy');
    await expect(page.getByRole('button', { name: '7 Technology' })).toHaveAttribute('aria-pressed', 'true');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'Scanlink', 'Scanlink Drone Network');
    console.log('R1 tech1', await dump(page));
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'Predictive', 'Predictive Intelligence');
    console.log('R1 tech2', await dump(page));
    console.log(JSON.stringify(await sums(page)));
    await shot(page, '03-technology-card');
  });

  await test.step('round 1: the second technology cannot be paid: the shortage is warned in its block', async () => {
    await expect(panel(page).getByText(/short by 2/)).toBeVisible();
    // Exhausting Moll Primus takes both its resources and its influence out of the pool.
    expect(await sums(page)).toMatchObject({ Resources: 0, Influence: 0 });
    await done(page);
    console.log('ENTRIES', JSON.stringify(await page.getByRole('region', { name: 'Actions' }).locator('.entry').allInnerTexts()));
  });

  await test.step('round 1: tactical action 1, the fleet flies to Lodor with infantry and lands (a planet taken comes exhausted, LRR 25.1)', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 26);
    await tapTile(page, 2);
    await tapTile(page, 26);
    for (const u of ['Carrier', 'Cruiser', 'Cruiser', 'Fighter', 'Fighter', 'Infantry', 'Infantry']) await take(panel(page), u);
    await expect(panel(page).getByRole('heading', { name: 'Cargo on board: 4 of 4' })).toBeVisible();
    await page.getByRole('button', { name: 'Fly' }).click();
    console.log('R1 tac1', await dump(page));
    await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    console.log('R1 tac1 landed', await dump(page));
    console.log(JSON.stringify(await sums(page)));
    // BUG: the start infantry stand in the space area of the home system, so leaving with the carrier and only part of them warns 'over capacity: 2 of 0' for a play that is legal at the table (infantry begin on the planet).
    await expect(panel(page).getByText('System Moll Primus is over capacity: 2 of 0.').first()).toBeVisible();
    await shot(page, '04-tactical-1');
    await done(page);
    expect(await sum(page, 'Tactic')).toBe(2);
    await noErrors();
  });

  await test.step('round 1: tactical action 2 on the home system: a purchase over the production limit, the fleet pool and the resources, all only warned', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 2);
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = page.getByRole('dialog').last();
    for (let i = 0; i < 4; i += 1) await shop.getByRole('button', { name: 'Destroyer', exact: true }).click();
    for (let i = 0; i < 3; i += 1) await shop.getByRole('button', { name: 'Infantry', exact: true }).click();
    console.log('R1 shop', (await shop.innerText()).split(String.fromCharCode(10)).join(' / '));
    // BUG: the head says 'Cost 6' while the shortage names 5 (Sarween Tools took 1 off): the discount is nowhere shown.
    await expect(shop.getByText('Not enough resources: need 5, paid 0, short by 5.')).toBeVisible();
    await expect(shop.getByText(/^6$/).first()).toBeVisible();
    await shot(page, '05-shop-over-limits');
    await shop.getByRole('button', { name: 'Close' }).click();
    console.log('R1 tac2', await dump(page));
    console.log(JSON.stringify(await sums(page)));
  });

  await test.step('round 1: a transaction with Sol: the note given, trade goods asked of a rival that has none are warned', async () => {
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button').first().click();
    for (let i = 0; i < 3; i += 1) await panel(page).getByRole('button', { name: 'Add one Trade goods' }).nth(1).click();
    await panel(page).getByRole('button', { name: '+ Component' }).first().click();
    await choose(page, 'Promise of Protection', 'Promise of Protection');
    await expect(panel(page).getByText(/Not enough trade goods: need 3, have 0/)).toBeVisible();
    for (let i = 0; i < 3; i += 1) await panel(page).getByRole('button', { name: 'Remove one Trade goods' }).nth(1).click();
    await expect(panel(page).getByText(/Not enough trade goods/)).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Back', exact: true }).click();
    await expect(panel(page).getByRole('button', { name: /^\+ Transaction with Sol/ })).toBeVisible();
    await shot(page, '06-transaction');
  });

  await test.step('round 1: eight action cards taken in the turn (the hand limit of 7 is only a warning)', async () => {
    const cards: [string, string][] = [['Mining Initiative', 'Mining Initiative'], ['War Effort', 'War Effort'], ['Industrial Initiative', 'Industrial Initiative'], ['Upgrade', 'Upgrade'], ['Summit', 'Summit'], ['Sabotage', 'Sabotage'], ['Plagiarize', 'Plagiarize'], ['Rally', 'Rally']];
    for (const [q, n] of cards) {
      await panel(page).getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
        await shot(page, '07-took-cards');
    await done(page);
  });

  await test.step('round 1: the status phase: two tokens, an action card from the deck, a public objective scored for a point', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await expect(panel(page).getByText('Distribute tokens: 2 left')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Fleet' }).click();
    await expect(panel(page).getByText(/Distribute tokens: 0 left|All tokens/)).toBeVisible();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();

    await choose(page, 'Develop Weaponry', 'Develop Weaponry');
    await panel(page).getByRole('button', { name: 'Add one Mentak' }).click();
    console.log(JSON.stringify(await sums(page)));
    await page.getByRole('button', { name: 'Tokens and points' }).last().click();
    await shot(page, '08-round1-planned');
  });

  await test.step('round 1: Now counts only what is done; marking the entries done brings it to the forecast', async () => {
    await mode(page, 'Forecast');
    const before = await sums(page);
    expect(before).toEqual({ Resources: 7, Influence: 2, 'Trade goods': 0, Commodities: 0, Tactic: 2, Fleet: 4, Strategy: 2, VP: 1 });
    await mode(page, 'Now');
    await shot(page, '08b-now');
    // BUG: in Now the cell of a changing value is clipped: the number sits in a box of zero width, the picture shows '4 → ˈ'.
    expect(await page.getByRole('group', { name: 'Resources', exact: true }).evaluate(el => [...el.querySelectorAll('b')].map(b => b.clientWidth))).toEqual([0]);
    expect(await sums(page, 'first')).toEqual({ Resources: 4, Influence: 1, 'Trade goods': 0, Commodities: 0, Tactic: 3, Fleet: 3, Strategy: 2, VP: 0 });
    const boxes = page.getByRole('checkbox', { name: 'Done' });
    const count = await boxes.count();
    console.log('R1 done boxes', count);
    for (let i = 0; i < count; i += 1) await boxes.nth(i).check();
    expect(await sums(page, 'first')).toEqual(before);
    await mode(page, 'Forecast');
    await shot(page, '09-round1-done');
    await noErrors();
  });

  await test.step('round 2: a new round, the card Trade as the main one', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '5 Trade' }).click();
    await addAction(page, 'Strategy');
    console.log('R2 trade', await dump(page));
    console.log(JSON.stringify(await sums(page)));
  });

  await test.step('round 2: Trade pays 3 trade goods and refills the commodities; then the secondary of Technology researches Mirror Computing (3 cybernetic prerequisites held)', async () => {
    expect(await sums(page)).toMatchObject({ 'Trade goods': 3, Commodities: 2 });
    await done(page);
    await addAction(page, 'Strategy');
    await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByRole('heading', { name: 'Technology · secondary ability' })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'Mirror', 'Mirror Computing');
    console.log('R2 mc', await dump(page));
    console.log(JSON.stringify(await sums(page)));
    await shot(page, '10-mirror-computing');
  });

  await test.step('round 2: Mirror Computing doubles trade goods in payment; Sarween Tools takes 1 off the production', async () => {
    await done(page);
    await addAction(page, 'Tactical action');
    await tapTile(page, 2);
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = page.getByRole('dialog').last();
    await shop.getByRole('button', { name: 'Flagship', exact: true }).click();
    await shop.getByRole('button', { name: 'Mech', exact: true }).click();
    console.log('R2 shop', (await shop.innerText()).split(String.fromCharCode(10)).join(' / ').slice(0, 700));
    await shop.getByRole('button', { name: 'Close' }).click();
    console.log('R2 prod', (await dump(page)).slice(300));
    await panel(page).getByRole('button', { name: 'Choose manually' }).click();
    console.log('R2 pay', await dump(page));
    console.log('R2 paybtn', JSON.stringify(await page.getByRole('dialog').last().getByRole('button').evaluateAll(a => a.map(x => x.getAttribute('aria-label') || x.textContent)).catch(() => 'nodlg')));
    await shot(page, '11-payment');
  });

  await test.step('round 2: the leaders: agent, commander and hero used in the turn', async () => {
    await panel(page).getByRole('button', { name: '+ Used' }).click();
    await choose(page, 'Suffi An', 'Suffi An');
    console.log('R2 agentused', (await dump(page)).slice(-900));
    await openDrawer(page, /^Faction/);
    for (const id of ['mentakagent', 'mentakcommander', 'mentakhero']) {
      console.log('R2 seg', id, JSON.stringify(await drawer(page).getByTestId(`component-leader:${id}`).locator('.segment > button').evaluateAll(a => a.map(x => x.textContent + ':' + x.getAttribute('aria-pressed')))));
    }
    const warns = async () => JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + ':' + x.textContent + (x.classList.contains('warning-waived') ? '[waived]' : ''))));
    // The unlock of the commander and the hero is set by hand at the start of the plan.
    await drawer(page).getByTestId('component-leader:mentakcommander').locator('.segment > button').nth(1).click();
    await drawer(page).getByTestId('component-leader:mentakhero').locator('.segment > button').nth(1).click();
    await closeDrawer(page);
    await expect(drawer(page)).toHaveCount(0);
    console.log('R2 warns before', await warns());
    for (const [q, n] of [['Suffi An', 'Suffi An'], ["S'ula", "S'ula Mentarion"], ['Ipswitch', 'Ipswitch, Loose Cannon'], ['Ipswitch', 'Ipswitch, Loose Cannon']]) {
      await panel(page).getByRole('button', { name: '+ Used' }).click();
      await choose(page, q, n);
      console.log('R2 used', n, await warns());
    }
    console.log('R2 usedcards', JSON.stringify(await panel(page).getByTestId(/component-leader/).evaluateAll(a => a.map(x => x.getAttribute('data-testid') + '|' + x.textContent))));
    await openDrawer(page, /^Faction/);
    for (const id of ['mentakagent', 'mentakcommander', 'mentakhero']) {
      console.log('R2 seg2', id, JSON.stringify(await drawer(page).getByTestId(`component-leader:${id}`).locator('.segment > button').evaluateAll(a => a.map(x => x.textContent + ':' + x.getAttribute('aria-pressed')))));
    }
    await closeDrawer(page);
    await shot(page, '12-leaders');
  });

  await test.step('round 2: a leader used again in a later entry (agent exhausted, hero purged) is warned of; Pillage shows in the transaction', async () => {
    await shot(page, '12-leaders');
    await done(page);
    await addAction(page, 'Pass');
    const warns = async () => JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + ':' + x.textContent + (x.classList.contains('warning-waived') ? '[waived]' : ''))));
    for (const [q, n, k] of [['agent Suffi An', 'Suffi An', ''], ['Ipswitch', 'Ipswitch, Loose Cannon', '']]) {
      await panel(page).getByRole('button', { name: '+ Used' }).click();
      await choose(page, q, n, k);
      // BUG: an agent exhausted and a hero purged earlier in the round are used again in «Used» with no warning (a component action of the hero does warn, componentNotHeld).
      expect(await warns(), `second use of ${n}`).not.toContain('componentNotHeld');
    }
    await panel(page).getByRole('button', { name: '+ Transaction' }).click();
    await panel(page).getByRole('group', { name: 'With whom' }).getByRole('button').nth(1).click();
    await panel(page).getByRole('button', { name: 'Back', exact: true }).click();
    await shot(page, '13-pass-leaders-again');
    console.log('R2 pass shot-state', await warns());
    await done(page);
    await addAction(page, 'Component action');
    await choose(page, 'Ipswitch', 'Ipswitch, Loose Cannon');
    console.log('R2 componentaction hero', await warns());
    await shot(page, '13b-component-action-hero');
    await done(page);
  });

  await test.step('round 2: tactical action 4 to Mecatol Rex through Wellon and the gravity rift, a carrier too slow for it (only warned), a battle with losses, the landing', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 18);
    await tapTile(page, 26);
    await tapTile(page, 19);
    await tapTile(page, 67);
    await tapTile(page, 18);
    console.log('R2 route', await dump(page));
    console.log('R2 routebtn', JSON.stringify(await panel(page).getByRole('button').evaluateAll(a => a.map(x => x.getAttribute('aria-label') || x.textContent!.slice(0, 40)))));
    for (const u of ['Carrier', 'Cruiser', 'Cruiser', 'Fighter', 'Fighter', 'Infantry', 'Infantry']) await take(panel(page), u);
    await page.getByRole('button', { name: 'Fly' }).click();
    console.log('R2 flown', (await dump(page)).slice(0, 1400));
    await panel(page).getByRole('button', { name: /^Battle/ }).click();
    const battle = page.getByRole('dialog').last();
    console.log('R2 battle', (await battle.innerText()).split(String.fromCharCode(10)).join(' / ').slice(0, 900));
    console.log('R2 battlebtn', JSON.stringify(await battle.getByRole('button').evaluateAll(a => a.map(x => x.getAttribute('aria-label') || x.textContent!.slice(0, 40)))));
    await battle.getByRole('button', { name: 'Fighter ×2' }).click();
    await battle.getByRole('button', { name: 'Infantry ×2' }).click();
    console.log('R2 battle2', (await battle.innerText()).split(String.fromCharCode(10)).join(' / ').slice(0, 600));
    await shot(page, '15-battle');
    await shot(page, '14-route-to-mecatol');
    await battle.getByRole('button', { name: 'Close' }).click();
    console.log('R2 afterbattle', (await dump(page)).slice(700, 1900));
    await panel(page).getByRole('button', { name: 'Land one Infantry' }).click();
    console.log('R2 landwarns-skip', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + ':' + x.textContent))));
    console.log('R2 landed', JSON.stringify(await sums(page)));
    await expect(panel(page).getByText(/speed 2, and the route takes 3 steps/)).toBeVisible();
    await shot(page, '16-mecatol-landing');
    await done(page);
    await expect(tile(page, 18).getByRole('img', { name: /Infantry/ })).toBeVisible();
  });

  await test.step('round 2: a tactical action with no tactic tokens left (only warned), then the status entry and an agenda: a law that stays in play', async () => {
    expect(await sum(page, 'Tactic')).toBe(0);
    await addAction(page, 'Tactical action');
    await tapTile(page, 19);
    console.log('R2 notoken', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + ':' + x.textContent))), await sum(page, 'Tactic'));
    await done(page);
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Strategy' }).click();
    await panel(page).getByRole('button', { name: '+ Action card' }).click();
    await choose(page, 'Direct Hit', 'Direct Hit');
    await page.getByRole('button', { name: 'Tokens and points' }).last().click();
    const agendas = page.getByRole('region', { name: 'Agenda' });
    await agendas.getByRole('button', { name: '+ Agenda' }).click();
    await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
    await choose(page, 'Minister of Industry', 'Minister of Industry');
    console.log('R2 agenda', (await dump(page)).slice(0, 700));
    await done(page);
    await openDrawer(page, /^Objectives & laws/);
    await expect(drawer(page).getByRole('group', { name: 'Laws' })).toContainText('Minister of Industry');
    await shot(page, '17-laws');
    await closeDrawer(page);
    console.log(JSON.stringify(await sums(page)));
  });

  await test.step('round 3: Technology again: Salvage Operations free, Antimass Deflectors for 6 resources paid by planets', async () => {
    await page.getByRole('button', { name: 'Add round' }).click();
    for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: '7 Technology' }).click();
    const before = await sums(page);
    expect(before).toMatchObject({ Resources: 8, Influence: 8 });
    await addAction(page, 'Strategy');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'Salvage Operations', 'Salvage Operations');
    await panel(page).getByRole('button', { name: 'Research a technology' }).click();
    await choose(page, 'Antimass', 'Antimass Deflectors');
    console.log('R3 tech', (await dump(page)).slice(560, 1300));
    console.log(JSON.stringify(await sums(page)));
    console.log('R3 techwarns', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + ':' + x.textContent))));
    await shot(page, '18-round3-technology');
    await done(page);
  });

  await test.step('round 3: a manual adjustment takes Neural Motivator, Cruiser II (a unit upgrade) and the Codex; the drawer counts them', async () => {
    await addAction(page, 'Manual adjustment');
    for (const [q, n] of [['Neural Motivator', 'Neural Motivator'], ['Cruiser II', 'Cruiser II'], ['The Codex', 'The Codex']]) {
      await panel(page).getByRole('button', { name: '+ Took' }).click();
      await choose(page, q, n);
    }
    console.log('R3 manualwarns', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + ':' + x.textContent))));
    await done(page);
    await openDrawer(page);
    console.log('R3 fan', JSON.stringify(await page.locator('.tab-fan > button').allInnerTexts()));
    await groupTab(page, /^Technologies/).click().catch(() => undefined);
    console.log('R3 techs', (await drawer(page).getByRole('group', { name: 'Researched technologies' }).innerText()).split(String.fromCharCode(10)).join(' / '));
    const unitsText = await drawer(page).innerText();
    // BUG: the unit cards of the drawer list the flagship but not the mech (Moll Terminus).
    expect(/Moll Terminus/.test(unitsText)).toBe(false);
    expect(unitsText).toContain('Fourth Moon');
    await shot(page, '19-technologies');
    await closeDrawer(page);
  });

  await test.step('round 3: Mining Initiative played as a component action on Moll Primus gives 4 trade goods', async () => {
    const tg = await sum(page, 'Trade goods');
    await addAction(page, 'Component action');
    await choose(page, 'Mining Initiative', 'Mining Initiative');
    await panel(page).getByRole('button', { name: 'Moll Primus', exact: true }).click();
    expect(await sum(page, 'Trade goods')).toBe(tg + 4);
    await done(page);
    // The card left the hand: playing it again is warned of.
    await addAction(page, 'Component action');
    await choose(page, 'Mining Initiative', 'Mining Initiative');
    console.log('R3 mining2', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + ':' + x.textContent))));
    await done(page);
  });

  await test.step('round 3: The Codex (a relic action) takes action cards; used a second time it is warned of', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'The Codex', 'The Codex');
    await panel(page).getByRole('button', { name: '+ Took' }).click();
    await choose(page, 'Blitz', 'Blitz');
    console.log('R3 codex', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + ':' + x.textContent))));
    await done(page);
    await addAction(page, 'Component action');
    await choose(page, 'The Codex', 'The Codex');
    console.log('R3 codex2', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + ':' + x.textContent))));
    await done(page);
  });

  await test.step('round 3: War Effort places a cruiser in a system with my ships; Upgrade and Rally ride in «Used»', async () => {
    await addAction(page, 'Component action');
    await choose(page, 'War Effort', 'War Effort');
    const warnsNow = async () => JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + ':' + x.textContent)));
    const cruisersAt = async (n: number) => Number((await tile(page, n).getByRole('img', { name: /^Cruiser ×\d+/ }).getAttribute('aria-label').catch(() => 'Cruiser ×0'))!.replace(/\D/g, ''));
    await panel(page).getByRole('button', { name: 'Wellon', exact: true }).click();
    console.log('R3 wareffort wellon', await warnsNow());
    await panel(page).getByRole('button', { name: 'Mecatol Rex', exact: true }).click();
    console.log('R3 wareffort mecatol', await warnsNow(), 'cruisers at 18:', await cruisersAt(18));
    await shot(page, '20-war-effort');
    await done(page);
  });

  await test.step('round 3: the battle step at Mecatol names the faction components; production of nine fighters goes over the production limit and the supply', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 18);
    const reminders = await panel(page).innerText();
    for (const name of ['Ambush', 'Salvage Operations', "S'ula Mentarion"]) expect(reminders, `the reminders of the tactical action name ${name}`).toContain(name);
    expect(reminders, 'the hero was purged').not.toContain('Ipswitch');
    await done(page);

    await addAction(page, 'Tactical action');
    await tapTile(page, 2);
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = page.getByRole('dialog').last();
    for (let i = 0; i < 9; i += 1) await shop.getByRole('button', { name: 'Fighter', exact: true }).click();
    console.log('R3 shop', (await shop.innerText()).split(String.fromCharCode(10)).join(' / ').slice(80, 900));
    await shot(page, '21-shop-fighters');
    await shop.getByRole('button', { name: 'Close' }).click();
    console.log('R3 prodwarns', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + ':' + x.textContent))));
    console.log(JSON.stringify(await sums(page)));
    await done(page);
  });

  await test.step('round 3: six dreadnoughts bought: the supply holds 5', async () => {
    await addAction(page, 'Tactical action');
    await tapTile(page, 2);
    await panel(page).getByRole('button', { name: /^Production/ }).click();
    const shop = page.getByRole('dialog').last();
    for (let i = 0; i < 6; i += 1) await shop.getByRole('button', { name: 'Dreadnought', exact: true }).click();
    await shop.getByRole('button', { name: 'Close' }).click();
    console.log('R3 supplywarns', JSON.stringify(await panel(page).locator('li[data-code]').evaluateAll(a => a.map(x => x.getAttribute('data-code') + ':' + x.textContent))));
    await done(page);
  });

  await test.step('the promissory note given to Sol stands among his cards, and no more among mine; the Breakthrough row shows without Thunder-s Edge', async () => {
    await openDrawer(page, /^Cards/);
    const mine = await drawer(page).innerText();
    expect(mine).not.toMatch(/Promise of Protection\s+in hand/);
    await drawer(page).getByRole('button', { name: 'Sol', exact: true }).click();
    if ((await groupTab(page, /^Cards/).getAttribute('aria-pressed')) !== 'true') await groupTab(page, /^Cards/).click();
    const sol = await drawer(page).innerText();
    console.log('R3 sol cards', sol.split(String.fromCharCode(10)).join(' / ').slice(0, 900));
    expect(sol).toContain('Promise of Protection');
    const t0 = Date.now();
    await drawer(page).getByRole('group', { name: 'Whose components' }).locator('button').first().evaluate(b => (b as HTMLButtonElement).click());
    await page.evaluate(() => 1);
    console.log('R3 mine switch ms', Date.now() - t0);
    if ((await groupTab(page, /^Faction/).getAttribute('aria-pressed')) !== 'true') await groupTab(page, /^Faction/).click();
    const faction = await drawer(page).innerText();
    // BUG: the Breakthrough row is shown (as «none») although Thunder's Edge is off.
    expect(faction).toContain('Breakthrough');
    await shot(page, '22-sol-cards');
    await closeDrawer(page);
  });

  await test.step('round 3: a pass, the status entry with two tokens and a secret objective, and the entries are counted', async () => {
    await addAction(page, 'Pass');
    await done(page);
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await panel(page).getByRole('button', { name: 'Add one Tactic' }).click();
    await panel(page).getByRole('button', { name: 'Add one Fleet' }).click();
    await panel(page).getByRole('button', { name: 'Add one Mentak' }).click();
    await panel(page).getByRole('button', { name: 'Score an objective' }).click();
    await choose(page, 'Corner the Market', 'Corner the Market');
    await page.getByRole('button', { name: 'Tokens and points' }).last().click();
    await mode(page, 'Forecast');
    console.log('R3 end', JSON.stringify(await sums(page)));
    const entries = await page.locator('.entry').count();
    console.log('R3 entries total (all rounds are listed one at a time)', entries, JSON.stringify(await page.locator('.entry').evaluateAll(a => a.map(x => (x.querySelector('strong, .entry-title, [class*=title]')?.textContent ?? x.textContent ?? '').slice(0, 40)))));
    await shot(page, '23-round3-end');
    await noErrors();
  });

  await test.step('a reload brings the plan back; the Russian interface shows no raw keys', async () => {
    const before = await sums(page);
    await page.reload();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 2)).toBeVisible();
    await mode(page, 'Forecast');
    expect(await sums(page)).toEqual(before);
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    await page.getByRole('radio', { name: 'Русский' }).click();
    await page.getByRole('button', { name: 'План и карта' }).click();
    const text = await page.locator('body').innerText();
    expect(text).not.toMatch(/[a-z]+\.[a-z]+\.[a-zA-Z.]+/);
    await shot(page, '24-russian');
    await noErrors();
  });
});
