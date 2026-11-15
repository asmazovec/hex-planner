import { bench, describe } from 'vitest';
import { loadPack } from '../data/loadPack';
import type { Game } from '../testing/old/domain/types';
import { savedOf } from '../testing/legacySave';
import { optionsAt, type ChoicePoint, type Point } from '../game/options';
import { sourcesOf, tacticalOf } from '../game/edit/tactical';
import { atOf } from '../game/edit/tacticalRead';
import { forgetTimelines, pointOf, pointOfNewTactical, timelineOf } from './projection';

/** The real four-player game when the file is there (the plans are the player's own and not part of the repository). */
const REAL = import.meta.glob<string>('/plans/slezy-radosti-2026-11-14.ti4.json', { query: '?raw', import: 'default', eager: true });
const raw = Object.values(REAL)[0];

if (raw) {
  const game = JSON.parse(raw) as Game;
  const pack = loadPack(game.expansions);
  const saved = savedOf(game);
  const plan = [...saved.plans].sort((a, b) => b.rounds.flatMap(r => r.turns).length - a.rounds.flatMap(r => r.turns).length)[0];
  forgetTimelines();
  const line = timelineOf(saved, plan.id, 'forecast', pack);
  const turns = plan.rounds.flatMap(r => r.turns);
  const tacticals = turns.filter(t => t.action.kind === 'tactical' && t.action.system !== null);
  /** The fullest tactical action of the plan: the one with the most flights, a landing and a production. */
  const weight = (t: typeof turns[number]) => (t.action.kind === 'tactical' ? t.action.movement.length * 4 + t.action.invasion.length + Object.keys(t.action.production?.units ?? {}).length * 2 : 0);
  const busy = [...tacticals].sort((a, b) => weight(b) - weight(a))[0];
  const card = turns.find(t => t.action.kind === 'strategic' && t.action.card !== undefined);
  const lastRound = plan.rounds[plan.rounds.length - 1].number;
  /** A point made anew each time: what was asked of a point is kept on it, and the bench measures the asking. */
  const again = (point: Point): Point => ({ ...point });
  const ask = (name: string, point: Point | undefined, where: ChoicePoint) => {
    if (!point) return;
    const count = optionsAt(again(point), where).length;
    bench(`${name} (${count} candidates)`, () => { optionsAt(again(point), where); });
  };

  describe(`options of a choice point, the real game, map of ${Object.keys(saved.table.map).length} tiles, plan "${plan.name}"`, () => {
    ask('the active system of a new tactical action, every tile of the map', pointOfNewTactical(line, lastRound, saved.table.viewer), { at: 'system' });
    if (busy) {
      const point = pointOf(line, busy)!;
      const source = sourcesOf(atOf(line.table, point.board, pack), tacticalOf(busy))[0];
      ask('the active system of a filled tactical action, every tile of the map', point, { at: 'system' });
      ask('the sources of a tactical action', point, { at: 'source' });
      if (source) {
        ask('the next system of a route under way', point, { at: 'route', path: [source] });
        ask('the units of a flight', point, { at: 'flight', source });
      }
      ask('the landing', point, { at: 'landing' });
      ask('the production block of a tactical action', point, { at: 'production' });
      ask('the payment of a production', point, { at: 'payment', of: 'production' });
    }
    if (card) {
      ask('the strategy cards of a card turn', pointOf(line, card), { at: 'card' });
      ask('the payment of a card', pointOf(line, card), { at: 'payment', of: 'card' });
    }
  });
}
