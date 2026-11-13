import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

/**
 * Sardakk N'orr, a long game in the Russian interface: 6 players, Prophecy of Kings and Thunder's Edge on.
 * Seat 1 is mine (home 13); the map string puts the homes of Hacan 16, Xxcha 14, Crimson Rebellion 118, Muaat 4 and Mahact 52 on seats 2-6.
 */
const MAP = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 13 63 115 16 76 49 14 74 78 118 37 68 4 102 80 52 34 113';
const SHOTS = 'test-results/scenarios/sardakk';
const panel = (page: Page) => page.locator('.plan-panel');
const tile = (page: Page, n: number) => page.getByRole('button', { name: `Тайл ${n}`, exact: true });
const dump = async (page: Page, sel = '.plan-panel') => console.log('BTN: ' + (await page.locator(sel).getByRole('button').evaluateAll(b => b.filter(x => (x as HTMLElement).offsetParent).map(x => (x.getAttribute('aria-label') || x.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) + (x.getAttribute('aria-pressed') ? '[' + x.getAttribute('aria-pressed') + ']' : '')))).join(' | '));
const text = async (page: Page, sel = '.plan-panel') => console.log('TXT: ' + (await page.locator(sel).innerText()).split('\n').join(' / '));

const flat = (o: Record<string, unknown>, p = ''): Record<string, string> => Object.entries(o).reduce((a, [k, v]) => typeof v === 'string' ? { ...a, [p + k]: v } : { ...a, ...flat(v as Record<string, unknown>, p + k + '.') }, {});
const EN = flat(JSON.parse(readFileSync('src/i18n/en.json', 'utf8')));
const RU = flat(JSON.parse(readFileSync('src/i18n/ru.json', 'utf8')));
/** English interface strings that the Russian file renders differently: seeing one on screen is a leak. */
const GAME_NAMES = new Set(['Leadership', 'Diplomacy', 'Politics', 'Construction', 'Trade', 'Warfare', 'Technology', 'Imperial']);
const ENGLISH = Object.keys(EN).filter(k => EN[k] !== RU[k] && EN[k].length > 3 && !EN[k].includes('{{') && !GAME_NAMES.has(EN[k])).map(k => EN[k]);
/** Visible text and labels that equal an English interface string, and Russian counts with a wrong plural form. */
async function leaks(): Promise<string[]> {
  const found = await page.evaluate(english => {
    const set = new Set(english);
    const hits: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      if (!el || !(el as HTMLElement).offsetParent) continue;
      const t = (n.textContent ?? '').trim();
      if (set.has(t)) hits.push('text: ' + t);
    }
    for (const el of document.querySelectorAll('[aria-label],[title],[placeholder]')) {
      for (const a of ['aria-label', 'title', 'placeholder']) { const v = el.getAttribute(a)?.trim(); if (v && set.has(v)) hits.push(a + ': ' + v); }
    }
    return hits;
  }, ENGLISH);
  const body = await page.locator('body').innerText();
  const plural = body.match(/(?<![\d.,])1 (жетонов|жетона|карт|юнитов|планет|кораблей|очков)(?![а-я])|(?<![\d.,])[2-4] (жетонов|карт|юнитов|кораблей)(?![а-я])|(?<![\d.,])(0|[5-9]) (жетона|жетон|карты|юнита)(?![а-я])/g) ?? [];
  return [...new Set([...found, ...plural.map(p => 'plural: ' + p)])];
}

test.describe.configure({ mode: 'serial' });
let page: Page;
const errors: string[] = [];

test.beforeAll(async ({ browser }) => {
  page = await (await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, serviceWorkers: 'block' })).newPage();
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'ru'));
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
});

test.afterEach(() => {
  expect(errors, 'ошибки страницы и консоли').toEqual([]);
});

