import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { componentById, noteAddress, noteBase, noteId, textOf } from './components';
import { COMPONENT_GROUPS, groupCounts, heldOnce, holdingRounds, holdingsOf, losable, noteCards, noteOwner, notesOfFirst, noteText, ownNotes, setLeader, setStartHolding, tradable, upgradesOf, upgradeTech } from './holdings';
import { createGame } from './newGame';
import { addPlayer, draftWithExpansions, gameAs, removePlayer, setPlayerFaction } from './players';
import { forgetTimelines, project, readyToPlay, timelineOf } from './project';
import { CARD } from './strategy';
import { codesOf, forecast, primary, rulesGame, rulesPack, statusTokens, tech } from './rules/kit';
import type { Entry, Game, Opponent } from './types';
import { fleetSpeed } from './movement';
import { capacity } from './replay/transport';
import { productionCost } from './unitStats';

const pack = rulesPack();
const pok = loadPack(['pok']);
const RIVAL: Opponent = { id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 };
const withRival = { opponents: [RIVAL], playerCount: 3 };

let next = 0;
const entry = (body: Record<string, unknown>, extra: Partial<Entry> = {}): Entry =>
  ({ id: `h${(next += 1)}`, phase: 'action', status: 'planned', ...body, ...extra } as Entry);
const component = (componentId: string | undefined, extra: Partial<Entry> = {}): Entry => entry({ type: 'component', note: '', componentId }, extra);
/** An entry with no effect of its own, to carry `gains` and `spends`. */
const change = (extra: Record<string, unknown> = {}): Entry => entry({ type: 'adjustment', label: '', delta: {}, ...extra });

describe('the holdings a game begins with', () => {
  test('a new game holds its faction\'s starting technologies', () => {
    const base = loadPack([]);
    const game = createGame({ expansions: [], playerCount: 6, faction: 'sol' }, base);
    expect(game.start.me.technologies).toEqual(['technology:amd', 'technology:nm']);
    expect(project(game, game.plans[0], 'forecast', base).state.holdings.technologies).toEqual(['technology:amd', 'technology:nm']);
  });

  test('choosing a faction gives its starting technologies, to me and to an opponent, and takes the old faction\'s away', () => {
    const base = loadPack([]);
    const blank = createGame({ expansions: [], playerCount: 6, faction: '' }, base);
    const mine = setPlayerFaction(blank, 0, 'sol', base);
    expect(mine.start.me.technologies).toEqual(['technology:amd', 'technology:nm']);
    const rival = setPlayerFaction(mine, 1, 'jolnar', base);
    expect(rival.start.opponents[rival.opponents[0].id].technologies).toEqual(['technology:amd', 'technology:st', 'technology:nm', 'technology:ps']);
    const changed = setPlayerFaction(rival, 0, 'muaat', base);
    expect(changed.start.me.technologies).toEqual(['technology:ps']);
  });

  test('a faction that chooses its starting technologies begins with none set', () => {
    const base = loadPack([]);
    expect(createGame({ expansions: [], playerCount: 6, faction: 'winnu' }, base).start.me.technologies ?? []).toEqual([]);
  });

  test('a mark set by hand survives a change of faction; only the old faction\'s starting technologies go', () => {
    const base = loadPack([]);
    const game = setStartHolding(createGame({ expansions: [], playerCount: 6, faction: 'sol' }, base), 'me', 'technology:gd', true);
    expect(setPlayerFaction(game, 0, 'muaat', base).start.me.technologies).toEqual(['technology:gd', 'technology:ps']);
  });

  test('an opponent who leaves takes their start holdings along', () => {
    const base = loadPack([]);
    const game = setPlayerFaction(createGame({ expansions: [], playerCount: 6, faction: 'sol' }, base), 1, 'jolnar', base);
    const leaving = game.opponents[0].id;
    const next = removePlayer(game, 1, base);
    expect(Object.keys(next.start.opponents)).toEqual(next.opponents.map(o => o.id));
    expect(next.start.opponents[leaving]).toBeUndefined();
  });

  test('setStartHolding files a component by its kind; a hand keeps repeats, the rest holds one of each', () => {
    let game = rulesGame();
    game = setStartHolding(game, 'me', 'actionCard:bribery', true);
    game = setStartHolding(game, 'me', 'actionCard:bribery', true);
    game = setStartHolding(game, 'me', 'relic:nanoforge', true);
    game = setStartHolding(game, 'me', 'relic:nanoforge', true);
    game = setStartHolding(game, 'me', 'secretObjective:ans', true);
    game = setStartHolding(game, 'me', 'publicObjective:corner', true);
    game = setStartHolding(game, 'me', 'promissory:<color>_cf', true);
    game = setStartHolding(game, 'me', 'breakthrough:solbt', true);
    expect(game.start.me).toEqual({
      hand: ['actionCard:bribery', 'actionCard:bribery'], relics: ['relic:nanoforge'], secrets: ['secretObjective:ans'],
      scored: ['publicObjective:corner'], promissory: ['promissory:<color>_cf'], breakthrough: 'held',
    });
    game = setStartHolding(game, 'me', 'actionCard:bribery', false);
    game = setStartHolding(game, 'me', 'relic:nanoforge', false);
    game = setStartHolding(game, 'me', 'breakthrough:solbt', false);
    expect(game.start.me.hand).toEqual(['actionCard:bribery']);
    expect(game.start.me.relics).toEqual([]);
    expect(game.start.me.breakthrough).toBeUndefined();
  });

  test('setStartHolding and setLeader edit an opponent the same way as me (Review Focus 5)', () => {
    let game = rulesGame({ game: withRival });
    game = setStartHolding(game, RIVAL.id, tech('carrier'), true);
    game = setLeader(game, RIVAL.id, 'leader:solagent', 'exhausted');
    game = setLeader(game, 'me', 'leader:solhero', 'unlocked');
    expect(game.start.opponents[RIVAL.id]).toEqual({ technologies: [tech('carrier')], leaders: { 'leader:solagent': 'exhausted' } });
    expect(game.start.me).toEqual({ leaders: { 'leader:solhero': 'unlocked' } });
    const { state } = forecast(game, pok);
    expect(state.holdings.technologies).toEqual([]);
    expect(state.rivals?.[RIVAL.id].holdings.technologies).toEqual([tech('carrier')]);
    expect(state.rivals?.[RIVAL.id].holdings.leaders).toEqual({ 'leader:solagent': 'exhausted' });
    expect(setLeader(game, 'me', 'leader:solhero', null).start.me.leaders).toEqual({});
    // An unknown player changes nothing.
    expect(setStartHolding(game, 'nobody', tech('carrier'), true)).toBe(game);
  });

  test('the game as an opponent plays it begins with that opponent\'s holdings', () => {
    const game = setStartHolding(setStartHolding(rulesGame({ game: withRival }), RIVAL.id, tech('carrier'), true), 'me', tech('cruiser'), true);
    const view = gameAs(game, RIVAL.id);
    expect(view.start.me).toEqual({ technologies: [tech('carrier')] });
    expect(view.start.opponents.me).toEqual({ technologies: [tech('cruiser')] });
  });
});

