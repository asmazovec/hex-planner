/** Strategy cards: the primary as a strategic action and the secondary, with their cost, tokens and what the replay tracks of them. */
import { violation } from '../rules/registry';
import { CARD, cardCost, cardsHeld, costsStrategyToken, freeTokens, type CardEntry } from '../strategy';
import { checkStationStructures } from '../thundersEdge';
import type { DataPack, Game, GameState, Warning } from '../types';
import { pay } from './payment';
import { checkProduction, placeProduction } from './production';
import { addUpgrades } from './state';
import { checkTokensGiven } from './status';
import { checkSystem } from './transport';

/** Applies what a strategy card can track; everything else about it is shown only. `primaries` holds the cards of this round's so far. */
// TODO(P2-033) #ws:strategy-cards #type:arch #size:l #ocp #card-handlers — Цепочка if (entry.card === CARD.x) по всей функции: обработчик на каждую карту (основное, второстепенное, стоимость, свободные жетоны, нарушения) в src/domain/cards/
export function applyCard(game: Game, state: GameState, entry: CardEntry, pack: DataPack, primaries: (number | undefined)[], warnings: Warning[]): void {
  const primary = entry.type === 'strategic';
  // TODO(P2-036) #ws:strategy-cards #type:check #rule:20.5 #rule:82.1 #rule:83.4 #rule:83.7 #rule:92.4.2 #test:020-command-tokens #test:082-strategic-action #test:083-strategy-card #test:092-trade #size:m #secondary — Нет понятия «чья карта»: второстепенное своей карты и повтор второстепенного одной карты за раунд проходят молча
  if (costsStrategyToken(entry)) {
    if (state.strategy < 1) warnings.push(violation('shortStrategy', { have: state.strategy }));
    state.strategy -= 1;
  }
  // No card chosen yet is no repeat of anything.
  if (primary && !entry.forToken && entry.card !== undefined) {
    const held = cardsHeld(game.playerCount);
    const sameCard = entry.card !== undefined && primaries.includes(entry.card);
    primaries.push(entry.card);
    if (primaries.length > held || sameCard) warnings.push(violation('primaryRepeated', { held }));
  }
  const effects = entry.effects ?? {};
  const cost = cardCost(entry, game.faction, state.upgrades, pack);
  const paid = pay(state, effects.payment ?? { planets: [], tradeGoods: 0 }, cost.kind, pack, warnings);
  if (cost.amount > paid) {
    warnings.push(violation(cost.kind === 'influence' ? 'shortInfluence' : 'shortResources', { needed: cost.amount, paid }));
  }
  // TODO(P2-040) #ws:strategy-cards #type:bug #rule:32.2 #rule:32.3 #rule:32-note-3 #test:032-diplomacy #size:m #diplomacy #rivals — Diplomacy: соперники не получают жетон в выбранной системе; нет нарушений «больше двух планет», «Mecatol Rex», «система без моей планеты» (лимит 2 сейчас только в UI)
  const given = (effects.tokens?.tactic ?? 0) + (effects.tokens?.fleet ?? 0) + (effects.tokens?.strategy ?? 0);
  warnings.push(...checkTokensGiven(given, freeTokens(entry, game.expansions), 'card'));
  for (const pool of ['tactic', 'fleet', 'strategy'] as const) {
    const change = effects.tokens?.[pool] ?? 0;
    state[pool] += change;
    if (change < 0 && state[pool] < 0) warnings.push(violation('poolNegative', { pool, have: state[pool] }));
  }
  // TODO(P2-032) #ws:payment #type:check #rule:71-note-3 #test:071-readied #size:s #ready — Готовит любые перечисленные планеты, в том числе чужие
  state.exhausted = state.exhausted.filter(id => !effects.readied?.includes(id));
  addUpgrades(state, entry.upgrades);
  // TODO(P2-039) #ws:strategy-cards #type:bug #rule:92.4 #test:092-trade #size:s #trade #rivals — effects.freeSecondary хранится, но расчёт его не читает: выбранные соперники платят жетон за второстепенное
  if (primary && entry.card === CARD.trade) state.tradeGoods += 3;
  // TODO(P2-037) #ws:strategy-cards #type:bug #rule:45.2 #rule:45-note-3 #test:045-imperial #size:s #imperial #mecatol — Очко по флажку effects.mecatol, а не по контролю Mecatol Rex (mr/mrte) в состоянии
  if (primary && entry.card === CARD.imperial && effects.mecatol) state.vp += 1;
  // The card itself says so: before Thunder's Edge this secondary leaves its token in the chosen system.
  if (!primary && entry.card === CARD.construction && effects.systemId && !game.expansions.includes('te')) {
    // TODO(P2-018) #ws:command-tokens #type:bug #rule:20.6 #test:020-command-tokens #size:s #construction — Второстепенное Construction в систему с моим жетоном законно (жетон уходит в снабжение), а здесь предупреждение
    if (state.tokensOnMap.includes(effects.systemId)) warnings.push(violation('systemHasToken', { systemId: effects.systemId }, 'card'));
    else state.tokensOnMap.push(effects.systemId);
  }
  // The secondary places a structure only and the editor no longer offers units; a plan saved with them keeps them, and is told.
  if (!primary && entry.card === CARD.construction && effects.production) warnings.push(violation('constructionUnits', {}));
  // Before Thunder's Edge this primary lifts a token off the board; the one gained is distributed like any other.
  if (primary && entry.card === CARD.warfare && effects.systemId && !game.expansions.includes('te')) {
    state.tokensOnMap = state.tokensOnMap.filter(id => id !== effects.systemId);
  }
  // TODO(P2-026) #ws:structures #type:check #rule:24.2 #rule:24.3 #rule:24-note-1 #rule:24-note-2 #rule:63.3 #rule:79.3 #rule:85.4 #rule:85.5 #rule:85.6 #test:024-construction #test:063-pds #test:079-space-dock #test:085-structures #size:m #construction #limits — Строения ставятся без проверок: 1 база и 2 PDS на планету, не больше двух на основное и одно на второстепенное Construction, только своя планета и планета системы второстепенного; второй док молча теряется
  for (const { kind, planetId } of effects.structures ?? []) {
    if (kind === 'pds') state.pds[planetId] = (state.pds[planetId] ?? 0) + 1;
    else if (!state.docks.includes(planetId)) state.docks.push(planetId);
  }
  warnings.push(...checkStationStructures(effects.structures ?? [], pack));
  if (effects.production) {
    // Warfare's secondary uses one space dock in the home system (99.3); another card, a dock of its system.
    const source = !primary && entry.card === CARD.warfare ? 'homeDock' : 'card';
    const { systemId, units, ground } = effects.production;
    warnings.push(...checkProduction(game, state, systemId, units, pack, ground, source, 'card'));
    placeProduction(game, state, effects.production.systemId, effects.production.units, pack, effects.production.ground);
    warnings.push(...checkSystem(game, state, effects.production.systemId, pack));
  }
}
