import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

/** The map string of the user's draft: seat 1 holds tile 58, the home of the Argent Flight. */
const MAP_STRING = '66 22 61 19 72 24 110 79 48 106 117 33 41 71 28 44 46 30 58 63 115 55 76 49 16 74 78 14 37 68 12 102 80 4 34 113';

/** The plan calls a system by its planets, and one without planets by what the map writes on it and its tile number. */
const HOME = 'Avar / Valk / Ylir';
const HOPE = "Hope's End";
const HORIZON = "El'Nath / Horizon / Luthien VI";
const ANG = 'Ang';
const ASTEROIDS = 'Asteroids (79)';

const tile = (page: Page, n: number) => page.getByRole('button', { name: `Tile ${n}`, exact: true });
const entry = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
/** The entries themselves: a warning inside one is a list item too. */
const actions = (page: Page) => page.getByRole('region', { name: 'Actions' }).locator('.entry');

/** The map is built on the game screen: the Milty string goes into the map block there. */
async function pasteMap(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Paste a Milty string' }).click();
  await page.getByLabel('Milty Draft map string').fill(MAP_STRING);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('30 tiles placed.')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
}

/** The map glides after a tap on the active system; wait until the element stops before a drag aims at it. */
async function centreWhenStill(target: Locator): Promise<{ x: number; y: number }> {
  let last = '';
  await expect.poll(async () => {
    const now = JSON.stringify(await target.boundingBox());
    const still = now === last;
    last = now;
    return still;
  }, { intervals: [150] }).toBe(true);
  const box = (await target.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** One pointer drags a route hex by hex, as a finger does. */
async function dragRoute(page: Page, hexes: number[]): Promise<void> {
  const points = [];
  for (const n of hexes) points.push(await centreWhenStill(tile(page, n)));
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (const p of points.slice(1)) await page.mouse.move(p.x, p.y, { steps: 8 });
  await page.mouse.up();
}

test('a game from the first screen to an exported file, and back offline', async ({ page, context }, testInfo) => {
  await page.addInitScript(() => {
    // Set once: the language survives the reloads below, the test changes it at the end.
    if (localStorage.getItem('ti4.lang') === null) localStorage.setItem('ti4.lang', 'en');
  });
  await page.goto('/');
  const summary = (name: string) => page.getByRole('group', { name, exact: true });

  await test.step('the precache is small and leaves the prototype pages out', async () => {
    const sw = await (await page.request.get('/sw.js')).text();
    expect(sw).not.toMatch(/approved|docs\//);
    const entries = sw.match(/url:"[^"]+"/g) ?? [];
    expect(entries.length).toBeGreaterThanOrEqual(5);
    expect(entries.length).toBeLessThan(20);
    for (const needle of ['index.html', /assets\/index-[^"]+\.js/, /assets\/index-[^"]+\.css/]) {
      expect(entries.some(e => (typeof needle === 'string' ? e.includes(needle) : needle.test(e)))).toBe(true);
    }
  });

  await test.step("start a game with Prophecy of Kings and Thunder's Edge", async () => {
    await expect(page.getByRole('button', { name: 'Prophecy of Kings' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: "Thunder's Edge" })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'My faction', exact: true }).click();
    await page.getByRole('button', { name: 'The Argent Flight' }).click();
  });

  await test.step('build the map on the game screen before the start', async () => {
    // A tap on a slot asks for its number where the page stands: it does not scroll.
    const aside = page.locator('.players-aside');
    // A slot in the middle of the minimap at the upper edge of the panel, its upper rows above the fold.
    const slot = page.locator('[data-slot="1,0"]');
    await aside.evaluate(el => {
      const box = el.getBoundingClientRect();
      const hex = el.querySelector('[data-slot="1,0"]')!.getBoundingClientRect();
      el.scrollTop += hex.top - box.top - 4;
    });
    const before = await aside.evaluate(el => el.scrollTop);
    await slot.click();
    await expect(page.getByLabel('Tile number')).toBeFocused();
    expect(await aside.evaluate(el => el.scrollTop)).toBe(before);
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: 'Paste a Milty string' }).click();
    await page.getByLabel('Milty Draft map string').fill(MAP_STRING);
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByText('30 tiles placed.')).toBeVisible();
    await expect(page.getByText('Home systems placed: 6.')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText(/The map is built/)).toBeVisible();
    await page.getByRole('button', { name: 'Start game' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 66)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Build map' })).toHaveCount(0);
  });

  await test.step('set an infantry on Horizon to pick up later', async () => {
    await tile(page, 110).click();
    // A tap on the map opens the hex on Control; units are placed in Setup.
    await page.getByRole('button', { name: 'Setup', exact: true }).click();
    await page.getByRole('button', { name: 'Infantry' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(entry(page, `Setup · ${HORIZON}`)).toBeVisible();
  });

  await test.step('plan a tactical action with a route and a pickup', async () => {
    await page.getByRole('button', { name: 'Add action' }).click();
    await page.getByRole('button', { name: 'Tactical action' }).click();
    await tile(page, 66).click();
    await expect(page.getByText(`Active system: ${HOPE}`)).toBeVisible();
    await dragRoute(page, [58, 110, 66]);
    await expect(page.getByText(`Flight ${HOME} → ${HOPE}`)).toBeVisible();
    await page.getByRole('button', { name: 'Take one Carrier' }).click();
    await page.getByRole('group', { name: 'Horizon' }).getByRole('button', { name: 'Take one Infantry' }).click();
    await expect(page.getByRole('heading', { name: 'Cargo on board: 1 of 4' })).toBeVisible();
    await page.getByRole('button', { name: 'Fly' }).click();
    await page.getByRole('button', { name: 'Land one Infantry' }).click();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(entry(page, `Tactical action · ${HOPE}`)).toBeVisible();
  });

  await test.step('tap the entry to read it, the pencil to edit it', async () => {
    await entry(page, `Tactical action · ${HOPE}`).click();
    await expect(page.getByText(`Fly ${HOME} → ${HORIZON} → ${HOPE}`)).toBeVisible();
    await expect(page.getByText(`Pick up on the way in ${HORIZON}`)).toBeVisible();
    await expect(page.getByText("Land on Hope's End")).toBeVisible();
    await page.getByRole('button', { name: `Edit: Tactical action · ${HOPE}` }).click();
    await expect(page.getByRole('group', { name: "Landing on Hope's End" })).toBeVisible();
    // A real edit: drop the landing, and the reading no longer has that step.
    await page.getByRole('button', { name: 'Give back Infantry' }).click();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await entry(page, `Tactical action · ${HOPE}`).click();
    await expect(page.getByText(`Fly ${HOME} → ${HORIZON} → ${HOPE}`)).toBeVisible();
    await expect(page.getByText("Land on Hope's End")).toHaveCount(0);
    // Close the reading, so the camera goes back to the whole map.
    await entry(page, `Tactical action · ${HOPE}`).click();
    await expect(page.getByText(`Fly ${HOME} → ${HORIZON} → ${HOPE}`)).toHaveCount(0);
    await page.getByRole('listitem', { name: `Tactical action · ${HOPE}` }).getByRole('checkbox', { name: 'Done' }).check();
    await expect(summary('Tactic')).toHaveText(/(?<!\d)2$/);
  });

  await test.step('add a status entry with points', async () => {
    await page.getByRole('button', { name: 'Tokens and points' }).click();
    await page.getByRole('button', { name: 'Add one Tactic' }).click();
    await page.getByRole('button', { name: 'Add one Argent' }).click();
    await expect(summary('VP')).toHaveText(/(?<!\d)1$/);
  });

  await test.step('open the stage and buy a unit', async () => {
    await tile(page, 58).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByRole('button', { name: 'Destroyer', exact: true }).click();
    await expect(page.getByText('Bought: 1')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
  });

  await test.step('play a strategy card', async () => {
    // The first tap shows the card, the second makes it the backup, the third the main one.
    await page.getByRole('button', { name: '5 Trade' }).click();
    await page.getByRole('button', { name: '5 Trade' }).click();
    await page.getByRole('button', { name: '5 Trade' }).click();
    await page.getByRole('button', { name: 'Add action' }).click();
    await page.getByRole('button', { name: 'Strategy', exact: true }).click();
    await expect(page.getByRole('button', { name: '5 Trade' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(summary('Trade goods')).toHaveText(/(?<!\d)3$/);
  });

  // Setup, tactical action, purchase and strategy card in the action phase, one status entry.
  const entryCount = await actions(page).count();
  expect(entryCount).toBe(4);

  await test.step('reload with the service worker offline', async () => {
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    // The first reload lets the worker take control of the page.
    await page.reload();
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
    await context.setOffline(true);
    // Prove the network is down: only the worker's cache can answer the reload.
    expect(await page.evaluate(() => fetch('/not-cached.txt').then(() => 'online', () => 'offline'))).toBe('offline');
    await page.reload();
    // The game has no name, so the address does not open it: it waits among the saves.
    await expect(page.getByRole('heading', { name: 'Players' })).toBeVisible();
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(tile(page, 66)).toBeVisible();
    await expect(actions(page)).toHaveCount(entryCount);
    await expect(page.getByRole('img', { name: 'Carrier ×1' }).first()).toBeVisible();
    await context.setOffline(false);
  });

  await test.step('export the game and import it back', async () => {
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export to file' }).click();
    const file = testInfo.outputPath('game.json');
    await (await download).saveAs(file);
    const exported = JSON.parse(readFileSync(file, 'utf8')) as { faction: string; plans: { rounds: { entries: unknown[] }[] }[] };
    expect(exported.faction).toBe('argent');
    expect(exported.plans[0].rounds[0].entries).toHaveLength(entryCount + 1);

    await page.locator('input[type=file]').setInputFiles({ name: 'game.json', mimeType: 'application/json', buffer: readFileSync(file) });
    // The imported game opens at once: it is the chosen one of the two saves and has nothing to open.
    await expect(page.locator('.saved-list li')).toHaveCount(2);
    await expect(page.locator(".saved-list li[aria-current='true']")).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Open' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Plan & map' }).click();
    await expect(actions(page)).toHaveCount(entryCount);
  });

  await test.step('a language choice sticks across a reload', async () => {
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    await page.getByRole('radio', { name: 'Русский' }).click();
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Русский' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('Язык')).toBeVisible();
  });
});

test('the tabs of the left drawers stay beside the map through the actions, and only a phone hides them with the map', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');
  await page.getByRole('button', { name: 'My faction', exact: true }).click();
  await page.getByRole('button', { name: 'The Argent Flight' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await pasteMap(page);
  await page.getByRole('button', { name: 'Plan & map' }).click();

  const players = page.locator('.drawer-tab-left').first();
  const legend = page.locator('.drawer-tab-left').last();
  const tabsStay = async () => {
    await expect(players).toBeVisible();
    await expect(legend).toBeVisible();
  };
  await tabsStay();

  // Choosing the active system takes the editor to the plan.
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.getByRole('button', { name: 'Tactical action' }).click();
  await tile(page, 66).click();
  await expect(page.getByText(`Active system: ${HOPE}`)).toBeVisible();
  await tabsStay();

  // A route does the same.
  await dragRoute(page, [58, 110, 66]);
  await expect(page.getByText(`Flight ${HOME} → ${HOPE}`)).toBeVisible();
  await tabsStay();

  // The drawer really opens from there.
  await players.click();
  await expect(players).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('drawer-scrim').click({ position: { x: 1100, y: 400 } });
  await expect(players).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await tabsStay();

  // A strategy card opens in the plan.
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.getByRole('button', { name: 'Strategy', exact: true }).click();
  await tabsStay();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await tabsStay();

  // On a phone the plan replaces the map, and the tabs go with it.
  await page.setViewportSize({ width: 390, height: 800 });
  await page.getByRole('button', { name: 'Plan', exact: true }).click();
  await expect(players).toBeHidden();
  await page.getByRole('button', { name: 'Map', exact: true }).click();
  await expect(players).toBeVisible();
});

test('a route is drawn by a finger, tapped on, and drawn on again, and the panel adds and removes sources', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');
  await page.getByRole('button', { name: 'My faction', exact: true }).click();
  await page.getByRole('button', { name: 'The Argent Flight' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await pasteMap(page);
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.getByRole('button', { name: 'Tactical action' }).click();
  await tile(page, 66).click();

  // The field chooses another system while the action is empty.
  await page.getByRole('button', { name: new RegExp(`^Active system: ${HOPE}`) }).click();
  await tile(page, 61).click();
  await expect(page.getByText(`Active system: ${ANG}`)).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`^Active system: ${ANG}`) }).click();
  await tile(page, 66).click();
  await expect(page.getByText(`Active system: ${HOPE}`)).toBeVisible();

  // A real finger: a stroke lifted half way, then a tap removes nothing it should not, then the stroke goes on.
  await dragRoute(page, [58, 110]);
  const hint = page.getByRole('status');
  await expect(hint).toContainText('finish on the active system');
  await expect(tile(page, 110)).toHaveClass(/tile-path/);
  await tile(page, 79).click();
  await expect(tile(page, 79)).toHaveClass(/tile-path/);
  await dragRoute(page, [79, 66]);
  await expect(page.getByText(`Flight ${HOME} → ${HOPE}`)).toBeVisible();
  await expect(hint).toHaveCount(0);
  // A source stays in the action only with something taken from it.
  await page.getByRole('button', { name: 'Take one Carrier' }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: `${HOME} via ${HORIZON}, ${ASTEROIDS}`, exact: false })).toBeVisible();

  // Taps first, the finger after.
  await tile(page, 110).click();
  await tile(page, 48).click();
  await dragRoute(page, [48, 66]);
  await expect(page.getByText(`Flight ${HORIZON} → ${HOPE}`)).toBeVisible();
  await page.getByRole('button', { name: 'Remove route' }).click();

  // The button only starts a route from the source; it is recorded on reaching the active system.
  await page.getByRole('button', { name: 'Add source' }).click();
  await tile(page, 110).click();
  await expect(page.getByText(`Flight ${HORIZON} → ${HOPE}`)).toHaveCount(0);
  await expect(tile(page, 110)).toHaveClass(/tile-path/);
  await tile(page, 66).click();
  await expect(page.getByText(`Flight ${HORIZON} → ${HOPE}`)).toBeVisible();
  // Nothing of mine stands there to take: back in the editor the source goes by itself.
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: `Remove source ${HORIZON}` })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Remove source ${HOME}` })).toBeVisible();
});

test('a route is drawn from a system without ships, and left with nothing taken its row and its arrow fade away', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');
  await page.getByRole('button', { name: 'My faction', exact: true }).click();
  await page.getByRole('button', { name: 'The Argent Flight' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await pasteMap(page);
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.getByRole('button', { name: 'Tactical action' }).click();
  await tile(page, 66).click();

  // A source that stays: the home system with a carrier taken.
  await dragRoute(page, [58, 110, 79, 66]);
  await page.getByRole('button', { name: 'Take one Carrier' }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  const routes = page.locator('.routes .route-line');
  const rows = page.locator('.tactical-editor .source-row:has(.icon-remove)');
  await expect(rows).toHaveCount(1);
  const drawn = await routes.count();

  // No ships of mine stand in the asteroids: the finger still draws from there, and the hint says so while it does.
  const from = await centreWhenStill(tile(page, 79));
  const to = await centreWhenStill(tile(page, 66));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
  await expect(page.getByRole('status')).toContainText('No ships where the route starts.');
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByText(`Flight ${ASTEROIDS} → ${HOPE}`)).toBeVisible();
  await expect(page.getByText('No ships here.')).toBeVisible();
  expect(await routes.count()).toBeGreaterThan(drawn);

  // Back with nothing taken: the row and the arrow are still there, fading, and then they are gone; the other source stays.
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('.tactical-editor .source-row.vanishing')).toHaveCount(1);
  await expect(page.locator('.routes .route-leaving').first()).toBeAttached();
  await expect(page.locator('.tactical-editor .source-row.vanishing')).toHaveCount(0);
  await expect(page.locator('.routes .route-leaving')).toHaveCount(0);
  await expect(routes).toHaveCount(drawn);
  await expect(rows).toHaveCount(1);
  await expect(page.getByRole('button', { name: `Remove source ${HOME}` })).toBeVisible();

  // The same by taps, and with smooth motion turned off it goes at once.
  await page.evaluate(() => { document.documentElement.dataset.motion = 'off'; });
  await tile(page, 79).click();
  await tile(page, 66).click();
  await expect(page.getByText(`Flight ${ASTEROIDS} → ${HOPE}`)).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(routes).toHaveCount(drawn);
  await expect(rows).toHaveCount(1);
});

test('a link makes a named game, opens it again, and asks when it disagrees with the save', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  const link = `/?name=Friday&exp=pok&factions=argent,sol,hacan&map=${MAP_STRING.split(' ').slice(0, 6).join('+')}`;

  // No such save: the game is made, opened and saved, and the address tells all about it.
  await page.goto(link);
  await expect(page.getByRole('textbox', { name: 'Game name' })).toHaveValue('Friday');
  await expect(page.getByRole('button', { name: 'Plan & map' })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('name')).toBe('Friday');
  expect(new URL(page.url()).searchParams.get('factions')).toMatch(/^[0-9a-f]{3},[0-9a-f]{3},[0-9a-f]{3}$/);

  // The address can be reloaded or passed on as it is: the same save opens, and nothing is asked.
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await page.getByRole('button', { name: 'Game', exact: true }).click();
  const before = page.url();
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Game name' })).toHaveValue('Friday');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => page.url()).toBe(before);

  // The same link: the save opens, nothing is asked and nothing is added.
  await page.goto(link);
  await expect(page.getByRole('textbox', { name: 'Game name' })).toHaveValue('Friday');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.saved-list strong', { hasText: /^Friday$/ })).toHaveCount(1);

  // Another map under the same name: the player chooses, and ignoring keeps the save.
  await page.goto('/?name=Friday&exp=pok&factions=argent,sol,hacan&map=30');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('map tiles');
  await dialog.getByRole('button', { name: 'Ignore the link, open the save' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Game name' })).toHaveValue('Friday');

  // Again, and this time a new game under another name, beside the save.
  await page.goto('/?name=Friday&exp=pok&factions=argent,sol,hacan&map=30');
  await expect(dialog.getByRole('textbox', { name: 'Name of the new game' })).toHaveValue('Friday 2');
  await dialog.getByRole('button', { name: 'Create a new game' }).click();
  await expect(page.getByRole('textbox', { name: 'Game name' })).toHaveValue('Friday 2');
  await expect(page.locator('.saved-list strong', { hasText: /^Friday( 2)?$/ })).toHaveCount(2);
});

test('a flight loops in the details by default, and with the setting off plays once on details and once on done', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ti4.lang', 'en');
    // Every run mounts a new layer, so counting the layers counts the plays.
    const seen = new WeakSet<Element>();
    const counter = window as unknown as { flights: number };
    counter.flights = 0;
    new MutationObserver(() => {
      for (const layer of document.querySelectorAll('.flight-layer')) {
        if (!seen.has(layer)) {
          seen.add(layer);
          counter.flights += 1;
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const flights = () => page.evaluate(() => (window as unknown as { flights: number }).flights);
  /** Waits out the flight and the pause a loop would take before the next one. */
  const staysAt = async (count: number) => {
    await expect.poll(flights).toBe(count);
    await expect(page.locator('.flight-layer')).toHaveCount(0, { timeout: 15000 });
    await page.waitForTimeout(1500);
    expect(await flights()).toBe(count);
  };

  await page.goto('/');
  await page.getByRole('button', { name: 'My faction', exact: true }).click();
  await page.getByRole('button', { name: 'The Argent Flight' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await pasteMap(page);
  await page.getByRole('button', { name: 'Plan & map' }).click();
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.getByRole('button', { name: 'Tactical action' }).click();
  await tile(page, 66).click();
  await dragRoute(page, [58, 110, 66]);
  await page.getByRole('button', { name: 'Take one Carrier' }).click();
  // The flight is a step without «Done»: back to the editor first.
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  // A later action, whose unit must not blink on the map while the first one repeats.
  await page.getByRole('button', { name: 'Add action' }).click();
  await page.getByRole('button', { name: 'Tactical action', exact: true }).click();
  await tile(page, 110).click();
  await dragRoute(page, [58, 110]);
  await page.getByRole('button', { name: 'Take one Destroyer' }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const laterUnit = tile(page, 110).getByRole('img', { name: /Destroyer/ });
  await expect(laterUnit).not.toHaveCount(0);

  const row = entry(page, `Tactical action · ${HOPE}`);

  // On by default: the details keep flying.
  await row.click();
  await expect.poll(flights, { timeout: 20000 }).toBeGreaterThanOrEqual(2);
  // Between the repeats the map stands right after this action, without what comes later.
  await expect(page.locator('.flight-layer')).toHaveCount(0, { timeout: 15000 });
  await expect(laterUnit).toHaveCount(0);
  await row.click();
  await expect(page.locator('.flight-layer')).toHaveCount(0);
  await expect(laterUnit).not.toHaveCount(0);

  await page.getByRole('button', { name: 'Game', exact: true }).click();
  await page.getByRole('button', { name: 'Loop flights' }).click();
  await page.getByRole('button', { name: 'Plan & map' }).click();

  // Off: one play on opening the details, and another on opening them again.
  let count = await flights();
  await row.click();
  count += 1;
  await staysAt(count);
  await row.click();
  await row.click();
  count += 1;
  await staysAt(count);
  await row.click();

  // Off: one play on marking it done, none on taking the mark back.
  await page.getByRole('listitem', { name: `Tactical action · ${HOPE}` }).getByRole('checkbox', { name: 'Done' }).check();
  count += 1;
  await staysAt(count);
  await page.getByRole('listitem', { name: `Tactical action · ${HOPE}` }).getByRole('checkbox', { name: 'Done' }).uncheck();
  await page.waitForTimeout(500);
  expect(await flights()).toBe(count);
});

test('a faction whose home is not on the pasted map starts at its seat and can send a route', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ti4.lang', 'en'));
  await page.goto('/');
  await page.getByRole('button', { name: 'My faction', exact: true }).click();
  await page.getByRole('button', { name: 'The Federation of Sol' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await pasteMap(page);
  await page.getByRole('button', { name: 'Plan & map' }).click();

  // The seat keeps its number and holds the start units although tile 58 is another faction's home.
  await expect(tile(page, 58).getByRole('img', { name: 'Seat 1' })).toBeVisible();
  await expect(tile(page, 58).getByRole('img', { name: 'Carrier ×2' })).toBeVisible();

  await page.getByRole('button', { name: 'Add action' }).click();
  await page.getByRole('button', { name: 'Tactical action' }).click();
  await tile(page, 66).click();
  await dragRoute(page, [58, 110, 66]);
  await expect(page.getByText(`Flight ${HOME} → ${HOPE}`)).toBeVisible();

  await page.getByRole('button', { name: 'Game', exact: true }).click();
  await expect(page.getByText('Seat 1 holds the home system of The Argent Flight, and your faction is The Federation of Sol.')).toBeVisible();
});