describe('holdings derived from entries', () => {
  test('gains of an entry add to the owner\'s holdings by kind, and spends remove one copy', () => {
    const draw = change({ gains: ['actionCard:bribery', 'actionCard:bribery', 'relic:nanoforge', 'technology:gd', 'secretObjective:ans', 'publicObjective:corner', 'promissory:<color>_cf', 'leader:solhero', 'breakthrough:solbt'] });
    const give = change({ spends: ['actionCard:bribery', 'relic:nanoforge', 'promissory:<color>_cf'] });
    // The breakthrough is the player's own faction's: one of another faction is not held by gaining it.
    const { state } = forecast(rulesGame({ entries: [draw, give], game: { faction: 'sol' } }), loadPack(['pok', 'te']));
    expect(state.holdings).toEqual({
      technologies: ['technology:gd'], hand: ['actionCard:bribery'], relics: [], promissory: [], leaders: { 'leader:solhero': 'unlocked' },
      breakthrough: 'held', scored: ['publicObjective:corner'], secrets: ['secretObjective:ans'], found: [], exhausted: [],
    });
  });

  test('a technology gained twice is held once', () => {
    const { state } = forecast(rulesGame({ entries: [change({ gains: ['technology:gd'] }), change({ gains: ['technology:gd'] })] }), pack);
    expect(state.holdings.technologies).toEqual(['technology:gd']);
  });

  test('a law gained stays in play as a law of the whole game, whoever\'s entry brought it', () => {
    const mine = change({ gains: ['agenda:conventions'] });
    const theirs = change({ gains: ['agenda:revolution'] });
    const { state } = forecast(rulesGame({ entries: [mine, { ...theirs, owner: RIVAL.id }], game: withRival }), pack);
    expect(state.laws).toEqual(['agenda:conventions', 'agenda:revolution']);
    expect(state.rivals?.[RIVAL.id].laws).toBeUndefined();
    const repealed = forecast(rulesGame({ entries: [mine, change({ spends: ['agenda:conventions'] })] }), pack).state;
    expect(repealed.laws).toEqual([]);
  });

  test.todo('an exploration card with an attachment gained by an entry goes to the planet\'s attachments — left for part 4: gains name no planet');

  test('a rival\'s entry changes the rival\'s holdings only (Review Focus 5)', () => {
    const draw = change({ gains: ['actionCard:bribery', tech('carrier')] });
    const { state } = forecast(rulesGame({ entries: [{ ...draw, owner: RIVAL.id }], game: withRival }), pack);
    expect(state.holdings).toEqual(holdingsOf());
    expect(state.rivals?.[RIVAL.id].holdings.hand).toEqual(['actionCard:bribery']);
    expect(state.rivals?.[RIVAL.id].holdings.technologies).toEqual([tech('carrier')]);
  });

  test('an unknown component id is passed over without a crash, in the start, gains, spends, research, scoring and play (Review Focus 3)', () => {
    const entries = [
      change({ gains: ['relic:gone', 'nonsense', 'actionCard:bribery'], spends: ['relic:gone', 'leader:gone'] }),
      component('actionCard:gone'),
      primary(CARD.technology, { researched: ['technology:gone'] }),
      entry({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: ['secretObjective:gone'] }, { phase: 'status' }),
    ];
    const game = rulesGame({ entries, game: { start: { me: { technologies: ['technology:gone', tech('carrier')], relics: ['relic:gone'], leaders: { 'leader:gone': 'unlocked' } }, opponents: {} } } });
    const { state, warnings } = forecast(game, pack);
    expect(state.holdings).toEqual({ ...holdingsOf(), technologies: [tech('carrier')], hand: ['actionCard:bribery'] });
    expect(Object.values(warnings).flat()).toEqual([]);
    expect(upgradesOf({ technologies: ['technology:gone', 'relic:nanoforge', tech('carrier')] }, pack)).toEqual(['carrier']);
  });

  test('a relic of an expansion that is off is unknown: Prophecy of Kings off, it is not held', () => {
    const game = rulesGame({ entries: [change({ gains: ['relic:nanoforge'] })] });
    expect(componentById(pack, 'relic:nanoforge')).toBeUndefined();
    expect(forecast(game, pack).state.holdings.relics).toEqual([]);
    expect(forecast(game, pok).state.holdings.relics).toEqual(['relic:nanoforge']);
  });

  test('a cancelled entry gains nothing, and "now" counts only the done ones', () => {
    const cancelled = change({ gains: ['actionCard:bribery'] });
    const planned = change({ gains: ['actionCard:assassin'] });
    const done = change({ gains: ['actionCard:abs'] });
    const game = rulesGame({ entries: [{ ...cancelled, status: 'cancelled' }, planned, { ...done, status: 'done' }] });
    expect(forecast(game, pack).state.holdings.hand).toEqual(['actionCard:assassin', 'actionCard:abs']);
    expect(project(game, game.plans[0], 'now', pack).state.holdings.hand).toEqual(['actionCard:abs']);
  });
});

