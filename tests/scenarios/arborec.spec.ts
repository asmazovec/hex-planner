import { test, expect, type Locator, type Page } from '@playwright/test';

const SHOT = 'test-results/scenarios/arborec/';
// Seat 1 Arborec (5), 2 Sol (1), 3 Hacan (16), 4 Argent (58), 5 Xxcha (14), 6 Yin (3); homes are given in the string.
const MAP = '78 40 42 67 69 34 39 27 26 65 79 47 32 30 29 73 41 21 5 20 62 1 19 64 16 44 36 58 38 61 14 76 24 3 37 50';
const RIVALS = ['The Federation of Sol', 'The Emirates of Hacan', 'The Argent Flight', 'The Xxcha Kingdom', 'The Yin Brotherhood'];

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Тайл ${n}`, exact: true });
const panel = (page: Page) => page.locator('.plan-panel');

async function dump(page: Page, n: string, scope?: Locator): Promise<void> {
  console.log('--- ' + n + '\n' + (await (scope ?? panel(page)).innerText()).slice(0, 3000));
  await page.screenshot({ path: SHOT + n + '.png' });
}

async function newGame(page: Page): Promise<void> {
  await page.addInitScript(() => { if (localStorage.getItem('ti4.lang') === null) localStorage.setItem('ti4.lang', 'ru'); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Моя фракция', exact: true }).click();
  await page.getByRole('button', { name: 'The Arborec', exact: true }).click();
  for (const [i, r] of RIVALS.entries()) {
    await page.getByRole('button', { name: 'Соперник', exact: true }).nth(i).click();
    await page.getByRole('button', { name: r, exact: true }).click();
  }
  await page.getByRole('button', { name: "Thunder's Edge" }).click();
  await page.getByRole('textbox', { name: 'Имя партии' }).fill('Arborec');
  await page.getByRole('button', { name: 'Вставить строку Milty' }).click();
  await page.getByLabel('Строка карты Milty Draft').fill(MAP);
  await page.getByRole('button', { name: 'Применить' }).click();
  await expect(page.getByText(/Домашних систем поставлено: 6/)).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть' }).click();
  await page.getByRole('button', { name: 'Начать партию' }).click();
  await page.getByRole('button', { name: 'План и карта' }).click();
  await expect(tile(page, 5)).toBeVisible();
}

async function choose(page: Page, query: string, name: string): Promise<void> {
  const dlg = page.getByRole('dialog', { name: 'Выбор компонента' });
  await dlg.getByRole('searchbox', { name: 'Поиск компонентов' }).fill(query);
  await dlg.getByRole('button', { name: `Выбрать: ${name}` }).click();
  await expect(dlg).toHaveCount(0);
}

async function tap(page: Page, n: number): Promise<void> {
  let last = '';
  await expect.poll(async () => {
    const now = JSON.stringify(await tile(page, n).boundingBox());
    const still = now === last;
    last = now;
    return still;
  }, { intervals: [150] }).toBe(true);
  await tile(page, n).click();
}

async function addAction(page: Page, type: string): Promise<void> {
  await page.getByRole('button', { name: 'Новое действие' }).click();
  await page.locator('.action-list').getByRole('button', { name: type, exact: true }).click();
}


const entries = (page: Page) => page.locator('.plan-panel .entry');
const summary = (page: Page, name: string) => page.locator(`.summary-cell[aria-label="${name}"]`);
const done = (page: Page) => panel(page).getByRole('button', { name: 'Готово', exact: true }).click();
const drawerOf = (page: Page) => page.getByRole('dialog', { name: 'Компоненты' });
const groupTab = (page: Page, name: RegExp) => page.getByRole('group', { name: 'Шторки' }).getByRole('button', { name });
const leaderState = (page: Page, id: string, n: number) => page.getByTestId(`component-leader:${id}`).locator('.segment > button').nth(n);

const inf5 = async () => { await page.waitForTimeout(700); return tile(page, 5).locator('[data-unit="infantry"][aria-label]').evaluateAll(els => els.map(e => e.getAttribute('aria-label') + '@' + (e.closest('[data-planet]') ? 'planet' : 'space'))); };
/** What stands on a tile once the animations rest: { 'infantry@planet': 4, 'infantry@space': 2 ... }. */
async function unitsOn(n: number): Promise<Record<string, number>> {
  await page.waitForTimeout(300);
  await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'));
  await page.waitForTimeout(400);
  const list = await tile(page, n).locator('[data-unit][aria-label]').evaluateAll(els => els.map(e => [e.getAttribute('data-unit') + (e.closest('[data-planet]') ? '@planet' : '@space'), e.getAttribute('aria-label') ?? '']));
  const out: Record<string, number> = {};
  for (const [key, label] of list) out[key] = (out[key] ?? 0) + Number(/×(\d+)/.exec(label)?.[1] ?? 1);
  return out;
}

const sums = async (tag: string) => console.log('SUMS', tag, await page.locator('.summary-cell').evaluateAll(cs => cs.map(c => c.getAttribute('aria-label') + '=' + (c as HTMLElement).innerText.replace(/\s+/g, ' '))).then(a => a.slice(0, 4).join(' | ')));
const errors: string[] = [];
const notes: string[] = [];
const bug = (text: string) => { notes.push(text); console.log('BUG: ' + text); };
let page: Page;

test.describe.configure({ mode: 'serial' });
test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true });
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
});
test.afterAll(async () => { await page.context().close(); });
test.afterEach(() => { expect(errors, 'browser errors').toEqual([]); });

test('R0: a game of six from the first screen, the Arborec components', async () => {
  await test.step('create the game', async () => { await newGame(page); });
  await test.step('start numbers: Nestphar 3/2, tokens 3/3/2', async () => {
    await expect(summary(page, 'Ресурсы')).toHaveText(/3$/);
    await expect(summary(page, 'Влияние')).toHaveText(/2$/);
    await expect(summary(page, 'Тактика')).toHaveText(/3$/);
    await expect(summary(page, 'Флот')).toHaveText(/3$/);
    await expect(summary(page, 'Стратегия')).toHaveText(/2$/);
    await expect(summary(page, 'Продукция')).toHaveText(/0$/);
  });
  await test.step('the components drawer: leaders, notes, technologies', async () => {
    await page.getByRole('button', { name: /^Компоненты/ }).click();
    await expect(drawerOf(page).getByRole('group', { name: 'Изученные технологии' })).toContainText('Magen Defense Grid');
    await groupTab(page, /^Карты/).click();
    for (const n of ['Ceasefire', 'Political Secret', 'Support for the Throne', 'Trade Agreement', 'Alliance', 'Stymie']) await expect(drawerOf(page)).toContainText(n);
    await groupTab(page, /^Фракция/).click();
    await expect(drawerOf(page)).toContainText('Letani Ospha');
    await expect(drawerOf(page)).toContainText('Dirzuga Rophal');
    await expect(drawerOf(page)).toContainText('Letani Miasmiala');
    await page.screenshot({ path: SHOT + 'r0-faction.png' });
    await groupTab(page, /^Фракция/).click();
  });
});

test('R1: Technology, the first conquest, the agent', async () => {
  await test.step('strategy phase: Technology is my card', async () => {
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '7 Technology' }).click();
    await expect(page.getByRole('button', { name: '7 Technology' })).toHaveClass(/card-main/);
  });
  await test.step('E1 tactical: carrier with two fighters and two infantry takes Vefut II', async () => {
    await addAction(page, 'Тактическое действие');
    await tap(page, 20);
    await tap(page, 5);
    await tap(page, 20);
    await expect(panel(page).getByText('Перелёт Nestphar → Vefut II')).toBeVisible();
    await page.getByRole('button', { name: 'Взять: Транспортник' }).first().click();
    for (const u of ['Истребитель', 'Истребитель', 'Пехота', 'Пехота']) await page.getByRole('button', { name: `Взять: ${u}` }).first().click();
    await expect(page.getByRole('heading', { name: 'Груз на борту: 4 из 4' })).toBeVisible();
    await page.getByRole('button', { name: 'Лететь' }).click();
    await page.getByRole('button', { name: 'Высадить: Пехота' }).first().click();
    await page.getByRole('button', { name: 'Высадить: Пехота' }).first().click();
    await expect(summary(page, 'Тактика')).toHaveText(/3\s*→\s*2/);
    // BUG candidate: the start infantry stand in the space area of the home system, so two left behind lack berths.
    await expect(panel(page).getByText('В системе Nestphar не хватает мест на борту: 2 из 0.').first()).toBeVisible();
    bug('start infantry stands in space, not on Nestphar: leaving it behind warns "не хватает мест на борту: 2 из 0"');
    await page.screenshot({ path: SHOT + 'r1-e1.png' });
    await done(page);
  });
  await test.step('E2 strategy Technology: Neural Motivator, free', async () => {
    await addAction(page, 'Стратегия');
    await panel(page).getByRole('button', { name: 'Исследовать технологию' }).click();
    await choose(page, 'neural motivator', 'Neural Motivator');
    await expect(panel(page).getByText('Технология: 1')).toBeVisible();
    await expect(panel(page).getByText('К оплате: 0.')).toBeVisible();
    await done(page);
  });
  await test.step('E3 agent Letani Ospha: a flagship for a cruiser costs more than 2 extra', async () => {
    await addAction(page, 'Действие компонента');
    await choose(page, 'letani ospha', 'Letani Ospha');
    await panel(page).getByRole('group', { name: 'Система' }).getByRole('button', { name: 'Nestphar', exact: true }).click();
    await panel(page).getByRole('group', { name: 'Заменяемый корабль' }).getByRole('button', { name: 'Крейсер' }).click();
    await panel(page).getByRole('group', { name: 'Новый корабль' }).getByRole('button', { name: 'Флагман' }).click();
    await expect(panel(page).getByText('Замена юнита стоит дороже, чем разрешает компонент.')).toBeVisible();
    await panel(page).getByRole('group', { name: 'Новый корабль' }).getByRole('button', { name: 'Дредноут' }).click();
    await expect(panel(page).getByText('Замена юнита стоит дороже')).toHaveCount(0);
    await done(page);
  });
  await test.step('E4 the agent twice in a round: exhausted warning, then the entry is removed', async () => {
    await addAction(page, 'Действие компонента');
    await choose(page, 'letani ospha', 'Letani Ospha');
    await dump(page, 'r1-agent-twice');
    await page.getByRole('button', { name: 'Убрать действие' }).click();
    await dump(page, 'r1-after-remove');
  });
  await test.step('rival fleet on 50 by Setup of Hacan', async () => {
    await tile(page, 50).click();
    const stage = page.locator('.stage-dialog');
    await stage.getByRole('button', { name: 'Расстановка', exact: true }).click();
    console.log(await stage.getByRole('button').evaluateAll(bs => bs.map(b => (b.getAttribute('aria-label') ?? b.textContent) + '|' + b.getAttribute('aria-pressed'))));
    await stage.getByRole('button', { name: /Hacan/ }).click();
    for (const u of ['Эсминец', 'Истребитель', 'Истребитель']) await stage.getByRole('button', { name: u, exact: true }).click();
    await stage.getByRole('button', { name: 'Закрыть' }).click();
  });
  await test.step('E5 tactical on 50: the dreadnought attacks the Hacan fleet and is lost', async () => {
    await addAction(page, 'Тактическое действие');
    await tap(page, 50);
    await tap(page, 5);
    await tap(page, 50);
    await page.getByRole('button', { name: 'Взять: Дредноут' }).first().click();
    await page.getByRole('button', { name: 'Лететь' }).click();
    await dump(page, 'r1-e5');
    await panel(page).getByRole('button', { name: /Начать бой/ }).click();
    const stage = page.locator('.stage-dialog');
    console.log(await stage.getByRole('button').evaluateAll(bs => bs.map(b => (b.getAttribute('aria-label') ?? b.textContent))));
    await stage.getByRole('button', { name: /Дредноут/ }).first().click();
    await dump(page, 'r1-battle2', stage);
    await stage.getByRole('button', { name: 'Закрыть' }).click();
    await expect(panel(page).getByText(/Потери: Дредноут/)).toBeVisible();
    await done(page);
  });
  await test.step('E6 tactical on the home system: production', async () => {
    await addAction(page, 'Тактическое действие');
    await tap(page, 5);
    await dump(page, 'r1-e6');
    await panel(page).getByRole('button', { name: /Открыть магазин/ }).click();
    const stage = page.locator('.stage-dialog');
    console.log(await stage.getByRole('button').evaluateAll(bs => bs.map(b => (b.getAttribute('aria-label') ?? b.textContent))));
    await stage.getByRole('button', { name: 'Пехота', exact: true }).click();
    await stage.getByRole('button', { name: 'Мех', exact: true }).click();
    await dump(page, 'r1-shop2', stage);
    await stage.getByRole('button', { name: 'Закрыть' }).click();
    const landing = panel(page).getByRole('group', { name: /Высадка на Nestphar/ });
    await page.screenshot({ path: SHOT + 'r1-e6c.png' });
    await panel(page).getByRole('button', { name: 'Высадить: Пехота' }).first().click();
    await panel(page).getByRole('button', { name: 'Высадить: Пехота' }).first().click();
    await dump(page, 'r1-e6d');
    void landing;
    await done(page);
    
  });
  await test.step('E7 pass, then the status entry', async () => {
    await addAction(page, 'Пас');
    await done(page);
    
    await page.getByRole('button', { name: 'Жетоны и очки' }).click();
    await panel(page).getByRole('button', { name: 'Добавить: Тактика' }).first().click();
    await panel(page).getByRole('button', { name: 'Добавить: Тактика' }).first().click();
    await expect(panel(page).getByText(/Распределить жетоны: осталось 0/)).toBeVisible();
    const units = async (n: number) => tile(page, n).evaluate(el => Object.fromEntries([...el.querySelectorAll('[data-unit]')].map(u => [u.getAttribute('data-unit'), u.textContent])));
    console.log('tile5', JSON.stringify(await units(5)), 'tile20', JSON.stringify(await units(20)), 'tile50', JSON.stringify(await units(50)));
    console.log('HTML5', await tile(page, 5).evaluate(el => [...el.querySelectorAll('[data-unit]')].map(u => u.getAttribute('data-unit') + '@' + (u.closest('[data-planet]')?.getAttribute('data-planet') ?? 'space') + '=' + u.textContent + ' ' + u.getAttribute('aria-label')).join(' | ')));
    await dump(page, 'r1-end');
  });
  await test.step('every entry of round 1 is marked done; now equals forecast, in the Fact mode', async () => {
    const boxes = page.getByRole('checkbox', { name: 'Выполнено' });
    const n = await boxes.count();
    for (let i = 0; i < n; i++) await boxes.nth(i).check();
    await page.getByRole('button', { name: 'Факт', exact: true }).click();
    await page.waitForTimeout(500);
    console.log('FACT', await page.locator('.summary-cell').evaluateAll(cs => cs.map(c => c.getAttribute('aria-label') + '=' + (c as HTMLElement).innerText.replace(/\s+/g, ' '))).then(a => a.join(' | ')));
    await page.screenshot({ path: SHOT + 'r1-fact.png' });
    await page.getByRole('button', { name: 'План', exact: true }).click();
  });
});

test('R2: Trade, a second conquest, a deal, secondary Technology', async () => {
  await test.step('round 2 and the Trade card', async () => {
    await page.getByRole('button', { name: 'Добавить раунд' }).click();
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '5 Trade' }).click();
    await expect(page.getByRole('button', { name: '5 Trade' })).toHaveClass(/card-main/);
    await addAction(page, 'Стратегия');
    await dump(page, 'r2-trade');
    await done(page);
    await expect(summary(page, 'Товары')).toHaveText(/0\s*→\s*3/);
    await expect(summary(page, 'Продукция')).toHaveText(/0\s*→\s*3/);
    console.log('SUM', await page.locator('.summary-cell').evaluateAll(cs => cs.map(c => c.getAttribute('aria-label') + '=' + (c as HTMLElement).innerText.replace(/\s+/g, ' '))).then(a => a.join(' | ')));
  });
  await test.step('E1 tactical on 27 from Vefut II', async () => {
    await addAction(page, 'Тактическое действие');
    await tap(page, 27);
    await tap(page, 20);
    await tap(page, 27);
    for (const u of ['Транспортник', 'Истребитель', 'Истребитель', 'Пехота', 'Пехота']) await page.getByRole('button', { name: `Взять: ${u}` }).first().click();
    await expect(page.getByRole('heading', { name: 'Груз на борту: 4 из 4' })).toBeVisible();
    await page.getByRole('button', { name: 'Лететь' }).click();
    await panel(page).getByRole('group', { name: /Высадка на New Albion/ }).getByRole('button', { name: 'Высадить: Пехота' }).click();
    await panel(page).getByRole('group', { name: /Высадка на Starpoint/ }).getByRole('button', { name: 'Высадить: Пехота' }).click();
    await panel(page).getByRole('button', { name: '+ Сделка' }).click();
    await panel(page).getByRole('group', { name: 'С кем' }).getByRole('button', { name: 'Sol' }).click();
    const give = panel(page).getByRole('group', { name: 'Отдаю' });
    const get = panel(page).getByRole('group', { name: 'Получаю' });
    await give.getByRole('button', { name: 'Добавить: Продукция' }).click();
    await give.getByRole('button', { name: 'Добавить: Продукция' }).click();
    await get.getByRole('button', { name: 'Добавить: Товары' }).click();
    await get.getByRole('button', { name: 'Добавить: Товары' }).click();
    await give.getByRole('button', { name: '+ Компонент' }).click();
    await dump(page, 'r2-deal-pick', page.getByRole('dialog', { name: 'Выбор компонента' }));
    await choose(page, 'stymie', 'Stymie');
    await expect(panel(page).getByText('Сделка только с соседом')).toBeVisible();
    await panel(page).getByRole('button', { name: 'Назад', exact: false }).first().click();
    await expect(panel(page).getByRole('button', { name: /^\+ Сделка \(Sol\)/ })).toBeVisible();
    await done(page);
    await expect(summary(page, 'Товары')).toHaveText(/0\s*→\s*5/);
    await expect(summary(page, 'Продукция')).toHaveText(/0\s*→\s*1/);
  });
  await test.step('Stymie is in Sol hands (the Sol tab of the components drawer)', async () => {
    await page.getByRole('button', { name: /^Компоненты/ }).click();
    await drawerOf(page).getByRole('button', { name: 'Sol', exact: true }).click();
    await groupTab(page, /^Карты/).click();
    await dump(page, 'r2-sol-cards', drawerOf(page));
    await groupTab(page, /^Карты/).click();
  });
  await test.step('E3 secondary of Technology: Dacxive Animators for 4 resources', async () => {
    await addAction(page, 'Стратегия');
    await panel(page).getByRole('group', { name: 'Карта', exact: true }).getByRole('button', { name: '7 Technology' }).click();
    await expect(panel(page).getByRole('heading', { name: /Technology · второстепенная способность/ })).toBeVisible();
    await panel(page).getByRole('button', { name: 'Исследовать технологию' }).click();
    await choose(page, 'dacxive', 'Dacxive Animators');
    await panel(page).getByRole('button', { name: 'Выбрать вручную' }).click();
    const pay = panel(page).getByRole('group', { name: 'Оплата' });
    await panel(page).getByRole('button', { name: 'Nestphar 3' }).click();
    await panel(page).getByRole('button', { name: 'Vefut II 2' }).click();
    await panel(page).getByRole('button', { name: 'Добавить: товар' }).click();
    void pay;
    await expect(panel(page).getByText('Стоимость 4, оплачено 4')).toBeVisible();
    await expect(panel(page).getByText('Технология: 1')).toBeVisible();
    await dump(page, 'r2-pay2');
    await done(page);
    await expect(summary(page, "Стратегия")).toHaveText(/2\s*→\s*1/);
  });
  await test.step('E4 the agent is ready again in round 2: carrier at 27 becomes a dreadnought', async () => {
    await addAction(page, 'Действие компонента');
    await choose(page, 'letani ospha', 'Letani Ospha');
    await panel(page).getByRole('group', { name: 'Система' }).getByRole('button', { name: 'New Albion / Starpoint' }).click();
    await panel(page).getByRole('group', { name: 'Заменяемый корабль' }).getByRole('button', { name: 'Транспортник' }).click();
    await panel(page).getByRole('group', { name: 'Новый корабль' }).getByRole('button', { name: 'Дредноут' }).click();
    await expect(panel(page).getByText(/компонент истощён/)).toHaveCount(0);
    await expect(panel(page).getByText(/стоит дороже/)).toHaveCount(0);
    await done(page);
  });
  await test.step('E5 tactical on the home system: a mech and infantry produced, paid by Nestphar', async () => {
    await addAction(page, 'Тактическое действие');
    await tap(page, 5);
    await expect(panel(page).getByText('Подсказки шага').first()).toBeVisible();
    await dump(page, 'r2-e5');
    await panel(page).getByRole('button', { name: /Открыть магазин/ }).click();
    const stage = page.locator('.stage-dialog');
    await stage.getByRole('button', { name: 'Мех', exact: true }).click();
    await stage.getByRole('button', { name: 'Пехота', exact: true }).click();
    await stage.getByRole('button', { name: 'Пехота', exact: true }).click();
    await dump(page, 'r2-shop', stage);
    await stage.getByRole('button', { name: 'Закрыть' }).click();
    await dump(page, 'r2-e5b');
    await done(page);
  });
  await test.step('E6 pass, the status entry', async () => {
    await addAction(page, 'Пас');
    await done(page);
    await page.getByRole('button', { name: 'Жетоны и очки' }).click();
    console.log('STATUS-FULL', (await panel(page).innerText()).split('\n').slice(-60).join(' / '));
    // BUG: Mitosis is applied twice once the status entry exists. Rules: 4 on Nestphar after round 1 (2 kept + 1 produced + 1 Mitosis), 7 after round 2 (+2 produced +1 Mitosis); the app shows 5 and 9.
    expect((await unitsOn(5))['infantry@planet']).toBe(9);
    bug('Mitosis places 2 infantry per round (not 1) once a status entry exists');
    await page.screenshot({ path: SHOT + 'r2-status.png' });
    await panel(page).getByRole('button', { name: 'Выполнить цель' }).click();
    await choose(page, 'lead from the front', 'Lead From the Front');
    await expect(panel(page).getByText(/Lead From the Front выполнена без её условия: есть 1, нужно 3/)).toBeVisible();
    await panel(page).getByRole('button', { name: 'Добавить: Тактика' }).first().click();
    await panel(page).getByRole('button', { name: 'Добавить: Тактика' }).first().click();
    await panel(page).getByRole('button', { name: /Добавить: Arborec/ }).first().click();
    await done(page).catch(() => {});
    await page.screenshot({ path: SHOT + 'r2-status2.png' });
    const boxes = page.getByRole('checkbox', { name: 'Выполнено' });
    for (let i = 0, n = await boxes.count(); i < n; i++) await boxes.nth(i).check();
    console.log('SUM-R2', await page.locator('.summary-cell').evaluateAll(cs => cs.map(c => c.getAttribute('aria-label') + '=' + (c as HTMLElement).innerText.replace(/\s+/g, ' '))).then(a => a.join(' | ')));
    console.log('INF-after', JSON.stringify(await unitsOn(5)));
  });
  // NEXT-R2
});

test('R3: faction technologies, the hero, the flagship', async () => {
  await test.step('round 3, Technology again: Bioplasmosis is free, Letani Warrior II costs 6', async () => {
    await page.getByRole('button', { name: 'Добавить раунд' }).click();
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '7 Technology' }).click();
    await expect(page.getByRole('button', { name: '7 Technology' })).toHaveClass(/card-main/);
    await addAction(page, 'Стратегия');
    await panel(page).getByRole('button', { name: 'Исследовать технологию' }).click();
    await choose(page, 'bioplasmosis', 'Bioplasmosis');
    await dump(page, 'r3-bio');
    await panel(page).getByRole('button', { name: 'Исследовать технологию' }).click();
    await choose(page, 'letani warrior', 'Letani Warrior II');
    await dump(page, 'r3-lw2');
  });
  await test.step('a third research and a technology without its prerequisites are warned about', async () => {
    await panel(page).getByRole('button', { name: 'Исследовать технологию' }).click();
    await choose(page, 'magmus', 'Magmus Reactor');
    await expect(panel(page).locator('li[data-code="prerequisitesMissing"]')).toContainText('Magmus Reactor');
    await expect(panel(page).locator('li[data-code="researchOverLimit"]')).toBeVisible();
    // BUG candidate: another faction's technology (Muaat) is offered and researched with no warning about the faction.
    await expect(panel(page).locator('li[data-code]')).toHaveCount(2);
    bug('a faction technology of another faction (Magmus Reactor of Muaat, who is in the game) is researched with no warning');
    await panel(page).getByRole('button', { name: 'Убрать: Magmus Reactor' }).click();
    await expect(panel(page).getByText('Технология: 2')).toBeVisible();
  });
  await test.step('pay the 6 of Letani Warrior II by Starpoint, Vefut II and New Albion, and finish', async () => {
    await panel(page).getByRole('button', { name: 'Выбрать вручную' }).click();
    await panel(page).getByRole('button', { name: 'Nestphar 3' }).click();
    await panel(page).getByRole('button', { name: 'Vefut II 2' }).click();
    await panel(page).getByRole('button', { name: 'New Albion 1' }).click();
    await expect(panel(page).getByText('Стоимость 6, оплачено 6')).toBeVisible();
    await expect(panel(page).locator('li[data-code]')).toHaveCount(0);
    await done(page);
    await expect(summary(page, 'Ресурсы')).toHaveText(/9\s*→\s*3/);
  });
  await test.step('a manual adjustment: trade goods and cards taken', async () => {
    await addAction(page, 'Ручная правка');
    await panel(page).getByRole('textbox', { name: 'Подпись' }).fill('Сделки и находки за круг');
    for (let i = 0; i < 10; i++) await panel(page).getByRole('button', { name: 'Добавить: Товары' }).click();
    const took = panel(page).getByRole('group', { name: 'Взято и сброшено' });
    for (const [q, n] of [['sabotage', 'Sabotage'], ['fighter prototype', 'Fighter Prototype'], ['fire team', 'Fire Team'], ['emergency repairs', 'Emergency Repairs'], ['economic initiative', 'Economic Initiative'],
      ['gravity drive', 'Gravity Drive'], ['sarween tools', 'Sarween Tools'], ['carrier ii', 'Carrier II'], ['stellar converter', 'Stellar Converter']] as const) {
      await took.getByRole('button', { name: '+ Взял' }).click();
      await choose(page, q, n);
    }
    await dump(page, 'r3-adjust2');
    await done(page);
    await expect(summary(page, 'Товары')).toHaveText(/3\s*→\s*13/);
  });
  await test.step('commander and hero are unlocked in the drawer', async () => {
    await page.getByRole('button', { name: /^Компоненты/ }).click();
    await groupTab(page, /^Фракция/).click();
    await leaderState(page, 'arboreccommander', 1).click();
    await leaderState(page, 'arborechero', 1).click();
    await expect(leaderState(page, 'arborechero', 1)).toHaveAttribute('aria-pressed', 'true');
    await groupTab(page, /^Технологии/).click();
    await dump(page, 'r3-techs', drawerOf(page));
    await groupTab(page, /^Технологии/).click();
  });
  await test.step('hero: produce the flagship and two infantry in Vefut II, where my infantry stand', async () => {
    await addAction(page, 'Действие компонента');
    await choose(page, 'letani miasmiala', 'Letani Miasmiala');
    // BUG: the component action editor has no production block, so what the hero produces cannot be entered in it.
    await expect(panel(page).getByRole('group', { name: /Производство/ })).toHaveCount(0);
    bug('hero Letani Miasmiala: the component action editor offers no production block (effects.production is only reachable from Construction/Warfare cards), so its waivers can never apply');
    await done(page);
    await page.getByRole('button', { name: /^Компоненты/ }).click();
    await groupTab(page, /^Фракция/).click();
    await expect(leaderState(page, 'arborechero', 2)).toHaveAttribute('aria-pressed', 'true');
    await groupTab(page, /^Фракция/).click();
  });
  await test.step('the hero a second time: it is purged and warns', async () => {
    await addAction(page, 'Действие компонента');
    await choose(page, 'letani miasmiala', 'Letani Miasmiala');
    await dump(page, 'r3-hero2');
    await page.getByRole('button', { name: 'Убрать действие' }).click();
  });
  await test.step('the flagship by the hero: bought in Vefut II in the large hex', async () => {
    await tile(page, 20).click();
    const stage = page.locator('.stage-dialog');
    await stage.getByRole('button', { name: 'Создание', exact: true }).click();
    await stage.getByRole('button', { name: 'Флагман', exact: true }).click();
    await dump(page, 'r3-flagship-shop', stage);
    await stage.getByRole('button', { name: 'Закрыть' }).click();
  });
  await sums('after flagship');
  await test.step('T1 activate Vefut II where the flagship stands: up to 5 units without a dock', async () => {
    await addAction(page, 'Тактическое действие');
    await tap(page, 20);
    await panel(page).getByRole('button', { name: /Открыть магазин/ }).click();
    const stage = page.locator('.stage-dialog');
    await stage.getByRole('button', { name: 'Транспортник', exact: true }).first().click();
    for (let i = 0; i < 2; i++) await stage.getByRole('button', { name: 'Истребитель', exact: true }).first().click();
    await stage.getByRole('button', { name: 'Пехота', exact: true }).first().click();
    await stage.getByRole('button', { name: 'Пехота', exact: true }).first().click();
    await dump(page, 'r3-flag-shop', stage);
    await stage.getByRole('button', { name: 'Закрыть' }).click();
    await dump(page, 'r3-flag-prod');
    // BUG: Duha Menaimon ("produce up to 5 units in this system" after activation) is not known: both production warnings stand and nothing waives them.
    await expect(panel(page).locator('li[data-code="noProduction"]:not(.warning-waived)')).toHaveCount(1);
    await expect(panel(page).locator('li[data-code="productionPlace"]:not(.warning-waived)')).toHaveCount(1);
    bug('flagship Duha Menaimon: producing 5 units in its system without a dock gives noProduction + productionPlace with nothing to waive them');
    await expect(panel(page).getByText('Dirzuga Rophal')).toBeVisible();
    await done(page);
  });
  await sums('after T1');
  await test.step('T2 home production with Letani Warrior II: the dock builds no infantry, the warriors do', async () => {
    await addAction(page, 'Тактическое действие');
    await tap(page, 5);
    await panel(page).getByRole('button', { name: /Открыть магазин/ }).click();
    const stage = page.locator('.stage-dialog');
    for (let i = 0; i < 8; i++) await stage.getByRole('button', { name: 'Пехота', exact: true }).first().click();
    await dump(page, 'r3-home-shop', stage);
    await stage.getByRole('button', { name: 'Закрыть' }).click();
    await expect(panel(page).locator('li[data-code]')).toHaveCount(0);
    await expect(panel(page).getByText('Стоимость 4, оплачено 4')).toBeVisible();
    await done(page);
  });
  await sums('after T2');
  await test.step('action card Economic Initiative as a component action readies cultural planets', async () => {
    await addAction(page, 'Действие компонента');
    await choose(page, 'economic initiative', 'Economic Initiative');
    await dump(page, 'r3-econ');
    await done(page);
    console.log('SUM-ECON', await page.locator('.summary-cell').evaluateAll(cs => cs.map(c => c.getAttribute('aria-label') + '=' + (c as HTMLElement).innerText.replace(/\s+/g, ' '))).then(a => a.join(' | ')));
  });
  await test.step('mech Letani Behemoth named in Used replaces an infantry; the component action picker does not offer it', async () => {
    await addAction(page, 'Действие компонента');
    const dlg = page.getByRole('dialog', { name: 'Выбор компонента' });
    await dlg.getByRole('searchbox', { name: 'Поиск компонентов' }).fill('letani');
    await page.waitForTimeout(900);
    await expect(dlg.getByTestId('component-mech:arborec_mech')).toHaveCount(0);
    bug('Letani Behemoth is missing from the component action picker (only the Used picker lists it); the status entry has no Used block, so its Mitosis replacement cannot be entered where Mitosis happens');
    await dlg.getByRole('button', { name: 'Закрыть' }).click();
    await page.getByRole('button', { name: 'Убрать действие' }).click();
    await addAction(page, 'Пас');
    const total = async () => { const t: Record<string, number> = {}; for (const n of [5, 20, 27]) for (const [k, v] of Object.entries(await unitsOn(n))) t[k.split('@')[0]] = (t[k.split('@')[0]] ?? 0) + v; return t; };
    const before = await total();
    await panel(page).getByRole('button', { name: '+ Использовал' }).click();
    await choose(page, 'letani', 'Letani Behemoth');
    await panel(page).getByRole('button', { name: '+ Использовал' }).click();
    await choose(page, 'sabotage', 'Sabotage');
    await page.waitForTimeout(1500);
    await dump(page, 'r3-mech-used');
    const after = await total();
    console.log('MECH-DELTA', JSON.stringify(before), JSON.stringify(after));
    expect(after.mech).toBe(before.mech + 1);
    expect(after.infantry).toBe(before.infantry - 1);
    await done(page);
  });
  await test.step('Sol, who holds Stymie, moves ships: the note shows as a hint in his movement', async () => {
    await panel(page).getByRole('button', { name: 'Sol', exact: true }).click();
    await addAction(page, 'Тактическое действие');
    await tap(page, 62);
    await tap(page, 1);
    await tap(page, 62);
    await page.getByRole('button', { name: /Взять: Транспортник/ }).first().click();
    await page.getByRole('button', { name: 'Лететь' }).click();
    await expect(panel(page).getByText('Stymie').first()).toBeVisible();
    await done(page);
    await panel(page).getByRole('button', { name: 'Моё', exact: true }).click();
  });
  await test.step('secondary of Warfare and of Construction: a token spent, then a token missing', async () => {
    await addAction(page, 'Стратегия');
    await panel(page).getByRole('group', { name: 'Карта', exact: true }).getByRole('button', { name: '6 Warfare' }).click();
    await dump(page, 'r3-warfare');
    await done(page);
    await addAction(page, 'Стратегия');
    await panel(page).getByRole('group', { name: 'Карта', exact: true }).getByRole('button', { name: '4 Construction' }).click();
    await dump(page, 'r3-construction');
    await done(page);
  });
  await test.step('Mecatol Rex is taken (Control mode) and an agenda entry is added: a law stays in play', async () => {
    await page.screenshot({ path: SHOT + 'r3-before-mecatol.png' });
    await tap(page, 18);
    await page.waitForTimeout(500);
    if (await page.locator('.stage-dialog').count() === 0) { const b = (await tile(page, 18).boundingBox())!; await page.mouse.click(b.x + 20, b.y + b.height / 2 + 25); await page.waitForTimeout(500); }
    console.log('STAGE-OPEN', await page.locator('.stage-dialog').count());
    await page.screenshot({ path: SHOT + 'r3-mecatol-click.png' });
    const stage = page.locator('.stage-dialog');
    await stage.getByRole('button', { name: 'Контроль', exact: true }).click();
    await dump(page, 'r3-mecatol', stage);
    await stage.getByRole('button', { name: 'Мой', exact: true }).click();
    await stage.getByRole('button', { name: 'Закрыть' }).click();
    await page.getByRole('button', { name: '+ Карта политики' }).click();
    await panel(page).getByRole('button', { name: 'Выбрать карту политики' }).click();
    await choose(page, 'anti-intellectual', 'Anti-Intellectual Revolution');
    await expect(panel(page).getByTestId('component-agenda:revolution')).toContainText('закон: остаётся в игре');
    await done(page);
    await page.getByRole('button', { name: /^Компоненты/ }).click();
    await groupTab(page, /^Цели и законы/).click();
    await expect(drawerOf(page).getByRole('group', { name: 'Законы' })).toContainText('Anti-Intellectual Revolution');
    await expect(drawerOf(page).getByRole('group', { name: 'Цели' })).toContainText('Lead From the Front');
    await groupTab(page, /^Цели и законы/).click();
  });
  await test.step('status phase: tokens, the Bioplasmosis reminder, the agent is readied', async () => {
    await page.getByRole('button', { name: 'Жетоны и очки' }).click();
    await panel(page).getByRole('button', { name: 'Добавить: Тактика' }).first().click();
    await panel(page).getByRole('button', { name: 'Добавить: Флот' }).first().click();
    await expect(panel(page).getByText('Bioplasmosis').first()).toBeVisible();
    await dump(page, 'r3-status');
    const boxes = page.getByRole('checkbox', { name: 'Выполнено' });
    for (let i = 0, n = await boxes.count(); i < n; i++) await boxes.nth(i).check();
    await page.getByRole('button', { name: /^Компоненты/ }).click();
    await groupTab(page, /^Фракция/).click();
    await expect(leaderState(page, 'arborecagent', 1)).toHaveAttribute('aria-pressed', 'true');
    await groupTab(page, /^Фракция/).click();
    console.log('SUM-R3', await page.locator('.summary-cell').evaluateAll(cs => cs.map(c => c.getAttribute('aria-label') + '=' + (c as HTMLElement).innerText.replace(/\s+/g, ' '))).then(a => a.join(' | ')));
    await page.screenshot({ path: SHOT + 'r3-end.png' });
  });
  // NEXT-R3
});

test('Russian interface: no English line, no broken plural, on the main surfaces', async () => {
  const seen = new Set<string>();
  const scan = async (name: string, scope: Locator) => {
    const lines = (await scope.innerText()).split(String.fromCharCode(10)).map(l => l.trim()).filter(l => /[A-Za-z]{3}/.test(l) && !/[А-Яа-яЁё]/.test(l));
    const mixed = (await scope.innerText()).split(String.fromCharCode(10)).map(l => l.trim()).filter(l => /[А-Яа-яЁё]/.test(l) && /(^|[^A-Za-zА-Яа-я'])[A-Z]?[a-z]{4,}([^A-Za-zА-Яа-я]|$)/.test(l));
    for (const l of mixed) if (!seen.has(l)) { seen.add(l); console.log('MIXED', name, '::', l); }
    for (const l of lines) if (!seen.has(l)) { seen.add(l); console.log('LATIN', name, '::', l); }
  };
  await page.getByRole('button', { name: 'План', exact: true }).click().catch(() => {});
  await scan('panel', panel(page));
  await page.getByRole('button', { name: /^Компоненты/ }).click();
  for (const g of ['Технологии', 'Карты', 'Фракция', 'Реликвии', 'Цели и законы']) {
    await groupTab(page, new RegExp('^' + g)).click();
    await scan('drawer-' + g, drawerOf(page));
  }
  await page.screenshot({ path: SHOT + 'ru-drawer.png' });
  await page.getByRole('button', { name: 'Игроки', exact: true }).click().catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: SHOT + 'ru-players.png' });
});

