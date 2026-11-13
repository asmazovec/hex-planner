import { expect, test, type Page } from '@playwright/test';

/**
 * What a played component asks to choose, and the header of the plan: a long list of candidates wraps inside the plan
 * panel (or goes through the component picker), and the plan tabs never run under the round buttons.
 */

const MAP = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';
const LINK = `/?name=ChoicesLayout&map=${MAP.split(' ').join('+')}&factions=argent,sol,hacan,letnev,saar,muaat&me=1&exp=pok,te`;

const panel = (page: Page) => page.locator('.plan-panel');
const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose a component' });

async function playComponent(page: Page, query: string, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.locator('.action-list').getByRole('button', { name: 'Component action', exact: true }).click();
  await picker(page).getByRole('searchbox', { name: 'Search components' }).fill(query);
  await picker(page).getByRole('button', { name: `Choose ${name}` }).click();
  await expect(picker(page)).toHaveCount(0);
}

/** The panel does not scroll sideways, and nothing of the choices block stands beyond its edge. */
async function expectFitsPanel(page: Page): Promise<void> {
  const fit = await page.locator('.plan-scroll').evaluate(el => {
    const edge = el.getBoundingClientRect().right;
    const beyond = [...el.querySelectorAll('.choices-block button')].filter(b => b.getBoundingClientRect().right > edge + 1).length;
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, beyond };
  });
  expect(fit.scrollWidth).toBe(fit.clientWidth);
  expect(fit.beyond).toBe(0);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto(LINK);
  await page.getByRole('button', { name: 'Plan & map' }).click();
});

test('a planet choice of many planets wraps inside the panel', async ({ page }) => {
  await playComponent(page, 'nano-forge', 'Nano-Forge');
  const planets = panel(page).getByRole('group', { name: 'Planet' }).getByRole('button');
  expect(await planets.count()).toBeGreaterThan(12);
  await expectFitsPanel(page);
  await planets.last().click();
  await expectFitsPanel(page);
  await expect(panel(page).getByRole('button', { name: 'Done' })).toBeVisible();
});

test('a choice of a technology goes through the component picker', async ({ page }) => {
  await playComponent(page, 'focused research', 'Focused Research');
  const group = panel(page).locator('.choice-many');
  await expect(group.getByRole('button')).toHaveCount(1);
  await expectFitsPanel(page);
  await group.getByRole('button').click();
  await picker(page).getByRole('searchbox', { name: 'Search components' }).fill('plasma scoring');
  await picker(page).getByRole('button', { name: 'Choose Plasma Scoring' }).click();
  await expect(group.getByText('Plasma Scoring').first()).toBeVisible();
  await expectFitsPanel(page);
});

test('with two plans and many rounds the plan tabs do not run under the round buttons', async ({ page }) => {
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  for (let i = 0; i < 5; i += 1) await page.getByRole('button', { name: 'Add round' }).click();
  const state = await page.evaluate(() => {
    const list = document.querySelector('.plan-tabs')!;
    const tabs = list.getBoundingClientRect();
    const rounds = document.querySelector('.plan-rounds-group')!.getBoundingClientRect();
    const copy = document.querySelector('.plan-copy')!.getBoundingClientRect();
    return {
      copyBeyondTabs: copy.left < tabs.left - 1 || copy.right > tabs.right + 1,
      sideBySide: tabs.right > rounds.left + 1 && tabs.left < rounds.right - 1 && tabs.bottom > rounds.top + 1 && tabs.top < rounds.bottom - 1,
    };
  });
  expect(state.sideBySide).toBe(false);
  expect(state.copyBeyondTabs).toBe(false);
});