describe('a component action names its component', () => {
  test('an action card played leaves the hand', () => {
    const play = component('actionCard:bribery');
    const game = rulesGame({ entries: [change({ gains: ['actionCard:bribery', 'actionCard:bribery'] }), play] });
    expect(forecast(game, pack).state.holdings.hand).toEqual(['actionCard:bribery']);
    expect(codesOf(game, pack, play)).toEqual([]);
  });

  test('playing a component not held warns componentNotHeld and still applies', () => {
    const play = component('leader:solagent');
    const game = rulesGame({ entries: [play] });
    expect(forecast(game, pok).warnings[play.id]).toEqual([{ code: 'componentNotHeld', params: { id: 'leader:solagent', name: 'Evelyn DeLouis' } }]);
    expect(forecast(game, pok).state.holdings.leaders).toEqual({ 'leader:solagent': 'exhausted' });
    const card = component('actionCard:bribery');
    expect(codesOf(rulesGame({ entries: [card] }), pack, card)).toEqual(['componentNotHeld']);
  });

  test('a component action without a component, or with an ability of the sheet, is not checked against the holdings', () => {
    const note = component(undefined);
    const ability = component('ability:orbital_drop');
    const game = rulesGame({ entries: [note, ability] });
    expect(codesOf(game, pack, note)).toEqual([]);
    expect(codesOf(game, pack, ability)).toEqual([]);
  });

  test('an agent is exhausted by its action, a hero purged, and a second use warns', () => {
    const first = component('leader:solagent');
    const again = component('leader:solagent');
    const hero = component('leader:solhero');
    const heroAgain = component('leader:solhero');
    const start = { me: { leaders: { 'leader:solagent': 'unlocked' as const, 'leader:solhero': 'unlocked' as const, 'leader:solcommander': 'unlocked' as const } }, opponents: {} };
    const commander = component('leader:solcommander');
    const game = rulesGame({ entries: [first, again, hero, heroAgain, commander], game: { start } });
    const { state } = forecast(game, pok);
    expect(state.holdings.leaders).toEqual({ 'leader:solagent': 'exhausted', 'leader:solhero': 'purged', 'leader:solcommander': 'unlocked' });
    expect(codesOf(game, pok, first)).toEqual([]);
    expect(codesOf(game, pok, again)).toEqual(['componentExhausted']);
    expect(codesOf(game, pok, hero)).toEqual([]);
    expect(codesOf(game, pok, heroAgain)).toEqual(['componentNotHeld']);
  });

  test('a technology whose text exhausts the card is exhausted by its action, and warns when played again', () => {
    const first = component('technology:gls');
    const again = component('technology:gls');
    const game = rulesGame({ entries: [first, again], game: { start: { me: { technologies: ['technology:gls'] }, opponents: {} } } });
    expect(forecast(game, pack).state.holdings.exhausted).toEqual(['technology:gls']);
    expect(forecast(game, pack).warnings[again.id]).toEqual([{ code: 'componentExhausted', params: { id: 'technology:gls', name: 'Graviton Laser System' } }]);
  });

  test('a relic whose text purges the card leaves the holdings when played', () => {
    const purged = Object.keys(pok.texts).find(id => id.startsWith('relic:') && /purge this card/i.test(pok.texts[id]))!;
    const game = rulesGame({ entries: [change({ gains: [purged] }), component(purged)] });
    expect(forecast(game, pok).state.holdings.relics).toEqual([]);
  });

  test('the status phase readies the exhausted components and the exhausted agents', () => {
    const start = { me: { technologies: ['technology:gls'], leaders: { 'leader:solagent': 'unlocked' as const } }, opponents: {} };
    const status = statusTokens(1, 1, 0);
    const game = rulesGame({ entries: [component('technology:gls'), component('leader:solagent'), status], game: { start } });
    const { state } = forecast(game, pok);
    expect(state.holdings.exhausted).toEqual([]);
    expect(state.holdings.leaders).toEqual({ 'leader:solagent': 'unlocked' });
  });

  test('a round with no status entry still readies the cards before the next round; a purged hero stays purged', () => {
    const start = { me: { technologies: ['technology:gls'], leaders: { 'leader:solagent': 'unlocked' as const, 'leader:solhero': 'unlocked' as const } }, opponents: {} };
    const later = component('technology:gls');
    const game = rulesGame({ rounds: [[component('technology:gls'), component('leader:solagent'), component('leader:solhero')], [later]], game: { start } });
    expect(codesOf(game, pok, later)).toEqual([]);
    expect(forecast(game, pok).state.holdings.leaders).toEqual({ 'leader:solagent': 'unlocked', 'leader:solhero': 'purged' });
  });

  test('a replay restarted from a later round readies the cards exactly as a full replay does', () => {
    const start = { me: { leaders: { 'leader:solagent': 'unlocked' as const } }, opponents: {} };
    const game = rulesGame({ rounds: [[component('leader:solagent')], [component('leader:solagent')], [component('leader:solagent')]], game: { start } });
    const plan = game.plans[0];
    timelineOf(game, plan, 'forecast', pok);
    const edited = { ...plan, rounds: [plan.rounds[0], plan.rounds[1], { ...plan.rounds[2], entries: [...plan.rounds[2].entries, component('leader:solagent')] }] };
    // The timeline of the edited plan resumes from the kept one; a fresh calculation must agree.
    const resumed = timelineOf(game, edited, 'forecast', pok);
    forgetTimelines();
    const full = timelineOf(game, edited, 'forecast', pok);
    expect(resumed.frames).toEqual(full.frames);
    expect(resumed.frames.map(f => f.warnings.map(w => w.code))).toEqual([[], [], [], ['componentExhausted']]);
  });

  test('an agent exhausted when the plan begins stays exhausted through the first round', () => {
    const play = component('leader:solagent');
    const game = rulesGame({ entries: [play], game: { start: { me: { leaders: { 'leader:solagent': 'exhausted' } }, opponents: {} } } });
    expect(codesOf(game, pok, play)).toEqual(['componentExhausted']);
  });
});