const dialog = (p: Page) => p.getByRole('dialog', { name: 'Выбор компонента' });
async function choose(query: string, name: string): Promise<void> {
  await dialog(page).getByRole('searchbox', { name: 'Поиск компонентов' }).fill(query);
  await dialog(page).getByRole('button', { name: 'Выбрать: ' + name, exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
}
async function tapTile(n: number): Promise<void> {
  let last = '';
  await expect.poll(async () => { const now = JSON.stringify(await tile(page, n).boundingBox()); const still = now === last; last = now; return still; }, { intervals: [150] }).toBe(true);
  await tile(page, n).click();
}
const add = async (kind: string) => { await page.getByRole('button', { name: 'Новое действие' }).click(); await page.locator('.action-list').getByRole('button', { name: kind, exact: true }).click(); };
const take = async (n: string, k = 1) => { for (let i = 0; i < k; i++) await page.getByRole('button', { name: 'Взять: ' + n }).first().click(); };
const done = () => page.getByRole('button', { name: 'Готово', exact: true }).click();
const standing = () => panel(page).locator('li[data-code]:not(.warning-waived)');
const waived = () => panel(page).locator('li.warning-waived[data-code]');
const stage = () => page.locator('.stage-dialog');
const drawerOf = () => page.getByRole('dialog', { name: 'Компоненты' });
/** The components drawer on one group: the sheet opens on the group it was left on, and a press on the open group's tab closes it. */
async function openComponents(group: RegExp): Promise<void> {
  if (!(await drawerOf().isVisible())) await page.getByRole('button', { name: /^Компоненты/ }).click();
  await expect(drawerOf()).toBeVisible();
  const tab = page.locator('.tab-fan').getByRole('button', { name: group });
  if ((await tab.getAttribute('aria-pressed')) !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(500);
}
async function closeComponents(): Promise<void> {
  if (!(await drawerOf().isVisible())) return;
  await page.locator('.tab-fan').getByRole('button', { pressed: true }).click();
  await expect(drawerOf()).toHaveCount(0);
}
const shot = (name: string) => page.screenshot({ path: `${SHOTS}/${name}.png` });
/** The summary row as {label: text}. */
async function sums(): Promise<Record<string, string>> {
  return page.getByRole('group', { name: /Итоги/ }).evaluate(el => Object.fromEntries([...el.children].map(c => {
    const b = c.querySelector('b')!.cloneNode(true) as HTMLElement;
    b.querySelectorAll('.summary-forecast-leaving').forEach(x => x.remove());
    return [c.getAttribute('aria-label')!, (b.textContent ?? '').replace(/\s+/g, ' ').trim()];
  })));
}
async function expectSums(want: Record<string, string>): Promise<void> {
  await expect.poll(async () => { const got = await sums(); return Object.keys(want).map(k => got[k]); }, { message: 'итоги', timeout: 4000 }).toEqual(Object.values(want));
}

test('setup', async () => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Моя фракция', exact: true }).click();
  await page.getByRole('button', { name: /Sardakk/ }).first().click();
  let i = 0;
  for (const f of [/Emirates of Hacan/, /Xxcha/, /Crimson Rebellion/, /Embers of Muaat/, /Mahact/]) {
    await page.getByRole('button', { name: 'Соперник', exact: true }).nth(i++).click();
    await page.getByRole('button', { name: f }).first().click();
  }
  await page.getByRole('button', { name: 'Вставить строку Milty' }).click();
  await page.getByRole('textbox', { name: /Milty/ }).fill(MAP);
  await page.getByRole('button', { name: /Применить/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Начать партию' }).click();
  await page.getByRole('button', { name: 'План и карта' }).click();
  await page.waitForTimeout(800);
  await expect(tile(page, 13)).toBeVisible();
  await expectSums({ 'Ресурсы': '4', 'Влияние': '1', 'Тактика': '3', 'Флот': '3', 'Стратегия': '2', 'Товары': '0' });
  await shot('r0-start');
});

test('R1', async () => {
  await test.step('Technology card is the main one', async () => {
    const tc = page.getByRole('button', { name: /Technology/ });
    await tc.click(); await tc.click(); await tc.click();
    await expect(page.getByText('Основная: 7 Technology')).toBeVisible();
  });
  await test.step('tactical 1: conquer 110 from home with 2 carriers, cruiser and 5 infantry', async () => {
    await add('Тактическое действие');
    await tapTile(110); await tapTile(13); await tapTile(110);
    await take('Транспортник', 2); await take('Крейсер'); await take('Пехота', 5);
    await expect(page.getByText('ГРУЗ НА БОРТУ: 5 ИЗ 8', { exact: false })).toBeVisible();
    await expect(page.getByText('Резерв флота: 3 из 3')).toBeVisible();
    await page.getByRole('button', { name: 'Лететь' }).click();
    const land = page.getByRole('button', { name: 'Высадить: Пехота' });
    await land.nth(0).click(); await land.nth(0).click(); await land.nth(1).click(); await land.nth(2).click(); await land.nth(2).click();
    expect(await standing().count()).toBe(0);
    await done();
    // A planet is exhausted when control is gained (LRR 25.1): the resources of the round do not grow.
    await expectSums({ 'Ресурсы': '4', 'Влияние': '1', 'Тактика': '3 → 2', 'Флот': '3' });
    await shot('r1-conquest');
  });
  await test.step('Technology primary: Plasma Scoring is free', async () => {
    await add('Стратегия');
    await page.getByRole('button', { name: 'Исследовать технологию' }).click();
    await choose('plasma', 'Plasma Scoring');
    await expect(page.getByText('К оплате: 0')).toBeVisible();
    await expect(page.getByText('Технология: 1')).toBeVisible();
    // The prerequisites of a technology are checked (Duranium Armor needs two red). Gravity Drive needs one blue (technologies.md of the rules corpus),
    // but the data of the app has no prerequisite for it, so a player with no blue technology is not warned.
    await page.getByRole('button', { name: 'Исследовать технологию' }).click();
    await choose('gravity drive', 'Gravity Drive');
    // BUG: the prerequisite of Gravity Drive is missing in the data (src/data/packs/base.json), no warning of requirements
    await expect(panel(page).getByText(/Не хватает требований технологии Gravity Drive/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Убрать: Gravity Drive' }).click();
    await page.getByRole('button', { name: 'Исследовать технологию' }).click();
    await choose('duranium', 'Duranium Armor');
    // The control: Duranium Armor, with one red technology only, is warned of.
    await expect(panel(page).getByText(/Не хватает требований технологии Duranium Armor/)).toHaveCount(1);
    await page.getByRole('button', { name: 'Убрать: Duranium Armor' }).click();
    expect(await standing().count()).toBe(0);
    await done();
    await expectSums({ 'Ресурсы': '4', 'Стратегия': '2' });
  });
  await test.step('Politics secondary: 2 action cards, one strategy token', async () => {
    await add('Стратегия');
    await panel(page).getByRole('group', { name: 'Карта', exact: true }).getByRole('button', { name: /Politics/ }).click();
    await page.getByRole('button', { name: '+ Взял' }).click();
    await choose('mining initiative', 'Mining Initiative');
    await page.getByRole('button', { name: '+ Взял' }).click();
    await choose('industrial initiative', 'Industrial Initiative');
    await done();
    await expectSums({ 'Стратегия': '2 → 1' });
  });
  await test.step("tactical 2 on the home system: two mechs on Tren'lak where the dock is", async () => {
    await add('Тактическое действие');
    await tapTile(13);
    await page.getByRole('button', { name: /Открыть магазин/ }).click();
    await stage().getByRole('button', { name: "Мех, Tren'lak", exact: true }).click();
    await stage().getByRole('button', { name: "Мех, Tren'lak", exact: true }).click();
    await stage().getByRole('button', { name: 'Закрыть' }).click();
    await expect(page.getByText('Стоимость 4, оплачено 4')).toBeVisible();
    expect(await standing().count()).toBe(0);
    await done();
    await expectSums({ 'Ресурсы': '4 → 0', 'Влияние': '1 → 0', 'Тактика': '3 → 1' });
  });
  await test.step('component action: Mining Initiative on Luthien VI gives 3 trade goods', async () => {
    await add('Действие компонента');
    await choose('mining initiative', 'Mining Initiative');
    await page.getByRole('button', { name: 'Luthien VI', exact: true }).click();
    await done();
    await expectSums({ 'Товары': '0 → 3' });
  });
  await test.step('pass', async () => {
    await add('Пас');
    await done();
  });
  await test.step('status: two command tokens, one action card', async () => {
    await page.getByRole('button', { name: 'Жетоны и очки' }).click();
    await page.getByRole('button', { name: 'Добавить: Тактика' }).click();
    await page.getByRole('button', { name: 'Добавить: Флот' }).click();
    await page.getByRole('button', { name: '+ Карта действия' }).click();
    await choose('sabotage', 'Sabotage');
    await expectSums({ 'Тактика': '3 → 2', 'Флот': '3 → 4' });
    await shot('r1-end');
  });
  await test.step('mark done and compare fact with plan', async () => {
    const boxes = panel(page).getByRole('checkbox', { name: 'Выполнено' });
    const n = await boxes.count();
    await page.getByRole('button', { name: 'Факт', exact: true }).click();
    // Nothing done yet: the fact is the start of the round, with no arrows.
    await expectSums({ 'Ресурсы': '4', 'Влияние': '1', 'Товары': '0', 'Тактика': '3', 'Флот': '3', 'Стратегия': '2' });
    for (let i = 0; i < 3; i++) await boxes.nth(i).check();
    await expectSums({ 'Тактика': '2', 'Стратегия': '1' });
    await shot('r1-fact-3');
    for (let i = 3; i < n; i++) await boxes.nth(i).check();
    await expectSums({ 'Ресурсы': '10', 'Влияние': '4', 'Товары': '3', 'Тактика': '2', 'Флот': '4', 'Стратегия': '1' });
    await shot('r1-fact-all');
    await page.getByRole('button', { name: 'План', exact: true }).click();
    await expectSums({ 'Ресурсы': '10', 'Влияние': '4', 'Товары': '3', 'Тактика': '2', 'Флот': '4', 'Стратегия': '1' });
  });
});

test('R2', async () => {
  await page.getByRole('button', { name: 'Добавить раунд' }).click();
  await expectSums({ 'Ресурсы': '10', 'Влияние': '4', 'Товары': '3', 'Тактика': '2', 'Флот': '4', 'Стратегия': '1' });
  await test.step('Leadership main: 3 free tokens', async () => {
    const lc = page.getByRole('button', { name: /Leadership/ });
    await lc.click(); await lc.click(); await lc.click();
    await add('Стратегия');
    await page.getByRole('button', { name: 'Добавить: Тактика' }).click();
    await page.getByRole('button', { name: 'Добавить: Тактика' }).click();
    await page.getByRole('button', { name: 'Добавить: Стратегия' }).click();
    await done();
    await expectSums({ 'Тактика': '2 → 4', 'Стратегия': '1 → 2' });
  });
  await test.step('rival Hacan flies a cruiser next to my home', async () => {
    await panel(page).getByRole('button', { name: 'Hacan', exact: true }).click();
    await add('Тактическое действие');
    await tapTile(63); await tapTile(16); await tapTile(115); await tapTile(63);
    await take('Крейсер');
    await page.getByRole('button', { name: 'Лететь' }).click();
    await done();
    await shot('r2-hacan');
  });
  await test.step('deal with Hacan', async () => {
    await panel(page).getByRole('button', { name: 'Моё', exact: true }).click();
    await add('Тактическое действие');
    await tapTile(66);
    await page.getByRole('button', { name: '+ Сделка' }).click();
    await page.getByRole('group', { name: 'С кем' }).getByRole('button', { name: /Hac/ }).click();
    await page.getByRole('button', { name: '+ Компонент' }).first().click();
    await choose('tekklar', 'Tekklar Legion');
    await page.getByRole('button', { name: '+ Компонент' }).nth(1).click();
    await choose('convoys', 'Trade Convoys');
    await page.getByRole('button', { name: 'Назад', exact: true }).click();
    await tapTile(110); await tapTile(66);
    await take('Транспортник');
    const inf = page.getByRole('button', { name: 'Взять: Пехота' });
    await inf.nth(2).click(); await inf.nth(2).click(); await inf.nth(0).click();
    await expect(page.getByText('ГРУЗ НА БОРТУ: 3 ИЗ 4', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Лететь' }).click();
    const land = page.getByRole('button', { name: 'Высадить: Пехота' });
    for (let i = 0; i < 3; i++) await land.first().click();
    await page.getByRole('button', { name: '+ Использовал' }).click();
    await choose('tro', "T'ro");
    await page.getByRole('button', { name: "Hope's End", exact: true }).last().click();
    expect(await standing().count(), 'нет предупреждений').toBe(0);
    await done();
    await expectSums({ 'Тактика': '2 → 3', 'Стратегия': '1 → 2' });
    await expect(tile(page, 66).getByRole('img', { name: 'Пехота ×5' }).last()).toBeVisible();
    await shot('r2-hopes-end');
  });
  await test.step('production at home: the flagship, 8 of 10 resources; the agent a second time warns', async () => {
    await add('Тактическое действие');
    await tapTile(13);
    await page.getByRole('button', { name: /Открыть магазин/ }).click();
    await stage().getByRole('button', { name: 'Флагман', exact: true }).click();
    await stage().getByRole('button', { name: 'Закрыть' }).click();
    await expect(page.getByText('Стоимость 8, оплачено 8')).toBeVisible();
    await page.getByRole('button', { name: '+ Использовал' }).click();
    await choose('tro', "T'ro");
    await expect(panel(page).getByText("T'ro: компонент истощён и будет готов только в фазе статуса.")).toBeVisible();
    await shot('r2-agent-twice');
    await page.getByRole('button', { name: "Убрать: T'ro" }).click();
    await done();
    await expectSums({ 'Ресурсы': '10 → 2', 'Влияние': '4 → 2', 'Тактика': '2' });
  });
  await test.step('Technology secondary: Magen Defense Grid for a token and 4 resources, paid with trade goods too', async () => {
    await add('Стратегия');
    await panel(page).getByRole('group', { name: 'Карта', exact: true }).getByRole('button', { name: /Technology/ }).click();
    await page.getByRole('button', { name: 'Исследовать технологию' }).click();
    await choose('magen', 'Magen Defense Grid');
    await expect(page.getByText("Horizon 1, Tren'lak 1, Товары 2")).toBeVisible();
    expect(await standing().count()).toBe(0);
    await done();
    await expectSums({ 'Ресурсы': '10 → 0', 'Товары': '3 → 1', 'Стратегия': '1' });
    await shot('r2-magen');
  });
  await test.step('Mining Initiative a second time: the card is not in hand any more', async () => {
    await add('Действие компонента');
    await choose('mining initiative', 'Mining Initiative');
    await page.getByRole('button', { name: 'Horizon', exact: true }).click();
    await expect(panel(page).getByText('Mining Initiative: этого компонента у вас к этому моменту плана нет.')).toBeVisible();
    await shot('r2-mining-twice');
    await page.getByRole('button', { name: 'Убрать действие' }).click();
    await expect(page.getByRole('button', { name: 'Убрать действие' })).toHaveCount(0);
  });
  await test.step('pass, then status: tokens, a card, a public objective paid with tokens', async () => {
    await add('Пас');
    await done();
    await page.getByRole('button', { name: 'Жетоны и очки' }).click();
    await page.getByRole('button', { name: 'Добавить: Тактика' }).first().click();
    await page.getByRole('button', { name: 'Добавить: Тактика' }).first().click();
    await page.getByRole('button', { name: 'Выполнить цель' }).click();
    await choose('lead from the front', 'Lead From the Front');
    await panel(page).getByRole('button', { name: 'Добавить: Тактика' }).nth(1).click();
    await panel(page).getByRole('button', { name: 'Добавить: Тактика' }).nth(1).click();
    await panel(page).getByRole('button', { name: 'Добавить: Стратегия' }).nth(1).click();
    await page.getByRole('button', { name: 'Добавить: Sardakk' }).click();
    await shot('r2-objective');
    // 3 tokens (2 tactic, 1 strategy) are entered as the cost of Lead From the Front (LRR 61.10: "Spend a total of 3 tokens from your tactic and/or strategy pools").
    // BUG: nothing is taken from the pools (publicObjective/lead.ts has only a requirement, no spentOnObjectives): the tactic pool still gains the 2 tokens of the status phase
    // without the 2 spent (2 → 4, should be 2), strategy stays 1 (should be 0). Galvanize the People, Amass Wealth, Golden Age... do take the cost.
    await expectSums({ 'Тактика': '2 → 4', 'Стратегия': '1', 'Очки': '0 → 1' });
    const boxes = panel(page).getByRole('checkbox', { name: 'Выполнено' });
    for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check();
    await expectSums({ 'Ресурсы': '13', 'Влияние': '4', 'Товары': '1', 'Очки': '1' });
  });
});

test('R3', async () => {
  await page.getByRole('button', { name: 'Добавить раунд' }).click();
  await test.step('Technology main card: Valkyrie Particle Weave is free, Antimass Deflectors costs 6', async () => {
    const tc = page.getByRole('button', { name: /Technology/ });
    await tc.click(); await tc.click(); await tc.click();
    await add('Стратегия');
    await page.getByRole('button', { name: 'Исследовать технологию' }).click();
    await choose('valkyrie particle', 'Valkyrie Particle Weave');
    await page.getByRole('button', { name: 'Исследовать технологию' }).click();
    await choose('antimass', 'Antimass Deflectors');
    await expect(page.getByText('К оплате: 6')).toBeVisible();
    expect(await standing().count()).toBe(0);
    await done();
    await expectSums({ 'Ресурсы': '13 → 7' });
  });
  await test.step('tactical: Mecatol Rex from Hopes End with a carrier and 3 infantry', async () => {
    await add('Тактическое действие');
    await tapTile(112); await tapTile(66); await tapTile(112);
    await take('Транспортник'); await take('Пехота', 3);
    await page.getByRole('button', { name: 'Лететь' }).click();
    const land = page.getByRole('button', { name: 'Высадить: Пехота' });
    for (let i = 0; i < 3; i++) await land.first().click();
    // The custodians token (LRR 27.2): the plan cannot record the 6 influence, so the warning stands whatever the player holds.
    const custodians = (await standing().allInnerTexts()).join(' ');
    expect(custodians).toContain('жетон хранителей');
    expect(custodians).toContain('Не хватает влияния: нужно 6, оплачено 0');
    await done();
    await expectSums({ 'Очки': '1 → 2' });
    await expectSums({ 'Тактика': '4 → 3' });
    await expect(tile(page, 112).getByRole('img', { name: 'Пехота ×3' }).last()).toBeVisible();
  });
  await test.step('five planets outside the home systems: the commander is set to unlocked in the drawer', async () => {
    await openComponents(/^Фракция/);
    const commander = page.getByTestId('component-leader:sardakkcommander');
    await commander.getByRole('button', { name: 'Открыт', exact: true }).click();
    await expect(commander.getByRole('button', { name: 'Открыт', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await shot('r3-commander');
    await closeComponents();
  });
  await test.step('commander: one infantry from Hopes End lands on Tarmann with no ship there', async () => {
    await add('Тактическое действие');
    await tapTile(22);
    const fromHope = page.getByRole('button', { name: "Высадить: Пехота с планеты Hope's End" });
    await fromHope.click();
    expect(await standing().count()).toBe(0);
    await expect(waived().filter({ hasText: "Разрешено: G'hom Sek'kus" })).toHaveCount(1);
    await shot('r3-commander-landing');
    await fromHope.click();
    // One ground force from each planet only.
    await expect(standing()).toHaveCount(1);
    await page.getByRole('button', { name: "Вернуть: Пехота, с планеты Hope's End" }).click();
    await expect(standing()).toHaveCount(0);
    await done();
    await expectSums({ 'Тактика': '4 → 2' });
  });
  await test.step('Mining/industrial initiative: Industrial Initiative pays for the industrial Tarmann', async () => {
    await add('Действие компонента');
    await choose('industrial initiative', 'Industrial Initiative');
    await done();
    // One industrial planet under control: Tarmann (Horizon is cultural, the others hazardous).
    await expectSums({ 'Товары': '1 → 2' });
  });
  await test.step('attack on Vorhal: the flagship takes both mechs, the Hacan cruiser stands there', async () => {
    await add('Тактическое действие');
    await tapTile(63); await tapTile(13); await tapTile(63);
    await take('Флагман'); await take('Мех', 2);
    await page.getByRole('button', { name: 'Лететь' }).click();
    await page.getByRole('button', { name: /Начать бой/ }).click();
    await page.waitForTimeout(500);
    await shot('r3-battle');
    await stage().locator('[data-unit="cruiser"]').first().click();
    await stage().getByRole('button', { name: 'Закрыть' }).click();
    const land = page.getByRole('button', { name: 'Высадить: Мех' });
    await land.first().click(); await land.first().click();
    expect(await standing().count()).toBe(0);
    await done();
    await expectSums({ 'Тактика': '4 → 1' });
    // BUG? The loss marked for the Hacan cruiser in the big hex is only a mark of the view: the cruiser still stands on 63 (see findings).
    await expect(tile(page, 63).getByRole('img', { name: /Крейсер ×1/ })).toHaveCount(1);
    await shot('r3-vorhal');
  });
  await test.step('the breakthrough is added in the drawer; after the win it gives one command token by a manual adjustment', async () => {
    await openComponents(/^Фракция/);
    const drawer = drawerOf();
    await drawer.getByRole('searchbox', { name: 'Поиск компонентов' }).fill("n'orr supremacy");
    await page.waitForTimeout(800);
    const addBtn = drawer.getByRole('button', { name: "Добавить: N'orr Supremacy" });
    await shot('x8');
    await addBtn.click();
    await drawer.getByRole('button', { name: 'Очистить поиск' }).click();
    await expect(drawer).toContainText("N'orr Supremacy");
    await shot('r3-breakthrough');
    await closeComponents();
    await add('Ручная правка');
    await panel(page).getByRole('textbox', { name: 'Подпись' }).fill("N'orr Supremacy: жетон за победу");
    await page.getByRole('button', { name: 'Добавить: Тактика' }).click();
    await done();
    await expectSums({ 'Тактика': '4 → 2' });
  });
  await test.step('relic and action cards: Dominus Orb taken, Focused Research taken', async () => {
    await add('Ручная правка');
    await panel(page).getByRole('textbox', { name: 'Подпись' }).fill('Находки');
    await page.getByRole('button', { name: '+ Взял' }).click();
    await choose('dominus orb', 'Dominus Orb');
    await page.getByRole('button', { name: '+ Взял' }).click();
    await choose('focused research', 'Focused Research');
    expect(await standing().count()).toBe(0);
    await done();
  });
  await test.step('Trade secondary replenishes the commodities of Sardakk to 3', async () => {
    await add('Стратегия');
    await panel(page).getByRole('group', { name: 'Карта', exact: true }).getByRole('button', { name: /Trade/ }).click();
    await done();
    await expectSums({ 'Продукция': '0 → 3' });
  });
  await test.step('pass; status: tokens, Expand Borders, a card', async () => {
    await add('Пас');
    await done();
    await page.getByRole('button', { name: 'Жетоны и очки' }).click();
    await page.getByRole('button', { name: 'Добавить: Стратегия' }).first().click();
    await page.getByRole('button', { name: 'Добавить: Стратегия' }).first().click();
    await page.getByRole('button', { name: 'Выполнить цель' }).click();
    await choose('expand borders', 'Expand Borders');
    await page.getByRole('button', { name: 'Добавить: Sardakk' }).click();
    await expect(panel(page).locator('li[data-code="objectiveUnmet"]')).toHaveCount(0);
    await expectSums({ 'Очки': '1 → 3', 'Продукция': '0 → 3', 'Стратегия': '1 → 2' });
  });
  await test.step('the agenda phase: a law is a card of its own entry', async () => {
    await page.getByRole('button', { name: '+ Карта политики' }).click();
    await panel(page).getByRole('button', { name: 'Выбрать карту политики' }).click();
    await choose('anti-intellectual', 'Anti-Intellectual Revolution');
    await expect(panel(page).getByTestId('component-agenda:revolution')).toContainText('закон');
    await done();
    await page.getByRole('button', { name: '+ Карта политики' }).click();
    await panel(page).getByRole('button', { name: 'Выбрать карту политики' }).click();
    await choose('arms reduction', 'Arms Reduction');
    await done();
    await openComponents(/^Цели и законы/);
    const laws = drawerOf().getByRole('group', { name: 'Законы' });
    await expect(laws).toContainText('Anti-Intellectual Revolution');
    await expect(laws).not.toContainText('Arms Reduction');
    await shot('r3-laws');
    await closeComponents();
  });
  await test.step('mark all done; no English string on screen', async () => {
    const boxes = panel(page).getByRole('checkbox', { name: 'Выполнено' });
    for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check();
    expect(await leaks(), 'английский текст или неверное число на экране').toEqual([]);
    await shot('r3-end');
  });
});

test('R4', async () => {
  await page.getByRole('button', { name: 'Добавить раунд' }).click();
  await expectSums({ 'Ресурсы': '15', 'Влияние': '13', 'Товары': '2', 'Продукция': '3', 'Тактика': '2', 'Флот': '4', 'Стратегия': '2', 'Очки': '3' });
  await test.step('Technology main card: Gravity Drive free, Sarween Tools for 6', async () => {
    const tc = page.getByRole('button', { name: /Technology/ });
    await tc.click(); await tc.click(); await tc.click();
    await add('Стратегия');
    await page.getByRole('button', { name: 'Исследовать технологию' }).click();
    await choose('gravity drive', 'Gravity Drive');
    await page.getByRole('button', { name: 'Исследовать технологию' }).click();
    await choose('sarween', 'Sarween Tools');
    await expect(page.getByText('К оплате: 6')).toBeVisible();
    expect(await standing().count()).toBe(0);
    await done();
    await expectSums({ 'Ресурсы': '15 → 9' });
  });
  await test.step('hero used while locked: warned; unlocked in the drawer: the warning is gone', async () => {
    await add('Тактическое действие');
    await tapTile(115); await tapTile(63); await tapTile(115);
    await take('Флагман'); await take('Мех', 2);
    await page.getByRole('button', { name: 'Лететь' }).click();
    await page.getByRole('button', { name: '+ Использовал' }).click();
    await choose('shval', "Sh'val, Harbinger");
    // The hero is still locked: the replay says only that the plan does not hold it at this point.
    await expect(panel(page).getByText("Sh'val, Harbinger: этого компонента у вас к этому моменту плана нет.")).toBeVisible();
    await openComponents(/^Фракция/);
    const hero = page.getByTestId('component-leader:sardakkhero');
    // While an entry uses the hero, all three states of its start are disabled and show the purge the plan made: to unlock it the use must go first.
    await expect(hero.getByRole('button', { name: 'Открыт', exact: true })).toBeDisabled();
    await closeComponents();
    await page.getByRole('button', { name: "Убрать: Sh'val, Harbinger" }).click();
    await openComponents(/^Фракция/);
    await hero.getByRole('button', { name: 'Открыт', exact: true }).click();
    await expect(hero.getByRole('button', { name: 'Открыт', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await closeComponents();
    await page.getByRole('button', { name: '+ Использовал' }).click();
    await choose('shval', "Sh'val, Harbinger");
    await expect(panel(page).getByText("Sh'val, Harbinger: этого компонента")).toHaveCount(0);
    const land = page.getByRole('button', { name: 'Высадить: Мех', exact: true });
    await land.first().click(); await land.first().click();
    expect(await standing().count()).toBe(0);
    await done();
    // The hero returns every ship of the active system to the reinforcements after the landing: the flagship is gone from 115, the mechs stand on Industrex.
    await expect(tile(page, 115).getByRole('img', { name: /Флагман/ })).toHaveCount(0);
    await expect(tile(page, 115).getByRole('img', { name: 'Мех ×2' }).last()).toBeVisible();
    await expectSums({ 'Тактика': '2 → 1', 'Флот': '4' });
    await shot('r4-hero');
  });
  await test.step('the hero is purged in the drawer; a second use is warned of', async () => {
    await openComponents(/^Фракция/);
    await expect(page.getByTestId('component-leader:sardakkhero').getByRole('button', { name: 'Убран', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await shot('r4-hero-purged');
    await closeComponents();
    await add('Тактическое действие');
    await tapTile(115);
    await page.getByRole('button', { name: '+ Использовал' }).click();
    await choose('shval', "Sh'val, Harbinger");
    await expect(panel(page).getByText("Sh'val, Harbinger: этого компонента у вас к этому моменту плана нет.")).toBeVisible();
    await page.getByRole('button', { name: 'Убрать действие' }).click();
  });
  await test.step('N-orr Supremacy after a win: Exotrireme II is taken; its numbers reach the drawer and the shop', async () => {
    await add('Ручная правка');
    await panel(page).getByRole('textbox', { name: 'Подпись' }).fill("N'orr Supremacy: улучшение");
    await page.getByRole('button', { name: '+ Взял' }).click();
    await choose('exotrireme', 'Exotrireme II');
    await done();
    await openComponents(/^Технологии/);
    await shot('r4-exo2');
    const dread = drawerOf().locator('.upgrade-card').filter({ hasText: 'Дредноут' });
    const card = (await dread.first().innerText()).split('\n').join(' | ');
    // Exotrireme II: move 1 → 2, cost 4, capacity 1, from round 4.
    expect(card).toContain('Скорость | 1 → 2');
    expect(card).toContain('с раунда 4');
    await closeComponents();
    await expectSums({ 'Тактика': '2 → 1' });
  });
  await test.step('home: Exotrireme II bought for 4, the agent puts 2 infantry on Tren-lak at the end of the action', async () => {
    await add('Тактическое действие');
    await tapTile(13);
    await page.getByRole('button', { name: /Открыть магазин/ }).click();
    await stage().getByRole('button', { name: 'Дредноут', exact: true }).click();
    await stage().getByRole('button', { name: 'Закрыть' }).click();
    await expect(page.getByText('Стоимость 4, оплачено 4')).toBeVisible();
    await page.getByRole('button', { name: '+ Использовал' }).click();
    await choose('tro', "T'ro");
    await panel(page).getByRole('button', { name: "Tren'lak", exact: true }).last().click();
    expect(await standing().count()).toBe(0);
    await done();
    await expect(tile(page, 13).getByRole('img', { name: 'Дредноут ×1' }).last()).toBeVisible();
    await expect(tile(page, 13).getByRole('img', { name: 'Пехота ×2' }).last()).toBeVisible();
    await expectSums({ 'Тактика': '2 → 0', 'Ресурсы': '15 → 5' });
    await shot('r4-home');
  });
  await test.step('the note given away comes back when Hacan plays it', async () => {
    await panel(page).getByRole('button', { name: 'Hacan', exact: true }).click();
    await add('Действие компонента');
    await choose('tekklar', 'Tekklar Legion');
    await done();
    await panel(page).getByRole('button', { name: 'Моё', exact: true }).click();
    await openComponents(/^Карты/);
    const mine = drawerOf().getByRole('group', { name: 'Мои обязательства' });
    await shot('r4-notes');
    // The text of the note says "Затем верните эту карту игроку N'orr" (LRR 69.3): it should be back in my hand.
    // BUG: playComponent tests the English phrase "then, return this card to" against the translated text, so in Russian the card stays with Hacan.
    await expect(mine).toContainText('Tekklar Legion');
    await expect(mine.getByTestId('component-promissory:tekklar@me')).toContainText('у игрока Hacan');
    await closeComponents();
  });
  await test.step('Focused Research: an action card played as a component action', async () => {
    await add('Ручная правка');
    await panel(page).getByRole('textbox', { name: 'Подпись' }).fill('Товары от продажи');
    await page.getByRole('button', { name: 'Добавить: Товары' }).click();
    await page.getByRole('button', { name: 'Добавить: Товары' }).click();
    await done();
    await add('Действие компонента');
    await choose('focused research', 'Focused Research');
    // The list of technologies to research names one of them by its raw id (technology:iihq): I.I.H.Q. Modernization is replaced by Executive Order with Thunder's Edge.
    await expect(panel(page).getByRole('button', { name: 'technology:iihq', exact: true })).toHaveCount(1);
    await panel(page).getByRole('button', { name: 'Carrier II', exact: true }).click();
    await done();
    await expectSums({ 'Товары': '2 → 0' });
  });
  await test.step('action cards taken, then played as component actions: Frontline Deployment on Mecatol, Fighter Conscription', async () => {
    await add('Ручная правка');
    await panel(page).getByRole('textbox', { name: 'Подпись' }).fill('Карты с Politics');
    await page.getByRole('button', { name: '+ Взял' }).click();
    await choose('frontline deployment', 'Frontline Deployment');
    await page.getByRole('button', { name: '+ Взял' }).click();
    await choose('fighter conscription', 'Fighter Conscription');
    await done();
    await add('Действие компонента');
    await choose('frontline deployment', 'Frontline Deployment');
    await panel(page).getByRole('button', { name: 'Mecatol Rex', exact: true }).click();
    await done();
    // 3 infantry from the reinforcements on a planet in play: 3 landed in round 3, 3 more now.
    await expect(tile(page, 112).getByRole('img', { name: 'Пехота ×6' }).last()).toBeVisible();
    await add('Действие компонента');
    await choose('fighter conscription', 'Fighter Conscription');
    await done();
    await shot('r4-cards');
    await expect(tile(page, 110).getByRole('img', { name: 'Истребитель ×1' }).last()).toBeVisible();
  });
  await test.step('a relic played, an action card named in Used', async () => {
    await add('Действие компонента');
    await choose('dominus orb', 'Dominus Orb');
    await done();
    await openComponents(/^Реликвии/);
    // The text of the relic says it is removed from the game when played ("убрать эту карту из игры", LRR 70): it should be gone.
    // BUG: the same English-only test of the text (PURGES in replay/holdings.ts): in Russian the relic stays in hand after being played.
    await expect(drawerOf().getByRole('group', { name: 'Реликвии' })).toContainText('Dominus Orb');
    await shot('r4-relic');
    await closeComponents();
    await add('Ручная правка');
    await panel(page).getByRole('textbox', { name: 'Подпись' }).fill('Саботаж');
    await page.getByRole('button', { name: '+ Использовал' }).click();
    await choose('sabotage', 'Sabotage');
    expect(await standing().count()).toBe(0);
    await done();
    await openComponents(/^Карты/);
    await expect(drawerOf().getByTestId('component-actionCard:sabo1')).toHaveCount(0);
    await closeComponents();
  });
  await test.step('status: agent ready, Diversify Research scored, tokens, an action card', async () => {
    await page.getByRole('button', { name: 'Жетоны и очки' }).click();
    await page.getByRole('button', { name: 'Добавить: Тактика' }).first().click();
    await page.getByRole('button', { name: 'Добавить: Флот' }).first().click();
    await page.getByRole('button', { name: 'Выполнить цель' }).click();
    await choose('diversify research', 'Diversify Research');
    await page.getByRole('button', { name: 'Добавить: Sardakk' }).click();
    await expect(panel(page).locator('li[data-code="objectiveUnmet"]')).toHaveCount(0);
    await expectSums({ 'Очки': '3 → 4' });
  });
  await test.step('mark all done; the screen has no English interface string and no wrong plural', async () => {
    const boxes = panel(page).getByRole('checkbox', { name: 'Выполнено' });
    for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check();
    await expect(page.getByRole('button', { name: 'Факт', exact: true })).toBeEnabled();
    expect(await leaks(), 'английский текст или неверное число на экране').toEqual([]);
    await shot('r4-end');
  });
  await test.step('the whole plan: 25 or more entries of mine over 4 rounds', async () => {
    let mineCount = 0;
    for (const n of [1, 2, 3, 4]) {
      await page.getByRole('button', { name: `Раунд ${n}`, exact: true }).click();
      mineCount += await panel(page).getByRole('checkbox', { name: 'Выполнено' }).count();
    }
    console.log('ENTRIES TOTAL', mineCount);
    expect(mineCount).toBeGreaterThanOrEqual(25);
    await page.getByRole('button', { name: 'Раунд 4', exact: true }).click();
  });
});

/** The control for the Russian-only failures of the notes and relics: the same moves with the interface in English. */
test('control: in English the note comes back to its owner', async ({ browser }) => {
  const link = `/?name=EnCtl&map=${MAP.split(' ').join('+')}&factions=sardakk,hacan,xxcha,crimson,muaat,mahact&me=1&exp=pok,te`;
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, serviceWorkers: 'block' });
  const en = await ctx.newPage();
  await en.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await en.goto(link);
  await en.getByRole('button', { name: 'Plan & map' }).click();
  const enPanel = en.locator('.plan-panel');
  const enChoose = async (query: string, name: string) => {
    const d = en.getByRole('dialog', { name: 'Choose a component' });
    await d.getByRole('searchbox', { name: 'Search components' }).fill(query);
    await d.getByRole('button', { name: `Choose ${name}`, exact: true }).click();
  };
  await en.getByRole('button', { name: 'Add action' }).click();
  await en.locator('.action-list').getByRole('button', { name: 'Tactical action', exact: true }).click();
  await en.getByRole('button', { name: 'Tile 66', exact: true }).click();
  await en.getByRole('button', { name: '+ Transaction' }).click();
  await en.getByRole('group', { name: 'With whom' }).getByRole('button', { name: 'Hacan' }).click();
  await en.getByRole('button', { name: '+ Component' }).first().click();
  await enChoose('tekklar', 'Tekklar Legion');
  await en.getByRole('button', { name: 'Back', exact: true }).click();
  await en.getByRole('button', { name: 'Done', exact: true }).click();
  await enPanel.getByRole('button', { name: 'Hacan', exact: true }).click();
  await en.getByRole('button', { name: 'Add action' }).click();
  await en.locator('.action-list').getByRole('button', { name: 'Component action', exact: true }).click();
  await enChoose('tekklar', 'Tekklar Legion');
  await en.getByRole('button', { name: 'Done', exact: true }).click();
  await enPanel.getByRole('button', { name: 'Mine', exact: true }).click();
  await en.getByRole('button', { name: /^Components/ }).click();
  await en.locator('.tab-fan').getByRole('button', { name: /^Cards/ }).click();
  await en.waitForTimeout(600);
  const note = en.getByRole('dialog', { name: 'Components' }).getByTestId('component-promissory:tekklar@me');
  await expect(note).toBeVisible();
  console.log('EN NOTE', (await note.innerText()).split('\n').join(' | '));
  // In English the printed text is found by the rule (LRR 69.3) and the card is back in hand.
  await expect(note).toContainText('in hand');
  await ctx.close();
});


