/**
 * The infrastructure of the status subsystem, tested with throwaway effects (`withEffect`): the points of the count
 * (`tokensGained`, `handLimit`, `secretLimit`, `strategyCost`) with the entry's own components taking part, the hooks
 * (`gained`, `lost`, `restrict`, `suppresses`), the laws that bind one player, the agenda an entry resolves, the round's
 * flow for cards played in a window, and the reminders of the objectives. docs/phase4/infra/status.md names them all.
 */
import { describe, expect, test } from 'vitest';
import { componentsOf } from '../../components';
import { CARD } from '../../strategy';
import { adjust, codesOf, forecast, mutable, planned, rulesGame, rulesPack, secondary, statusTokens } from '../../rules/kit';
import type { Entry, EntryBody, ExpansionId } from '../../types';
import type { Player } from '../../players';
import { holderOf, inForceOf } from '../registry';
import { hintsAt } from '../../../testing/old/domain/effects/registry';
import { gain, tokens } from '../../../game/abilities/emit';
import type { Ability } from '../types';
import { spendStrategyBy } from '../helpers/cardPlay';
import type { Play } from '../../../game/abilities/types';
import { appliedFor } from '../entryApply';
import { objectiveNotMet } from './status';
import { withEffect } from './status.kit';

const R1: Player = { id: 'r1', faction: 'hacan', vp: 0, seat: 2, color: 2 };
const TECH = 'technology:hm';
const start = (me: Record<string, string[]>) => ({ start: { me, opponents: {} } });
const passive = (id: string, modify: Ability['modify']): Ability => ({ tier: 'passive', rule: id, modify });

describe('tokensGained: the tokens of the status phase', () => {
  const entry = (tokens: [number, number, number], uses?: string[]): Entry => ({ ...statusTokens(...tokens), ...(uses ? { uses } : {}) } as Entry);

  test('hm tokensGained: a passive effect changes the free tokens, and the warning names the new number', () => {
    const own = rulesPack();
    withEffect(own, TECH, passive(TECH, { tokensGained: (value, ctx) => (ctx.step === 'status' ? value + 1 : value) }));
    const three = entry([2, 1, 0]);
    const four = entry([2, 2, 0]);
    expect(codesOf(rulesGame({ entries: [three], ...{ game: start({ technologies: [TECH] }) } }), own, three)).not.toContain('tokensOver');
    const warnings = forecast(rulesGame({ entries: [four], game: start({ technologies: [TECH] }) }), own).warnings[four.id];
    expect(warnings.find(w => w.code === 'tokensOver')?.params).toEqual({ given: 4, free: 3 });
  });

  test('ce tokensGained: a play effect with a modify counts only for the entry that names it, while it is held ready', () => {
    const own = rulesPack();
    withEffect(own, TECH, { tier: 'play', rule: TECH, modify: { tokensGained: value => value + 1 } });
    const held = { game: start({ technologies: [TECH] }) };
    const named = entry([2, 1, 0], [TECH]);
    expect(codesOf(rulesGame({ entries: [named], ...held }), own, named)).not.toContain('tokensOver');
    const idle = entry([2, 1, 0]);
    expect(codesOf(rulesGame({ entries: [idle], ...held }), own, idle)).toContain('tokensOver');
    const notHeld = entry([2, 1, 0], [TECH]);
    expect(codesOf(rulesGame({ entries: [notHeld] }), own, notHeld)).toContain('tokensOver');
  });
});

describe('strategyCost: the strategy tokens a card owes', () => {
  test('master_of_trade strategyCost: a passive effect makes the secondary of a card free', () => {
    const own = rulesPack();
    withEffect(own, TECH, passive(TECH, { strategyCost: (value, ctx) => (ctx.secondary && ctx.card === CARD.trade ? 0 : value) }));
    const follow = secondary(CARD.trade);
    const warfare = secondary(CARD.warfare);
    const game = rulesGame({ entries: [follow], game: start({ technologies: [TECH] }) });
    expect(forecast(game, own).state.strategy).toBe(2);
    expect(forecast(rulesGame({ entries: [warfare], game: start({ technologies: [TECH] }) }), own).state.strategy).toBe(1);
  });

  test('mahact agent strategyCost: a component named in `uses` and held ready makes the token free; exhausted it does not', () => {
    const own = rulesPack();
    withEffect(own, TECH, { tier: 'play', rule: TECH, modify: { strategyCost: () => 0 } });
    const once = { ...secondary(CARD.trade), uses: [TECH] } as Entry;
    const game = (entries: Entry[]) => rulesGame({ entries, game: start({ technologies: [TECH] }) });
    expect(forecast(game([once]), own).state.strategy).toBe(2);
    // Exhausted by the first use, the second does not make a token free.
    const again = { ...secondary(CARD.warfare), uses: [TECH] } as Entry;
    withEffect(own, TECH, { tier: 'play', rule: TECH, modify: { strategyCost: () => 0 } });
    expect(forecast(game([once, again]), own).state.strategy).toBe(2);
  });

  test('strategyCost: asking it without an entry gives the base', () => {
    const own = rulesPack();
    const state = forecast(rulesGame(), own).state;
    expect(appliedFor(own, holderOf({ faction: 'rules-tester' }, state), undefined, 'strategyCost', 1, { card: CARD.trade, secondary: true }).value).toBe(1);
  });
});