describe('scoring in the status phase', () => {
  test('a secret objective scored leaves the hand for the scored ones; a public one joins them and is revealed', () => {
    const status = entry({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: ['secretObjective:ans', 'publicObjective:corner'] }, { phase: 'status' });
    const game = rulesGame({ entries: [change({ gains: ['secretObjective:ans', 'secretObjective:btgk'] }), status] });
    const { state } = forecast(game, pack);
    expect(state.holdings.secrets).toEqual(['secretObjective:btgk']);
    expect(state.holdings.scored).toEqual(['secretObjective:ans', 'publicObjective:corner']);
    expect(state.revealed).toEqual(['publicObjective:corner']);
  });
});

describe('unit upgrades are technologies', () => {
  test('upgradeTech names the technology that upgrades a unit: the faction\'s own before the common one', () => {
    const base = loadPack([]);
    expect(upgradeTech(base, 'sol', 'carrier')).toBe('technology:ac2');
    expect(upgradeTech(base, 'jolnar', 'carrier')).toBe('technology:cv2');
    expect(upgradeTech(base, 'sol', 'spacedock')).toBe('technology:sd2');
    expect(upgradeTech(base, 'sol', 'flagship')).toBeUndefined();
    expect(tech('carrier')).toBe('technology:cv2');
  });

  test('upgradesOf is the units and structures whose upgrade technology is held', () => {
    expect(upgradesOf(holdingsOf({ technologies: ['technology:gd', tech('carrier'), tech('spacedock')] }), pack)).toEqual(['carrier', 'spacedock']);
    expect(upgradesOf(holdingsOf(), pack)).toEqual([]);
  });

  test('researching technology:<unit upgrade> raises that unit\'s stats exactly as the old upgrades did', () => {
    const research = primary(CARD.technology, { researched: [tech('carrier')] });
    const { state } = forecast(rulesGame({ entries: [research] }), pack);
    const game = rulesGame();
    expect(state.holdings.technologies).toEqual([tech('carrier')]);
    expect(fleetSpeed(game, { carrier: 1 }, state.holdings, pack)).toBe(2);
    expect(capacity(game, { carrier: 1 }, state.holdings, pack).capacity).toBe(6);
    expect(fleetSpeed(game, { carrier: 1 }, holdingsOf(), pack)).toBe(1);
    expect(capacity(game, { carrier: 1 }, holdingsOf(), pack).capacity).toBe(4);
    expect(productionCost({ carrier: 1 }, game.faction, state.holdings, pack)).toBe(3);
  });

  test('holdingRounds gives the first round an entry brings each component, by player', () => {
    const research = primary(CARD.technology, { researched: [tech('carrier')] });
    const later = primary(CARD.technology, { researched: [tech('carrier'), tech('cruiser')] });
    const theirs: Entry = { ...change({ gains: ['actionCard:bribery'] }), owner: RIVAL.id };
    const done: Entry = { ...change({ gains: ['relic:nanoforge'] }), status: 'done' };
    const cancelled: Entry = { ...change({ gains: ['relic:dynamiscore'] }), status: 'cancelled' };
    const scored = entry({ type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: ['publicObjective:corner'] }, { phase: 'status' });
    const game: Game = rulesGame({ rounds: [[done, cancelled], [research, theirs], [later, scored]], game: withRival });
    expect(holdingRounds(game.plans[0], 'forecast')).toEqual({
      me: { 'relic:nanoforge': 1, [tech('carrier')]: 2, [tech('cruiser')]: 3, 'publicObjective:corner': 3 },
      [RIVAL.id]: { 'actionCard:bribery': 2 },
    });
    expect(holdingRounds(game.plans[0], 'now')).toEqual({ me: { 'relic:nanoforge': 1 } });
  });
});

