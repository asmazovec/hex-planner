/**
 * What the candidates of several choices are made of, asked through the context of a choice (`ChoiceContext`): the
 * holder is the one whose entry it is, so a rival is offered the rival's planets, ships and hand.
 */
import type { ChoiceContext } from '../types';

/** The planets the holder controls. */
export const controlledPlanets = (ctx: ChoiceContext): string[] => ctx.my.planets().map(planet => planet.id);

/** The systems with a unit of the holder in their space area that `of` accepts (any unit by default). */
export function systemsWithUnits(ctx: ChoiceContext, of: (unit: string) => boolean = () => true): string[] {
  return Object.keys(ctx.board.systems).filter(slot => Object.entries(ctx.my.unitsIn(slot)).some(([unit, count]) => (count ?? 0) > 0 && of(unit)));
}

/** The technologies a player holds, `player` being `me` or an opponent id as an entry keeps it. */
export function technologiesOf(ctx: ChoiceContext, player: string): string[] {
  const id = ctx.playerOf(player);
  return id === undefined ? [] : ctx.of(id).cards('technology').map(card => card.id);
}

/** The action cards a player holds, each once. */
export function handOf(ctx: ChoiceContext, player: string): string[] {
  const id = ctx.playerOf(player);
  return id === undefined ? [] : ctx.of(id).cards('actionCard').map(card => card.id);
}

/** The other players, as an entry keeps them. */
export const othersOf = (ctx: ChoiceContext): string[] => ctx.table.players.filter(player => player.id !== ctx.holder).map(player => ctx.key(player.id));