describe('handLimit and secretLimit: the checks after an entry that draws', () => {
  const cards = (pack: ReturnType<typeof rulesPack>, n: number) => componentsOf(pack).filter(c => c.kind === 'actionCard').slice(0, n).map(c => c.id);

  test('2.4: an eighth action card is warned of, with the limit; seven are not', () => {
    const own = rulesPack();
    const draw: Entry = { ...adjust({}), gains: cards(own, 8) };
    const warnings = forecast(rulesGame({ entries: [draw] }), own).warnings[draw.id];
    expect(warnings.find(w => w.code === 'handOverLimit')?.params).toEqual({ cards: 8, limit: 7 });
    const seven: Entry = { ...adjust({}), gains: cards(own, 7) };
    expect(codesOf(rulesGame({ entries: [seven] }), own, seven)).not.toContain('handOverLimit');
  });

  test('2.4.1: a passive effect changes the limit the check runs against', () => {
    const own = rulesPack();
    withEffect(own, TECH, passive(TECH, { handLimit: () => 3 }));
    const draw: Entry = { ...adjust({}), gains: cards(own, 4) };
    expect(forecast(rulesGame({ entries: [draw], game: start({ technologies: [TECH] }) }), own).warnings[draw.id].find(w => w.code === 'handOverLimit')?.params).toEqual({ cards: 4, limit: 3 });
  });

  test('2.4.1: a waiver lifts the warning and keeps it listed', () => {
    const own = rulesPack();
    withEffect(own, TECH, { tier: 'passive', rule: TECH, permit: [{ code: 'handOverLimit' as never, rule: 'test' }] });
    const draw: Entry = { ...adjust({}), gains: cards(own, 8) };
    const found = forecast(rulesGame({ entries: [draw], game: start({ technologies: [TECH] }) }), own).warnings[draw.id].find(w => w.code === 'handOverLimit');
    expect(found?.waivedBy).toEqual([TECH]);
  });
});