describe('a promissory note is the card of one player', () => {
  const TA = 'promissory:<color>_ta';
  const table = (extra: Partial<Game> = {}) => rulesGame({ game: { ...withRival, ...extra } });

  test('its id is the catalogue id with the address of its player; any other id has no address', () => {
    expect(noteId(TA, 'me')).toBe(`${TA}@me`);
    expect(noteId(`${TA}@me`, 'o1')).toBe(`${TA}@o1`);
    expect(noteBase(`${TA}@opponent-2`)).toBe(TA);
    expect(noteAddress(`${TA}@opponent-2`)).toBe('opponent-2');
    expect(noteBase(TA)).toBe(TA);
    expect(noteAddress(TA)).toBeUndefined();
    // Only a note is addressed: a map tile with a rotation keeps its `@` elsewhere, and so would any other id.
    expect(noteBase('relic:x@me')).toBe('relic:x@me');
    expect(noteAddress('relic:x@me')).toBeUndefined();
  });

  test('the catalogue knows an addressed note as its card under its own id, with the printed text; an unknown note stays unknown', () => {
    const base = componentById(pack, TA)!;
    expect(componentById(pack, `${TA}@o1`)).toEqual({ ...base, id: `${TA}@o1` });
    expect(textOf(pack, `${TA}@o1`)).toBe(textOf(pack, TA));
    // A text beside the main one is asked under `<id>#<name>`: the address is not part of that name.
    expect(noteBase(`${TA}@o1#unlock`)).toBe(`${TA}#unlock`);
    expect(textOf(pack, `${TA}@o1#unlock`)).toBe('');
    expect(componentById(pack, 'promissory:nothing@o1')).toBeUndefined();
    expect(componentById(pack, 'promissory:<color>_an@o1')).toBeUndefined();
    expect(componentById(pok, 'promissory:<color>_an@o1')?.name).toBe('Alliance');
  });

  test('noteOwner is the player addressed, when they are in the game; seen as an opponent, that opponent is the viewer', () => {
    const game = table();
    expect(noteOwner(game, `${TA}@me`)).toBe('me');
    expect(noteOwner(game, `${TA}@o1`)).toBe('o1');
    expect(noteOwner(game, `${TA}@gone`)).toBeUndefined();
    expect(noteOwner(game, TA)).toBeUndefined();
    const theirs = gameAs(game, 'o1');
    expect(noteOwner(theirs, `${TA}@o1`, 'o1')).toBe('o1');
    expect(noteOwner(theirs, `${TA}@me`, 'o1')).toBe('me');
  });

  test('noteText names the owner where the card says <color>; a faction note and a catalogue id read as printed', () => {
    const game = table();
    const nameOf = (player: string) => (player === 'o1' ? 'Hacan' : 'Sol');
    expect(noteText(game, pack, `${TA}@o1`, nameOf)).toBe('When the Hacan player replenishes commodities: The Hacan player gives you all of their commodities. Then, return this card to the Hacan player.');
    expect(noteText(game, pack, TA, nameOf)).toBe(textOf(pack, TA));
    expect(noteText(game, pack, 'promissory:convoys@o1', nameOf)).toBe(textOf(pack, 'promissory:convoys'));
  });

  test('an addressed note is held from the start: the replay does not pass it over as unknown', () => {
    const game = table({ start: { me: { promissory: [`${TA}@o1`, 'promissory:nothing@o1'] }, opponents: { o1: { promissory: [`${TA}@me`] } } } });
    const { state } = forecast(game, pack);
    expect(state.holdings.promissory).toEqual([`${TA}@o1`]);
    expect(state.rivals?.o1.holdings.promissory).toEqual([`${TA}@me`]);
  });

  test('a transaction offers the notes the giver holds, their own and those got from others, each with its address', () => {
    const held = holdingsOf({ promissory: [`${TA}@me`, `${TA}@o1`, 'promissory:convoys@o1'], hand: ['actionCard:sabo1'] });
    expect(tradable(held)).toEqual([`${TA}@me`, `${TA}@o1`, 'promissory:convoys@o1', 'actionCard:sabo1']);
    expect(tradable(held, [`${TA}@o1`])).toEqual([`${TA}@me`, 'promissory:convoys@o1', 'actionCard:sabo1']);
  });

  test('a transaction offers first the notes of the player they go back to, the rest in the order they were', () => {
    const offer = ['promissory:convoys@o1', `${TA}@me`, 'actionCard:sabo1', `${TA}@o1`, 'promissory:sftt@me'];
    expect(notesOfFirst(offer, 'me')).toEqual([`${TA}@me`, 'promissory:sftt@me', 'promissory:convoys@o1', 'actionCard:sabo1', `${TA}@o1`]);
    expect(notesOfFirst(offer, 'o1')).toEqual(['promissory:convoys@o1', `${TA}@o1`, `${TA}@me`, 'actionCard:sabo1', 'promissory:sftt@me']);
    expect(notesOfFirst(offer, 'o2')).toEqual(offer);
  });

  test('a note held is ready to play under its own id', () => {
    const ready = readyToPlay(pack, holdingsOf({ promissory: [`${TA}@o1`] }), 'rules-tester');
    expect(ready.has(`${TA}@o1`)).toBe(true);
    expect(ready.has(TA)).toBe(false);
  });

  test('ownNotes lists every note of a player with who holds it now: the owner, another player, or nobody', () => {
    let game = setPlayerFaction(createGame({ expansions: ['pok'], playerCount: 3, faction: 'hacan' }, pok), 1, 'sol', pok);
    const [first] = game.opponents;
    // My Trade Agreement is with Sol when the plan begins, and my Ceasefire is out of the game.
    game = setStartHolding(game, first.id, `${TA}@me`, true);
    game = setStartHolding(game, 'me', 'promissory:<color>_cf@me', false);
    const by = { me: holdingsOf(game.start.me), [first.id]: holdingsOf(game.start.opponents[first.id]) };
    const mine = ownNotes(game, pok, 'me', by);
    expect(mine.map(note => note.id)).toEqual([...['cf', 'ps', 'sftt', 'ta', 'an'].map(note => `promissory:<color>_${note}@me`), 'promissory:convoys@me']);
    expect(Object.fromEntries(mine.map(note => [note.id, note.holder]))).toEqual({
      'promissory:<color>_cf@me': undefined, 'promissory:<color>_ps@me': 'me', 'promissory:<color>_sftt@me': 'me',
      [`${TA}@me`]: first.id, 'promissory:<color>_an@me': 'me', 'promissory:convoys@me': 'me',
    });
    // The notes of the opponent are all with them; a player whose holdings are not known holds nothing.
    const theirs = ownNotes(game, pok, first.id, by);
    expect(theirs.map(note => note.id)).toContain(`promissory:ms@${first.id}`);
    expect(theirs.every(note => note.holder === first.id)).toBe(true);
    expect(ownNotes(game, pok, first.id, {}).every(note => note.holder === undefined)).toBe(true);
  });

  test('a catalogue note stands for one card of each player; a faction note for the card of who plays the faction', () => {
    const game = table({ opponents: [{ ...RIVAL, faction: 'hacan' }] });
    expect(noteCards(game, pack, componentById(pack, TA)!).map(c => c.id)).toEqual([`${TA}@me`, `${TA}@o1`]);
    expect(noteCards(game, pack, componentById(pack, 'promissory:convoys')!).map(c => c.id)).toEqual(['promissory:convoys@o1']);
    // Nobody plays Sol: its note stays the catalogue card. Any other component is itself.
    expect(noteCards(game, pack, componentById(pack, 'promissory:ms')!).map(c => c.id)).toEqual(['promissory:ms']);
    expect(noteCards(game, pack, componentById(pack, 'actionCard:sabo1')!).map(c => c.id)).toEqual(['actionCard:sabo1']);
  });

  test('a change of faction changes the faction note only; two players of one faction hold a note each', () => {
    let game = createGame({ expansions: ['pok'], playerCount: 3, faction: 'hacan' }, pok);
    const [first] = game.opponents;
    const generic = (player: string) => ['cf', 'ps', 'sftt', 'ta', 'an'].map(note => `promissory:<color>_${note}@${player}`);
    game = setPlayerFaction(game, 0, 'empyrean', pok);
    expect(game.start.me.promissory).toEqual([...generic('me'), 'promissory:blood_pact@me', 'promissory:dark_pact@me']);
    game = setPlayerFaction(game, 1, 'empyrean', pok);
    expect(game.start.opponents[first.id].promissory).toEqual([...generic(first.id), `promissory:blood_pact@${first.id}`, `promissory:dark_pact@${first.id}`]);
    game = setPlayerFaction(game, 1, '', pok);
    expect(game.start.opponents[first.id].promissory).toEqual(generic(first.id));
    expect(game.start.me.promissory).toHaveLength(7);
  });

  test('a player added is dealt the generic notes; a player removed takes their notes from every start and every entry', () => {
    let game = createGame({ expansions: [], playerCount: 3, faction: 'sol' }, loadPack([]));
    const base = loadPack([]);
    game = addPlayer(game, base);
    const [first, , added] = game.opponents;
    expect(game.start.opponents[added.id].promissory).toEqual(['cf', 'ps', 'sftt', 'ta'].map(note => `promissory:<color>_${note}@${added.id}`));
    const theirs = `${TA}@${first.id}`;
    const kept = `${TA}@${added.id}`;
    game = setStartHolding(game, 'me', theirs, true);
    game = setStartHolding(game, added.id, `promissory:<color>_cf@${first.id}`, true);
    const entries: Entry[] = [
      entry({ type: 'component', note: '', componentId: theirs, gains: [theirs, kept], spends: [theirs] }),
      entry({ type: 'pass', acts: [{ kind: 'transaction', with: added.id, give: { tradeGoods: 1, components: [theirs] }, get: { components: [theirs, kept] } }] }),
    ];
    game = { ...game, plans: [{ ...game.plans[0], rounds: [{ ...game.plans[0].rounds[0], entries }] }] };
    const next = removePlayer(game, 1, base);
    expect(JSON.stringify(next)).not.toContain(`@${first.id}`);
    expect(next.start.me.promissory).toEqual(game.start.me.promissory!.filter(id => id !== theirs));
    expect(next.plans[0].rounds[0].entries).toEqual([
      { ...entries[0], componentId: undefined, gains: [kept], spends: undefined },
      { ...entries[1], acts: [{ kind: 'transaction', with: added.id, give: { tradeGoods: 1 }, get: { components: [kept] } }] },
    ].map(e => JSON.parse(JSON.stringify(e))));
  });

  test('a draft under other expansions deals the notes again, to the same players', () => {
    const draft = setPlayerFaction(createGame({ expansions: ['pok'], playerCount: 3, faction: 'hacan' }, pok), 1, 'sol', pok);
    const base = loadPack([]);
    const next = draftWithExpansions(draft, [], base);
    const generic = (player: string) => ['cf', 'ps', 'sftt', 'ta'].map(note => `promissory:<color>_${note}@${player}`);
    expect(next.start.me.promissory).toEqual([...generic('me'), 'promissory:convoys@me']);
    expect(next.opponents.map(o => o.id)).toEqual(draft.opponents.map(o => o.id));
    expect(next.start.opponents).toEqual({
      [draft.opponents[0].id]: expect.objectContaining({ promissory: [...generic(draft.opponents[0].id), `promissory:ms@${draft.opponents[0].id}`] }),
      [draft.opponents[1].id]: { promissory: generic(draft.opponents[1].id) },
    });
  });

  test('marked by hand, a note is with one player: it leaves who had it, and taken off, it is back with its owner', () => {
    let game = table({ start: { me: { promissory: [`${TA}@me`] }, opponents: { o1: { promissory: [`${TA}@o1`] } } } });
    game = setStartHolding(game, 'me', `${TA}@o1`, true);
    expect(game.start).toEqual({ me: { promissory: [`${TA}@me`, `${TA}@o1`] }, opponents: { o1: { promissory: [] } } });
    game = setStartHolding(game, 'me', `${TA}@o1`, false);
    expect(game.start).toEqual({ me: { promissory: [`${TA}@me`] }, opponents: { o1: { promissory: [`${TA}@o1`] } } });
    // My own note taken off me is with nobody: who got it is not said.
    game = setStartHolding(game, 'me', `${TA}@me`, false);
    expect(game.start).toEqual({ me: { promissory: [] }, opponents: { o1: { promissory: [`${TA}@o1`] } } });
  });
});

