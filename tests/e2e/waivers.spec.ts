import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * What a component allows, in the whole app: the warning it lifts is still listed, in the look of a thing switched off
 * and naming the component, and the entry is no longer marked as warned. One journey per kind of thing allowed; every
 * component has its own tests beside its effect file (src/domain/effects/components).
 *
 * With SHOTS=1 the Russian journeys also write their screenshots to docs/phase4/shots.
 */

/** Seat 1 holds the home of the first faction of the link; 110 lies between it and 66. */
const MAP = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';
const link = (name: string, factions: string, map = MAP) => `/?name=${name}&map=${map.split(' ').join('+')}&factions=${factions}&me=1&exp=pok,te`;
const ARGENT = link('Waivers', 'argent,sol,hacan,letnev,saar,muaat');
/** The same map with the home of the Barony of Letnev, tile 10, at seat 1. */
const LETNEV = link('WaiversLetnev', 'letnev,sol,hacan,argent,saar,muaat', MAP.replace(' 58 ', ' 10 '));
const SHOTS = process.env.SHOTS === '1';

/** The words of the interface the journeys press, in both languages. */
const WORDS = {
  en: {
    plan: 'Plan & map', add: 'Add action', tactical: 'Tactical action', setup: 'Setup', close: 'Close', back: 'Back', tile: 'Tile',
    take: (unit: string) => `Take one ${unit}`, used: '+ Used', pick: 'Choose a component', search: 'Search components', choose: (name: string) => `Choose ${name}`,
    allowed: 'Allowed by:', components: /^Components/, faction: /^Faction/, destroyer: 'Destroyer', infantry: 'Infantry', mech: 'Mech', cruiser: 'Cruiser', dock: 'Space dock',
    dreadnought: 'Dreadnought', carrier: 'Carrier',
  },
  ru: {
    plan: 'План и карта', add: 'Новое действие', tactical: 'Тактическое действие', setup: 'Расстановка', close: 'Закрыть', back: 'Назад', tile: 'Тайл',
    take: (unit: string) => `Взять: ${unit}`, used: '+ Использовал', pick: 'Выбор компонента', search: 'Поиск компонентов', choose: (name: string) => `Выбрать: ${name}`,
    allowed: 'Разрешено:', components: /^Компоненты/, faction: /^Фракция/, destroyer: 'Эсминец', infantry: 'Пехота', mech: 'Мех', cruiser: 'Крейсер', dock: 'База',
    dreadnought: 'Дредноут', carrier: 'Транспортник',
  },
} as const;
type Language = keyof typeof WORDS;

const panel = (page: Page) => page.locator('.plan-panel');
const stage = (page: Page) => page.locator('.stage-dialog');
const waived = (scope: Locator, code: string) => scope.locator(`li.warning-waived[data-code="${code}"]`);
const standing = (scope: Locator, code: string) => scope.locator(`li[data-code="${code}"]:not(.warning-waived)`);

async function open(page: Page, url: string, language: Language): Promise<void> {
  await page.addInitScript(lang => localStorage.setItem('ti4.lang', lang), language);
  await page.goto(url);
  await page.getByRole('button', { name: WORDS[language].plan }).click();
  await expect(tile(page, language, 66)).toBeVisible();
}

const tile = (page: Page, language: Language, n: number) => page.getByRole('button', { name: `${WORDS[language].tile} ${n}`, exact: true });

/** A tap on a system of the map once the map stands still. */
async function tapTile(page: Page, language: Language, n: number): Promise<void> {
  let last = '';
  await expect.poll(async () => {
    const now = JSON.stringify(await tile(page, language, n).boundingBox());
    const still = now === last;
    last = now;
    return still;
  }, { intervals: [150] }).toBe(true);
  await tile(page, language, n).click();
}

/** Units placed by hand in the home system. */
async function place(page: Page, language: Language, home: number, units: string[]): Promise<void> {
  const words = WORDS[language];
  await tile(page, language, home).click();
  await stage(page).getByRole('button', { name: words.setup, exact: true }).click();
  for (const unit of units) await stage(page).getByRole('button', { name: unit, exact: true }).click();
  await stage(page).getByRole('button', { name: words.close }).click();
}

/** A tactical action on tile 66 with one route from the home system through 110; the flight step is left open. */
async function startFlight(page: Page, language: Language, home: number): Promise<Locator> {
  const words = WORDS[language];
  await page.getByRole('button', { name: words.add }).click();
  await page.locator('.action-list').getByRole('button', { name: words.tactical, exact: true }).click();
  await tapTile(page, language, 66);
  await tapTile(page, language, home);
  await tapTile(page, language, 110);
  await tapTile(page, language, 66);
  const picker = panel(page).locator('.unit-picker');
  await expect(picker).toBeVisible();
  return picker;
}

const takeOne = (scope: Locator, language: Language, unit: string) => scope.getByRole('button', { name: WORDS[language].take(unit) }).first().click();