describe('laws: outcome, the player elected, the planet elected', () => {
  const pok: ExpansionId[] = ['pok'];
  const pack = () => rulesPack(undefined, pok);
  const agenda = (id: string, extra: Partial<Entry> = {}, choices?: Record<string, string>): Entry =>
    ({ ...planned({ type: 'adjustment', label: '', delta: {}, ...(choices ? { choices } : {}) } as EntryBody, 'agenda', { gains: [id], ...extra }) });
  const game = (entries: Entry[][]) => rulesGame({ rounds: entries, expansions: pok, game: { opponents: [R1] } });

  test('7.6: a law resolved against is not in play; for, or no outcome, puts it in play', () => {
    const against = agenda('agenda:censure', {}, { outcome: 'against' });
    expect(forecast(game([[against]]), pack()).state.laws ?? []).toEqual([]);
    const forLaw = agenda('agenda:censure', {}, { outcome: 'for' });
    expect(forecast(game([[forLaw]]), pack()).state.laws).toContain('agenda:censure');
  });

  test('7.3: an Elect Player law binds the player whose entry resolved it, or the one elected', () => {
    const mine = forecast(game([[agenda('agenda:censure')]]), pack()).state;
    expect(mine.lawOwners).toEqual({ 'agenda:censure': 'rules-tester' });
    const theirs = forecast(game([[agenda('agenda:censure', { owner: 'r1' })]]), pack()).state;
    expect(theirs.lawOwners).toEqual({ 'agenda:censure': 'hacan' });
    const elected = forecast(game([[agenda('agenda:censure', {}, { elect: 'r1' })]]), pack()).state;
    expect(elected.lawOwners).toEqual({ 'agenda:censure': 'hacan' });
  });

  test('7.3: an Elect Player law is in force for the player it binds only', () => {
    const own = pack();
    const state = forecast(game([[agenda('agenda:censure', {}, { elect: 'r1' })]]), own).state;
    expect(inForceOf(own, holderOf({ faction: 'hacan' }, state, state))).toContain('agenda:censure');
    expect(inForceOf(own, holderOf({ faction: 'rules-tester' }, state, state))).not.toContain('agenda:censure');
  });

  test('7.3: an Elect Planet law is attached to the planet elected, and leaves it with the law', () => {
    const own = pack();
    const resolved = agenda('agenda:core_mining', {}, { elect: 'h1' });
    expect(forecast(game([[resolved]]), own).state.attachments).toEqual({ h1: ['agenda:core_mining'] });
    const repeal: Entry = planned({ type: 'adjustment', label: '', delta: {} } as EntryBody, 'agenda', { spends: ['agenda:core_mining'] });
    const end = forecast(game([[resolved], [repeal]]), own).state;
    expect(end.laws).toEqual([]);
    expect(end.attachments?.h1 ?? []).toEqual([]);
  });

  test('suppresses: a law in force takes other components out of force', () => {
    const own = pack();
    withEffect(own, 'agenda:articles_war', { tier: 'passive', rule: 'agenda:articles_war', suppresses: id => id.startsWith('mech:') });
    const state = forecast(game([[agenda('agenda:articles_war')]]), own).state;
    const holder = holderOf({ faction: 'sol' }, state, state);
    expect(inForceOf(own, holder)).toContain('agenda:articles_war');
    expect(inForceOf(own, holder).filter(id => id.startsWith('mech:'))).toEqual([]);
    expect(inForceOf(own, { ...holder, laws: [] }).filter(id => id.startsWith('mech:')).length).toBeGreaterThan(0);
  });

  test('restrict: a law adds a check for the player it binds, and for nobody else', () => {
    const own = pack();
    withEffect(own, 'agenda:censure', {
      tier: 'passive', rule: 'agenda:censure',
      holder: 'anyone',
      on: { restrict: ctx => { if (ctx.entry?.spends?.some(id => id.startsWith('actionCard:'))) ctx.warn({ code: 'actionCardBarred' as never, params: { id: 'x', name: 'x' } }); } },
    });
    const card = componentsOf(own).find(c => c.kind === 'actionCard')!.id;
    const spend = (): Entry => planned({ type: 'adjustment', label: '', delta: {} } as EntryBody, 'action', { spends: [card] });
    const hand = { ...start({ hand: [card] }), opponents: [R1] };
    const mine = spend();
    expect(codesOf(rulesGame({ rounds: [[agenda('agenda:censure')], [mine]], expansions: pok, game: hand }), own, mine)).toContain('actionCardBarred');
    const other = spend();
    expect(codesOf(rulesGame({ rounds: [[agenda('agenda:censure', { owner: 'r1' })], [other]], expansions: pok, game: hand }), own, other)).not.toContain('actionCardBarred');
  });
});

describe('gained and lost: hooks of a component an entry gains or spends', () => {
  const RELIC = 'relic:shard';
  const own = () => {
    const pack = rulesPack(undefined, ['pok']);
    withEffect(pack, RELIC, { tier: 'play', rule: RELIC, holder: 'anyone', on: { gained: ctx => [gain.points(ctx.holder, 1)], lost: ctx => [gain.points(ctx.holder, -1)] } });
    return pack;
  };
  const gains: Entry = { ...adjust({}), gains: [RELIC] };
  const loses: Entry = { ...adjust({}), spends: [RELIC] };

  test('shard gained: the hook runs for the entry that gains it, and again for the one that loses it', () => {
    expect(forecast(rulesGame({ entries: [gains], expansions: ['pok'] }), own()).state.vp).toBe(1);
    expect(forecast(rulesGame({ entries: [gains, loses], expansions: ['pok'] }), own()).state.vp).toBe(0);
  });

  test('shard gained: held from the start, nothing runs', () => {
    expect(forecast(rulesGame({ entries: [], expansions: ['pok'], game: start({ relics: [RELIC] }) }), own()).state.vp).toBe(0);
  });

  test('crisis gained: an agenda the agenda phase resolves is played by its entry, with the entry\'s choices and the round\'s cards', () => {
    const pack = rulesPack(undefined, ['pok']);
    let seen = '';
    withEffect(pack, 'agenda:crisis', {
      tier: 'play', rule: 'agenda:crisis',
      play: ctx => { seen = `${ctx.choices.card} ${ctx.key(ctx.holder)}`; },
    });
    const resolved: Entry = planned({ type: 'adjustment', label: '', delta: {}, choices: { card: 5 } } as EntryBody, 'agenda', { gains: ['agenda:crisis'] });
    forecast(rulesGame({ entries: [resolved], expansions: ['pok'] }), pack);
    expect(seen).toBe('5 me');
  });
});

