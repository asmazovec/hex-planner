import { expect, test, type Page } from '@playwright/test';

/** The editors of the plan panel: what every entry takes and discards, the agenda, the component of an action. */

const MAP = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';
const LINK = `/?name=Editors&map=${MAP.split(' ').join('+')}&factions=argent,sol,hacan,letnev,saar,muaat&me=1&exp=pok,te`;

const panel = (page: Page) => page.locator('.plan-panel');
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Components' });
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });
const groupTab = (page: Page, name: string | RegExp) => page.getByRole('group', { name: 'Drawers' }).getByRole('button', { name });

async function addAction(page: Page, type: string): Promise<void> {
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.locator('.action-list').getByRole('button', { name: type, exact: true }).click();
}

async function choose(page: Page, query: string, name: string): Promise<void> {
  await picker(page).getByRole('searchbox', { name: 'Search components' }).fill(query);
  await picker(page).getByRole('button', { name: `Choose ${name}` }).click();
  await expect(picker(page)).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto(LINK);
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await expect(page.getByRole('button', { name: 'Add action' })).toBeVisible();
});

test('the status entry takes the action card drawn in the phase, and the hand of the components holds it', async ({ page }) => {
  await page.getByRole('button', { name: 'Tokens and points' }).click();
  const taken = panel(page).getByRole('group', { name: 'Taken and discarded' });
  await taken.getByRole('button', { name: '+ Action card' }).click();
  // Only action cards are offered, before any search.
  const kinds = await picker(page).locator('[data-testid^="component-"]').evaluateAll(cards => [...new Set(cards.map(card => card.getAttribute('data-testid')!.split(':')[0]))]);
  expect(kinds).toEqual(['component-actionCard']);
  await choose(page, 'sabotage', 'Sabotage');
  await expect(taken).toContainText('Sabotage');

  await page.getByRole('button', { name: /^Components/ }).click();
  await groupTab(page, /^Cards/).click();
  await expect(drawer(page).getByTestId('component-actionCard:sabo1')).toContainText('Sabotage');
});

test('an agenda of the agenda phase that is a law stands among the laws of the components; a directive does not', async ({ page }) => {
  const agendas = page.getByRole('region', { name: 'Agenda' });
  await agendas.getByRole('button', { name: '+ Agenda' }).click();
  await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
  await choose(page, 'anti-intellectual', 'Anti-Intellectual Revolution');
  await expect(panel(page).getByTestId('component-agenda:revolution')).toContainText('law: stays in play');
  await panel(page).getByRole('button', { name: 'Done' }).click();
  await expect(agendas.getByRole('listitem', { name: 'Agenda: Anti-Intellectual Revolution' })).toBeVisible();

  // The second agenda of the phase is an entry of its own.
  await agendas.getByRole('button', { name: '+ Agenda' }).click();
  await panel(page).getByRole('button', { name: 'Choose the agenda' }).click();
  await choose(page, 'arms reduction', 'Arms Reduction');
  await expect(panel(page).getByTestId('component-agenda:arms_reduction')).toContainText('directive: does not stay in play');
  await panel(page).getByRole('button', { name: 'Done' }).click();

  await page.getByRole('button', { name: /^Components/ }).click();
  await groupTab(page, /^Objectives & laws/).click();
  const laws = drawer(page).getByRole('group', { name: 'Laws' });
  await expect(laws).toContainText('Anti-Intellectual Revolution');
  await expect(laws).not.toContainText('Arms Reduction');
});