async function shot(page: Page, language: Language, name: string): Promise<void> {
  if (SHOTS && language === 'ru') await page.screenshot({ path: `docs/phase4/shots/${name}.png` });
}

/** The Argent Flight takes a mech aboard a destroyer that has one place, with an infantry on it already. */
async function mechAboard(page: Page, language: Language): Promise<Locator> {
  const words = WORDS[language];
  await open(page, ARGENT, language);
  await place(page, language, 58, [words.mech]);
  const picker = await startFlight(page, language, 58);
  await takeOne(picker, language, words.destroyer);
  await takeOne(picker, language, words.infantry);
  await expect(picker.locator('li[data-code="capacityGroup"]')).toHaveCount(0);
  await takeOne(picker, language, words.mech);
  return picker;
}

for (const language of ['en', 'ru'] as const) {
  const words = WORDS[language];

  test(`${language}: a mech rides on a destroyer beyond its capacity: the warning is listed as allowed by its component, and the entry is not marked`, async ({ page }) => {
    const picker = await mechAboard(page, language);
    const line = waived(picker, 'capacityGroup');
    await expect(line).toHaveCount(1);
    await expect(line).toContainText(`${words.allowed} Aerie Sentinel`);
    // The look of a thing switched off: struck through, and not in the colour of a warning.
    const look = await line.locator('.warning-text').evaluate(el => { const style = getComputedStyle(el); return { line: style.textDecorationLine, colour: style.color }; });
    const warningColour = await page.evaluate(() => { const probe = document.createElement('span'); probe.className = 'warning-text'; document.body.append(probe); const colour = getComputedStyle(probe).color; probe.remove(); return colour; });
    expect(look.line).toContain('line-through');
    expect(look.colour).not.toBe(warningColour);
    await shot(page, language, 'waived-capacity');

    // Back in the editor and in the list of the plan: listed, and the row has no warning edge.
    await page.getByRole('button', { name: words.back, exact: true }).click();
    await expect(waived(panel(page), 'capacityGroup').first()).toBeVisible();
    await expect(standing(panel(page), 'capacityGroup')).toHaveCount(0);
    await shot(page, language, 'waived-editor');
  });

  test(`${language}: a structure of the source planet is offered to the flight; without a component that allows it the warning stands`, async ({ page }) => {
    await open(page, ARGENT, language);
    const picker = await startFlight(page, language, 58);
    await takeOne(picker, language, words.carrier);
    await takeOne(picker, language, words.dock);
    await expect(standing(picker, 'structureAboard')).toHaveCount(1);
    await expect(waived(picker, 'structureAboard')).toHaveCount(0);
    await shot(page, language, 'structure-aboard');
  });

  test(`${language}: ships fly beyond the fleet pool; the hero named in «Used» allows it, and the result of the action asks for no removal`, async ({ page }) => {
    await open(page, LETNEV, language);
    // The hero is unlocked by hand: the second of its states.
    await page.getByRole('button', { name: words.components }).click();
    await page.locator('.tab-fan').getByRole('button', { name: words.faction }).click();
    await page.getByTestId('component-leader:letnevhero').locator('.segment > button').nth(1).click();
    await page.locator('.tab-fan').getByRole('button', { name: words.faction }).click();

    await place(page, language, 10, [words.cruiser, words.cruiser, words.cruiser, words.cruiser]);
    const picker = await startFlight(page, language, 10);
    for (const unit of [words.cruiser, words.cruiser, words.cruiser, words.cruiser, words.dreadnought, words.carrier]) await takeOne(picker, language, unit);
    // Six ships against the fleet pool of three and Armada's two more.
    await expect(standing(picker, 'fleetPool')).toHaveCount(1);
    await page.getByRole('button', { name: words.back, exact: true }).click();

    const used = panel(page).locator('[role="group"]').filter({ has: page.getByRole('button', { name: words.used }) }).last();
    const add = used.getByRole('button', { name: words.used });
    await add.click();
    const dialog = page.getByRole('dialog', { name: words.pick });
    await dialog.getByRole('searchbox', { name: words.search }).fill('Darktalon');
    await dialog.getByRole('button', { name: words.choose('Darktalon Treilla') }).click();
    await expect(used.getByTestId('component-leader:letnevhero')).toBeVisible();
    // The card stands under the button that added it.
    const button = (await add.boundingBox())!;
    const card = (await used.getByTestId('component-leader:letnevhero').boundingBox())!;
    expect(card.y).toBeGreaterThanOrEqual(button.y + button.height);

    await expect(waived(panel(page), 'fleetPool').first()).toContainText(`${words.allowed} Darktalon Treilla`);
    await expect(standing(panel(page), 'fleetPool')).toHaveCount(0);
    await shot(page, language, 'uses-block');
    await waived(panel(page), 'fleetPool').first().scrollIntoViewIfNeeded();
    await shot(page, language, 'waived-fleet-pool');
  });
}