describe('the groups of the components drawer', () => {
  test('every holding is counted in one group, and the laws of the game with the objectives', () => {
    const holdings = {
      ...holdingsOf({ technologies: ['technology:amd', 'technology:cv2'], hand: ['actionCard:sabo1', 'actionCard:sabo1'], promissory: ['promissory:x'] }),
      relics: ['relic:shard'], leaders: { 'leader:solagent': 'unlocked' as const }, breakthrough: 'held' as const, scored: ['publicObjective:a'], secrets: ['secretObjective:b'],
    };
    expect(COMPONENT_GROUPS).toEqual(['technologies', 'cards', 'faction', 'relics', 'objectives']);
    expect(groupCounts(holdings, ['agenda:law'])).toEqual({ technologies: 2, cards: 3, faction: 2, relics: 1, objectives: 3 });
    expect(groupCounts(holdingsOf())).toEqual({ technologies: 0, cards: 0, faction: 0, relics: 0, objectives: 0 });
  });
});

describe('what a choice of components offers', () => {
  const holdings = {
    ...holdingsOf({ technologies: ['technology:amd'], hand: ['actionCard:sabo1', 'actionCard:sabo1'], relics: ['relic:shard'], secrets: ['secretObjective:x'] }),
  };

  test('an entry can lose what its owner held before it, a hand with its repeats, and what the entry itself brings', () => {
    expect(losable(holdings, {})).toEqual(['technology:amd', 'actionCard:sabo1', 'actionCard:sabo1', 'relic:shard', 'secretObjective:x']);
    expect(losable(holdings, { gains: ['relic:stellarconverter'] })).toContain('relic:stellarconverter');
    expect(losable(holdingsOf(), {})).toEqual([]);
  });

  test('what the entry already loses is offered no more, a copy at a time', () => {
    expect(losable(holdings, { spends: ['actionCard:sabo1', 'relic:shard'] })).toEqual(['technology:amd', 'actionCard:sabo1', 'secretObjective:x']);
  });

  test('what is held once cannot be taken again: everything but the hand', () => {
    expect([...heldOnce(holdings)].sort()).toEqual(['relic:shard', 'secretObjective:x', 'technology:amd']);
  });

  test('ready to play: what the player holds and has not exhausted, and the abilities of their own faction', () => {
    const pack = loadPack(['pok']);
    const mine = {
      ...holdingsOf({ hand: ['actionCard:sabo1'], relics: ['relic:shard'], technologies: ['technology:st'], leaders: { 'leader:solagent': 'unlocked', 'leader:solhero': 'purged' } }),
      exhausted: ['technology:st'],
    };
    const ready = readyToPlay(pack, mine, 'sol', { primor: 'me', hopesend: 'enemy' });
    expect(ready.has('actionCard:sabo1')).toBe(true);
    expect(ready.has('relic:shard')).toBe(true);
    expect(ready.has('leader:solagent')).toBe(true);
    expect(ready.has('technology:st')).toBe(false);
    expect(ready.has('leader:solhero')).toBe(false);
    expect(ready.has('leader:solcommander')).toBe(false);
    expect(ready.has('relic:stellarconverter')).toBe(false);
    // A legendary planet is ready for the player who controls it.
    expect([...ready].filter(id => id.startsWith('legendary:'))).toEqual(['legendary:primor']);
    expect(readyToPlay(pack, mine, 'sol').has('legendary:primor')).toBe(false);
    const abilities = [...ready].filter(id => id.startsWith('ability:')).map(id => componentById(pack, id)!.faction);
    expect(abilities.length).toBeGreaterThan(0);
    expect(new Set(abilities)).toEqual(new Set(['sol']));
  });
});