describe('the round: a card played in a window is no turn', () => {
  const pack = rulesPack();
  const inWindow = componentsOf(pack).find(c => c.kind === 'actionCard' && c.detail?.window !== 'Action' && c.detail?.phase === 'agenda')!.id;
  const action = componentsOf(pack).find(c => c.kind === 'actionCard' && c.detail?.window === 'Action')!.id;
  const playedIn = (phase: 'agenda' | 'action', id: string): Entry => planned({ type: 'component', componentId: id, note: '' } as EntryBody, phase);

  test('40.2: an action card of another window played in the agenda phase gives no warning about the phase', () => {
    const entry = playedIn('agenda', inWindow);
    expect(codesOf(rulesGame({ entries: [entry] }), pack, entry)).not.toContain('actionOutsidePhase');
  });

  test('40.2: a component action in the agenda phase is still warned of', () => {
    const entry = playedIn('agenda', action);
    expect(codesOf(rulesGame({ entries: [entry] }), pack, entry)).toContain('actionOutsidePhase');
  });

  test('3.3: a card of another window after the player passed is no turn after the pass', () => {
    const pass: Entry = planned({ type: 'pass' } as EntryBody, 'action');
    const late = playedIn('action', inWindow);
    expect(codesOf(rulesGame({ entries: [pass, late] }), pack, late)).not.toContain('actionAfterPass');
    const component = playedIn('action', action);
    expect(codesOf(rulesGame({ entries: [pass, component] }), pack, component)).toContain('actionAfterPass');
  });

  test('3.3: a secondary that plays an Action card is a turn: after the pass it is warned of', () => {
    const pass: Entry = planned({ type: 'pass' } as EntryBody, 'action');
    const follow = { ...secondary(CARD.trade), uses: [action] } as Entry;
    expect(codesOf(rulesGame({ entries: [pass, follow] }), pack, follow)).toContain('actionAfterPass');
    const plain = secondary(CARD.trade);
    expect(codesOf(rulesGame({ entries: [pass, plain] }), pack, plain)).not.toContain('actionAfterPass');
  });
});

describe('hintsAt: the objectives', () => {
  const SECRET = 'secretObjective:dtgs';
  const PUBLIC = 'publicObjective:develop';
  const hint: Ability = { tier: 'hint', rule: 'x', hintAt: ['status'] };

  test('a secret objective in hand is reminded of at the status step, and not once scored', () => {
    const own = rulesPack();
    withEffect(own, SECRET, { ...hint, rule: SECRET });
    const held = forecast(rulesGame({ game: start({ secrets: [SECRET] }) }), own).state;
    expect(hintsAt(own, held, 'status', ['me']).map(def => def.id)).toEqual([SECRET]);
    const scored = forecast(rulesGame({ game: start({ scored: [SECRET] }) }), own).state;
    expect(hintsAt(own, scored, 'status', ['me'])).toEqual([]);
  });

  test('a public objective revealed and not yet scored by the player is reminded of at the status step', () => {
    const own = rulesPack();
    withEffect(own, PUBLIC, { ...hint, rule: PUBLIC });
    const state = mutable(forecast(rulesGame(), own).state);
    state.revealed = [PUBLIC];
    expect(hintsAt(own, state, 'status', ['me']).map(def => def.id)).toEqual([PUBLIC]);
    state.holdings.scored.push(PUBLIC);
    expect(hintsAt(own, state, 'status', ['me'])).toEqual([]);
  });
});