test('a card played as a secondary keeps «Taken and discarded», and the hand gets what it took', async ({ page }) => {
  await addAction(page, 'Strategy');
  await expect(panel(page).getByRole('group', { name: 'In this turn' })).toBeVisible();
  // No card of the round is mine, so the card starts as the secondary of another player's.
  await panel(page).getByRole('group', { name: 'Card', exact: true }).getByRole('button', { name: '3 Politics' }).click();
  await expect(panel(page).getByRole('heading', { name: 'Politics · secondary ability' })).toBeVisible();
  const common = panel(page).getByRole('group', { name: 'In this turn' });
  await expect(common.getByRole('group', { name: 'Taken and discarded' })).toBeVisible();
  // The acts of a turn are the active player's.
  await expect(common.getByRole('button', { name: '+ Transaction' })).toHaveCount(0);
  await common.getByRole('button', { name: '+ Took' }).click();
  await choose(page, 'sabotage', 'Sabotage');
  await expect(common).toContainText('Sabotage');
});

test('a pass, a component action and a manual adjustment open with the common part of every editor', async ({ page }) => {
  await addAction(page, 'Pass');
  await expect(panel(page).getByRole('group', { name: 'In this turn' }).getByRole('button', { name: '+ Took' })).toBeVisible();
  await panel(page).getByRole('button', { name: 'Done' }).click();

  // A component action asks for its component first; closed without one, the place of the component is as wide as its block.
  await addAction(page, 'Component action');
  await expect(picker(page)).toBeVisible();
  await page.keyboard.press('Escape');
  const slot = panel(page).getByRole('button', { name: 'Choose the component' });
  const block = panel(page).getByRole('group', { name: 'Component', exact: true });
  const [slotBox, blockBox] = [(await slot.boundingBox())!, (await block.boundingBox())!];
  expect(slotBox.width).toBeGreaterThan(blockBox.width - 30);
  expect((await panel(page).getByRole('textbox', { name: 'Note' }).boundingBox())!.y).toBeGreaterThan(slotBox.y);
  await slot.click();
  await choose(page, 'stellar converter', 'Stellar Converter');
  const card = panel(page).getByTestId('component-relic:stellarconverter');
  await expect(card.getByRole('button', { name: 'Remove Stellar Converter' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Change' })).toBeVisible();
  await expect(panel(page).getByRole('group', { name: 'In this turn' })).toBeVisible();
  await panel(page).getByRole('button', { name: 'Done' }).click();

  await addAction(page, 'Manual adjustment');
  await expect(panel(page).getByRole('group', { name: 'With this entry' }).getByRole('button', { name: '+ Took' })).toBeVisible();
});

test('the headings of the parts of an editor are the size of every section heading', async ({ page }) => {
  const look = (selector: string) => page.locator(selector).first().evaluate(el => {
    const style = getComputedStyle(el);
    return [style.fontSize, style.fontWeight, style.letterSpacing, style.textTransform].join(' ');
  });
  const common = await look('.plan-panel .phase-title');
  await addAction(page, 'Pass');
  expect(await look('.plan-panel .editor-part > .section-title')).toBe(common);
  await panel(page).getByRole('button', { name: 'Done' }).click();
  await addAction(page, 'Strategy');
  for (const title of await page.locator('.plan-panel .editor-part > .section-title').all()) {
    expect(await title.evaluate(el => [getComputedStyle(el).fontSize, getComputedStyle(el).fontWeight].join(' '))).toBe(common.split(' ').slice(0, 2).join(' '));
  }
});

test('the players of a transaction are named in short, as everywhere, and no name is cut', async ({ page }) => {
  await addAction(page, 'Pass');
  await panel(page).getByRole('button', { name: '+ Transaction' }).click();
  const players = panel(page).getByRole('group', { name: 'With whom' }).getByRole('button');
  // Five players stand on one line: each shows its tag, and is named in full for the screen reader.
  await expect(players).toHaveText(['Sol', 'Hac', 'Let', 'Saa', 'Mua']);
  await expect(players.nth(1)).toHaveAccessibleName('Hacan');
  for (const fits of await players.evaluateAll(buttons => buttons.map(b => b.scrollWidth <= b.clientWidth))) expect(fits).toBe(true);
  await panel(page).getByRole('button', { name: 'Back' }).click();
  await expect(panel(page).getByRole('button', { name: /^\+ Transaction with Sol:/ })).toBeVisible();
});
