/**
 * The waiver pass on the kernel: one real component of each class is waived by the native pass, with the old
 * functions of `domain/effects/waivers` made to throw so none of them is on the path. A component that waives is
 * written for the kernel (`permit` on its ability), not as `waive` on the old state.
 */
import { describe, expect, test, vi } from 'vitest';

vi.mock('../../domain/effects/waivers', async importOriginal => {
  const real = await importOriginal<typeof import('../../domain/effects/waivers')>();
  const bridge = (): never => { throw new Error('the old waiver pass is on the path'); };
  return { ...real, waive: bridge, marked: bridge, askedFor: bridge };
});

const kit = await import('../../domain/effects/components/kit');
const { adjust, bench, componentAction, effect, expectStanding, expectWaived, FAR, HOME, NEAR, planned, tactical, using, warningsOf } = kit;

const RIVAL = { id: 'o1', faction: 'letnev', vp: 0, seat: 2, color: 2 };

describe('the native waiver pass', () => {
  test('a passive ability waives while in force (Crafty lifts the hand limit)', () => {
    const entry = tactical(NEAR, {}, { gains: ['actionCard:disable'] });
    const hand = ['actionCard:abs', 'actionCard:assassin', 'actionCard:bribery', 'actionCard:bunker', 'actionCard:confusing', 'actionCard:courageous', 'actionCard:cripple'];
    const table = bench({ faction: 'yssaril', start: { hand }, entries: [entry] });
    expectWaived(warningsOf(table, entry), 'handOverLimit' as never, 'ability:crafty');
    expect(effect(table.pack, 'ability:crafty').permit?.map(p => p.code)).toEqual(['handOverLimit']);
    expect(effect(table.pack, 'ability:crafty').waive).toBeUndefined();
  });

  test('a played component waives in the turn that names it (Puppets on a String)', () => {
    const id = 'actionCard:puppetsonastring';
    const move = () => tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
    const pass = planned({ type: 'pass' } as never);
    const puppet = using(move(), id);
    const table = bench({ faction: 'sol', expansions: ['te'], units: { [HOME]: { cruiser: 2 } }, start: { hand: [id] }, entries: [pass, puppet] });
    expectWaived(warningsOf(table, puppet), 'actionAfterPass', id);
    const late = move();
    expectStanding(warningsOf(bench({ faction: 'sol', expansions: ['te'], units: { [HOME]: { cruiser: 2 } }, start: { hand: [id] }, entries: [pass, late] }), late), 'actionAfterPass');
    expect(effect(table.pack, id).permit?.map(p => p.code)).toEqual(['actionAfterPass']);
  });

  test('a waiver that lasts the round holds in a later turn of that round (the Letnev hero)', () => {
    const id = 'leader:letnevhero';
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 8 } }] });
    const table = bench({ faction: 'letnev', expansions: ['pok'], units: { [HOME]: { cruiser: 8 } }, start: { leaders: { [id]: 'unlocked' } }, rounds: [[componentAction(id), move]] });
    expectWaived(warningsOf(table, move), 'fleetPool', id);
    expect(effect(table.pack, id).permit?.map(p => [p.code, p.lasts])).toEqual([['fleetPool', 'round']]);
  });

  test('a partner waiver is asked of the other side of a deal (Guild Ships)', () => {
    const deal = { kind: 'transaction' as const, with: 'o1', give: { tradeGoods: 1 }, get: {} };
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }], acts: [deal] });
    const make = (faction: string) => bench({ faction, units: { [HOME]: { carrier: 1 } }, entries: [adjust({ tradeGoods: 2 }), move], game: { opponents: [RIVAL], enemyUnits: { [FAR]: { o1: { carrier: 1 } } } } });
    expectWaived(warningsOf(make('hacan'), move), 'notNeighbor', 'ability:guild_ships');
    expectStanding(warningsOf(make('sol'), move), 'notNeighbor');
    expect(effect(make('hacan').pack, 'ability:guild_ships').permit?.[0]).toMatchObject({ code: 'notNeighbor', partner: true });
  });
});

/** The files whose `when` still reads the old per-player state: they are asked through the bridge until they are moved. The list only shrinks. */
const OLD_SHAPE = [
  'ability/aetherpassage', 'ability/imperia', 'actionCard/blackmarketdealing', 'actionCard/strategize1', 'agenda/minister_industry', 'agenda/schematics', 'breakthrough/bastionbt',
  'breakthrough/solbt', 'breakthrough/winnubt', 'breakthrough/xxchabt', 'breakthrough/yssarilbt', 'exploration/frln1', 'leader/arborechero', 'leader/argentagent', 'leader/keleresagent',
  'leader/nomadhero', 'leader/saaragent', 'leader/saarcommander', 'leader/sardakkcommander', 'leader/winnuagent', 'leader/winnuhero', 'leader/yincommander', 'mech/argent_mech',
  'mech/naaz_voltron', 'promissory/nanolink', 'publicObjective/vast_reserves', 'technology/htp', 'technology/ie',
];

describe('the files that waive', () => {
  test('no component file keeps a waiver on the old state except the ones listed, which the bridge still serves', async () => {
    const { COMPONENT_FILES } = await import('../../domain/effects/registry');
    const old = Object.entries(COMPONENT_FILES).filter(([, file]) => (file.effect?.waive?.length ?? 0) > 0).map(([path]) => path.replace(/^.*components\//, '').replace(/\.ts$/, '')).sort();
    expect(old).toEqual([...OLD_SHAPE].sort().filter(name => old.includes(name)));
    expect(old.filter(name => !OLD_SHAPE.includes(name))).toEqual([]);
  });
});