describe('spentOnObjectives: the cost of an objective scored by spending (61.10)', () => {
  const PUBLIC = 'publicObjective:develop';
  const pools = (tactic: number, strategy: number): Entry => ({ ...statusTokens(0, 0, 0), scored: [PUBLIC], spend: { tactic, strategy } } as Entry);
  const galvanize = () => {
    const own = rulesPack();
    withEffect(own, PUBLIC, {
      tier: 'play', rule: PUBLIC,
      play: ctx => { const { spent, events } = ctx.spendOnObjectives(); if (spent.tokens < 6) ctx.warn(objectiveNotMet(PUBLIC, spent.tokens, 6)); return events; },
    });
    return own;
  };

  test('61.10: the tokens named are taken from the pools and counted for the objective', () => {
    const status = pools(4, 2);
    const game = rulesGame({ entries: [adjust({ tactic: 2 }), status] });
    const { state, warnings } = forecast(game, galvanize());
    expect(state).toMatchObject({ tactic: 1, strategy: 0 });
    expect(warnings[status.id].map(w => w.code)).toEqual([]);
  });

  test('61.10: five tokens are short of six, with the count; a pool taken below zero is warned of at the status step', () => {
    const short = pools(3, 2);
    const found = forecast(rulesGame({ entries: [adjust({ tactic: 2 }), short] }), galvanize()).warnings[short.id];
    expect(found.find(w => w.code === 'objectiveUnmet')?.params).toEqual({ objective: PUBLIC, have: 5, need: 6 });
    const over = pools(6, 0);
    const negative = forecast(rulesGame({ entries: [adjust({ tactic: 2 }), over] }), galvanize()).warnings[over.id].find(w => w.code === 'poolNegative');
    expect(negative).toMatchObject({ params: { pool: 'tactic', have: -1 }, step: 'status' });
  });

  test('61.10: trade goods and the planets paying resources and influence are taken once, however many objectives are scored', () => {
    const own = rulesPack();
    let paid = { resources: 0, influence: 0, tradeGoods: 0 };
    for (const id of [PUBLIC, 'secretObjective:dtgs']) withEffect(own, id, { tier: 'play', rule: id, play: ctx => { const result = ctx.spendOnObjectives(); paid = result.spent; return result.events; } });
    const status = { ...statusTokens(0, 0, 0), scored: [PUBLIC, 'secretObjective:dtgs'], spend: { tradeGoods: 3, resources: { planets: ['h1'], tradeGoods: 0 }, influence: { planets: ['h1', 'h2'], tradeGoods: 0 } } } as Entry;
    const game = rulesGame({ entries: [adjust({ tradeGoods: 5 }), status], game: { planetControl: {} } });
    const { state, warnings } = forecast(game, own);
    expect(paid).toMatchObject({ resources: 3, influence: 2, tradeGoods: 3 });
    expect(state.tradeGoods).toBe(2);
    // Home One pays its resources, so it is already exhausted for its influence (34.4).
    expect(warnings[status.id].find(w => w.code === 'planetExhausted')).toMatchObject({ params: { planetId: 'h1' }, step: 'status' });
  });
});

describe('the tokens a played component gives or costs (tokens, spendStrategyBy)', () => {
  const play = (id: string, effect: Play) => {
    const own = rulesPack();
    withEffect(own, id, { tier: 'play', rule: id, play: effect });
    return own;
  };
  const named = (id: string): Entry => ({ ...adjust({}), uses: [id] } as Entry);

  test('20.5: a strategy token spent by a component is taken from the pool; with none the shortage is warned of, and a waiver sees it', () => {
    const own = play(TECH, ctx => spendStrategyBy(ctx));
    const use = named(TECH);
    const game = rulesGame({ entries: [use], game: start({ technologies: [TECH] }) });
    expect(forecast(game, own).state.strategy).toBe(1);
    const twice = [named(TECH), named(TECH), named(TECH)];
    const warnings = forecast(rulesGame({ entries: twice, game: start({ technologies: [TECH] }) }), own).warnings;
    expect(warnings[twice[2].id].find(w => w.code === 'shortStrategy')).toMatchObject({ params: { have: 0 }, step: 'card' });
  });

  test('20.3.1: tokens gained by a component are added to the pools and warned of past the sixteen of a faction', () => {
    const own = play(TECH, ctx => [tokens(ctx.holder, { tactic: 1 }, 'component')]);
    const use = named(TECH);
    const game = rulesGame({ entries: [use], game: start({ technologies: [TECH] }) });
    expect(forecast(game, own).state.tactic).toBe(4);
    const full = play(TECH, ctx => [tokens(ctx.holder, { tactic: 9 }, 'component')]);
    expect(forecast(game, full).warnings[use.id].find(w => w.code === 'noReinforcements')).toMatchObject({ params: { total: 17, limit: 16 } });
  });

  test('20.4: tokens taken below zero are warned of, at the step the component names', () => {
    const own = play(TECH, ctx => [tokens(ctx.holder, { fleet: -4 }, 'status')]);
    const use = named(TECH);
    const found = forecast(rulesGame({ entries: [use], game: start({ technologies: [TECH] }) }), own).warnings[use.id].find(w => w.code === 'poolNegative');
    expect(found).toMatchObject({ params: { pool: 'fleet', have: -1 }, step: 'status' });
  });
});
