import { useEffect, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlacedStack, TokenKind } from '../../../domain/hexLayout';
import { mergedCounts } from '../../../domain/losses';
import { gameAs, opponentsBySeat, planetHolder } from '../../../domain/players';
import { isOnMap, productionCost, productionPlaces, project, readyResources, stateBeforeEntry, structureOwner, systemMeters, systemPlanets, tileIdOf } from '../../../domain/project';
import { unitStats } from '../../../domain/unitStats';
import type { DataPack, Entry, GameState, StructureKind, UnitCounts, UnitId } from '../../../domain/types';
import { useGame } from '../../../state/gameStore';
import { lossesOf, withAdjustedUnit, withLoss, withProduction, type TacticalEntry } from '../../../domain/tactical';
import { enemyChange, holderIn, structureInGame } from '../../../domain/stacks';
import { HexRemove } from '../../primitives/Icon';
import { placesOf, type WarningPlace } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { tokenColours } from '../../units/sprites';
import { UNIT_ORDER } from '../../units/unitOrder';
import { TokenPicture } from '../../units/UnitToken';
import { slotToPixel } from '../geometry';
import { systemName } from '../systemName';
import { opponentName, shortName } from '../../players/names';
import { PlanetDetails } from './PlanetDetails';
import type { BoughtUnit, PurchaseTarget } from './purchases';
import { TileView } from '../TileView';
import { UnitShop, type ShopItem } from './UnitShop';

export type StageMode = 'setup' | 'battle' | 'build';

export interface HexStageProps {
  slot: string;
  /** The round the map shows: my taps go into its entries, and the hex shows its forecast. */
  roundNo: number;
  pack: DataPack;
  initialMode?: StageMode;
  /** Limits the shop to structures or to units. */
  only?: 'build' | 'units';
  /** Takes my purchases instead of the round's tactical entry on this system or its merged adjustment. */
  onPurchase?: PurchaseTarget;
  /** Tactical entries whose payment was chosen by hand: a purchase leaves it alone. */
  manualPayments?: string[];
  /** The tactical entry that takes my purchases, when one is being edited; otherwise the round's last one on this system. */
  tacticalId?: string;
  /** The manual adjustment that takes my units: the hex then shows only that. */
  adjustmentId?: string;
  /** The opponent whose card this hex serves; an action's own owner counts without it. */
  owner?: string;
  /** What the map shows: control and readiness of a planet follow it, while the hex always shows the forecast. */
  shownState?: GameState;
  onClose: () => void;
}

const MODES: StageMode[] = ['setup', 'battle', 'build'];
const STRUCTURES: StructureKind[] = ['pds', 'spacedock'];

const isStructure = (kind: TokenKind): kind is StructureKind => kind === 'pds' || kind === 'spacedock';

/** The key of a stack on the hex: its owner, kind and the planet's index, or `-` in space. */
const stackKey = (owner: string, kind: TokenKind, planet?: number): string => `${owner}|${kind}|${planet ?? '-'}`;
const parseKey = (key: string) => {
  const [owner, kind, planet] = key.split('|');
  return { owner, kind: kind as TokenKind, planet: planet === '-' ? undefined : Number(planet) };
};

function bumped(record: Record<string, number>, key: string, amount: number): Record<string, number> {
  const { [key]: current = 0, ...rest } = record;
  return current + amount > 0 ? { ...rest, [key]: current + amount } : rest;
}

// TODO(P2-200) #ws:ui-nesting #type:arch #needs:prototype #size:l #hex-stage #srp — 440 строк: модал, три режима, правка чужих юнитов, оплата производства и счётчики в одном компоненте; разделить на оболочку и панели setup/battle/build, покупки вынести в хук
/**
 * The big hex over the map, driven by taps on pictures. Setup places and removes units of any origin, battle records
 * losses, build buys. Tile details live in the setup panel. Enemy units and structures have no entry to hold what was
 * lost or bought, so those strips last as long as this view.
 */
export function HexStage({ slot, roundNo, pack, initialMode = 'setup', only, onPurchase, manualPayments = [], tacticalId, adjustmentId, owner: ownerGiven, shownState, onClose }: HexStageProps) {
  const { t } = useTranslation();
  const game = useGame(s => s.game);
  const setEnemyUnits = useGame(s => s.setEnemyUnits);
  const setEnemyGround = useGame(s => s.setEnemyGround);
  const setPlanetControl = useGame(s => s.setPlanetControl);
  const setDock = useGame(s => s.setDock);
  const setPds = useGame(s => s.setPds);
  const changeAdjustment = useGame(s => s.changeAdjustment);
  const updateEntry = useGame(s => s.updateEntry);
  const [mode, setMode] = useState(initialMode);
  const [chosenSide, setSide] = useState<string | null>(null);
  const [chosenPlanet, setPlanet] = useState(0);
  const [news, setNews] = useState<Record<string, number>>({});
  const [lost, setLost] = useState<Record<string, number>>({});
  /** Why the last tap on a token changed nothing. */
  const [tapNote, setTapNote] = useState<'planned' | null>(null);

  // TODO(P2-202) #ws:ui-containers #type:dup #dep:P2-201 #size:s #modal — Свой обработчик Escape, как в Drawer и FactionPicker: его возьмёт на себя Modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const plan = game?.plans.find(p => p.id === game.activePlanId);
  const round = plan?.rounds.find(r => r.number === roundNo);
  if (!game || !plan || !round) return null;

  const projection = project(game, { ...plan, rounds: plan.rounds.filter(r => r.number <= roundNo) }, 'forecast', pack);
  const { state } = projection;
  const planets = systemPlanets(game, slot, pack);
  const target = Math.min(chosenPlanet, Math.max(0, planets.length - 1));
  const targetPlanet = planets.at(target);
  const planetIdOf = (planet: number | undefined): string | null => (planet === undefined ? null : planets[planet]?.id ?? null);
  /** Whose hand this hex is in: mine, or the opponent whose expected action is being set up. */
  const mine = ownerGiven ?? round.entries.find(e => e.id === tacticalId || e.id === adjustmentId)?.owner ?? 'me';
  const view = gameAs(game, mine === 'me' ? undefined : mine);
  const acting = (mine !== 'me' && state.rivals?.[mine]) || state;
  const side = only ? mine : chosenSide ?? mine;
  const colours = tokenColours(game);
  const seated = opponentsBySeat(game).map(o => ({ id: o.id, color: o.color, faction: o.faction, name: opponentName(game, pack, o.id, t) }));
  const seatName = (o: { name: string; faction: string }): string => shortName(pack, o.faction, o.name);
  const holderOf = (planetId: string): string => holderIn(game, state, planetId) ?? 'me';
  const kindName = (kind: TokenKind): string => (kind === 'pds' ? t('map.pds') : kind === 'spacedock' ? t('map.spaceDock') : t(`unit.${kind}`));

  /** Ground units go by planet; one still listed with the system comes off there. */
  const changeEnemy = (owner: string, unit: UnitId, planetId: string | null, amount: number) => {
    const next = enemyChange(game, slot, owner, unit, planetId, amount);
    if ('planetId' in next) setEnemyGround(next.planetId, owner, next.units);
    else setEnemyUnits(next.slot, owner, next.units);
  };
  // TODO(P2-219) #ws:ui-nesting #type:dup #dep:P2-200 #size:s #hex-stage — Тактическая запись ищется дважды (fightingFor и tactical ниже) по разным правилам: одна запись, которой принадлежат бой и покупки
  /** The tactical action this hex was opened from: its battle belongs to it, and the fleet limit counts it. */
  const fightingFor = tacticalId ? round.entries.find((e): e is Entry & TacticalEntry => e.id === tacticalId && e.type === 'tactical') : undefined;
  const adjusting = adjustmentId ? round.entries.find((e): e is Extract<Entry, { type: 'adjustment' }> => e.id === adjustmentId && e.type === 'adjustment') : undefined;
  const change = (kind: 'setup' | 'losses', unit: UnitId, planetId: string | null, amount: number) => {
    if (kind === 'losses' && fightingFor) updateEntry(fightingFor.id, withLoss(fightingFor, unit, planetId, amount));
    else if (kind === 'setup' && adjusting) updateEntry(adjusting.id, { delta: withAdjustedUnit(adjusting.delta, slot, unit, planetId, amount) });
    else changeAdjustment(roundNo, { kind, systemId: slot, unit, planetId, amount });
  };
  const changeStructure = (kind: StructureKind, planetId: string, amount: 1 | -1) => {
    if (kind === 'spacedock') setDock(planetId, amount > 0);
    else setPds(planetId, (game.pds[planetId] ?? 0) + amount);
  };

  const tacticals = round.entries.filter((e): e is Entry & TacticalEntry => e.type === 'tactical' && e.systemId === slot && e.status !== 'cancelled');
  const tactical = onPurchase ? undefined : tacticals.find(e => e.id === tacticalId) ?? tacticals.filter(e => !e.owner).at(-1);
  /** The state the tactical entry pays and places with: the end of the round may differ. */
  const beforeTactical = tactical && stateBeforeEntry(game, plan, tactical.id, pack);
  const produced = tactical && beforeTactical ? productionPlaces(view, tactical, beforeTactical, pack) : [];
  const changeProduction = (entry: TacticalEntry, before: GameState, unit: UnitId, planetId: string | null, amount: 1 | -1) =>
    updateEntry(entry.id, withProduction(entry, before, view.faction, unit, planetId, amount, pack, manualPayments.includes(entry.id)));
  const purchases: PurchaseTarget = onPurchase ?? {
    bought: [...produced, ...mergedCounts(round, 'build', slot)],
    change: (unit, planetId, amount) => {
      const held = produced.some(p => p.unit === unit && p.planetId === planetId);
      if (tactical && beforeTactical && (amount > 0 || held)) changeProduction(tactical, beforeTactical, unit, planetId, amount);
      else changeAdjustment(roundNo, { kind: 'build', systemId: slot, unit, planetId, amount });
    },
  };
  const keyOfBought = ({ unit, planetId }: BoughtUnit): string => {
    const index = planets.findIndex(p => p.id === planetId);
    return stackKey(mine, unit, index < 0 ? undefined : index);
  };
  const bought: Record<string, number> = { ...news };
  for (const item of purchases.bought) bought[keyOfBought(item)] = (bought[keyOfBought(item)] ?? 0) + item.count;

  for (const { kind, planetId } of purchases.structures ?? []) {
    const index = planets.findIndex(p => p.id === planetId);
    if (index >= 0) bought[stackKey(holderOf(planetId), kind, index)] = (bought[stackKey(holderOf(planetId), kind, index)] ?? 0) + 1;
  }

  const buy = (kind: TokenKind) => {
    setTapNote(null);
    if (isStructure(kind)) {
      if (!targetPlanet || (kind === 'spacedock' && structureOwner(state, 'spacedock', targetPlanet.id) !== undefined)) return;
      if (purchases.changeStructure) {
        purchases.changeStructure(kind, targetPlanet.id, 1);
        return;
      }
      changeStructure(kind, targetPlanet.id, 1);
      if (mode === 'build') setNews(bumped(news, stackKey(holderOf(targetPlanet.id), kind, target), 1));
      return;
    }
    const planetId = pack.units[kind]?.ground ? targetPlanet?.id ?? null : null;
    if (side !== mine) {
      changeEnemy(side, kind, planetId, 1);
      if (mode === 'build') setNews(bumped(news, stackKey(side, kind, pack.units[kind]?.ground ? target : undefined), 1));
    } else if (mode === 'build') purchases.change(kind, planetId, 1);
    else change('setup', kind, planetId, 1);
  };

  /** Whether the game itself holds this structure, apart from what entries plan. */
  const inBaseline = (kind: StructureKind, planetId: string): boolean => structureInGame(game, pack, kind, planetId);

  // TODO(P2-207) #ws:ui-nesting #type:arch #dep:P2-200 #size:m #hex-stage — Один обработчик нажатия на жетон ветвится по режиму, владельцу, виду и базовому составу: разбить на обработчики режимов
  const onToken = ({ kind, owner, planet, key }: PlacedStack) => {
    const planetId = planetIdOf(planet);
    setTapNote(null);
    // In an opponent's expected action only their own units are theirs to touch.
    if (mine !== 'me' && owner !== mine) return;
    if (mode === 'build') {
      if ((bought[key] ?? 0) === 0) return;
      if (isStructure(kind) && purchases.changeStructure) {
        purchases.changeStructure(kind, planetId ?? '', -1);
        return;
      }
      if (owner === mine && !isStructure(kind)) {
        purchases.change(kind, planetId, -1);
        return;
      }
      if (isStructure(kind)) changeStructure(kind, planetId ?? '', -1);
      else changeEnemy(owner, kind, planetId, -1);
      setNews(bumped(news, key, -1));
      return;
    }
    // A stack can hold planned structures too: the baseline ones go first, and one only planned belongs to its entry, so it takes no tap.
    if (isStructure(kind) && !inBaseline(kind, planetId ?? '')) {
      setTapNote('planned');
      return;
    }
    if (isStructure(kind)) changeStructure(kind, planetId ?? '', -1);
    else if (owner === mine) change(mode === 'battle' ? 'losses' : 'setup', kind, planetId, -1);
    else changeEnemy(owner, kind, planetId, -1);
    if (mode === 'battle' && (owner !== mine || isStructure(kind))) setLost(bumped(lost, key, 1));
  };

  const giveBack = (key: string) => {
    const { owner, kind, planet } = parseKey(key);
    if (isStructure(kind)) changeStructure(kind, planetIdOf(planet) ?? '', 1);
    else changeEnemy(owner, kind, planetIdOf(planet), 1);
    setLost(bumped(lost, key, -1));
  };

  const myLosses = fightingFor ? lossesOf(fightingFor) : mine === 'me' ? mergedCounts(round, 'losses', slot).filter(c => c.count < 0) : [];
  const lossStrip = (owner: string, heading: string) => {
    const session = Object.keys(lost).filter(key => parseKey(key).owner === owner);
    const pictures = [
      ...(owner === mine ? myLosses.map(c => ({
        key: `${c.unit}|${c.planetId}`, kind: c.unit as TokenKind, planetId: c.planetId, count: -c.count, back: () => change('losses', c.unit, c.planetId, 1),
      })) : []),
      ...session.map(key => ({ key, kind: parseKey(key).kind, planetId: planetIdOf(parseKey(key).planet), count: lost[key], back: () => giveBack(key) })),
    ];
    /** The planet is named only where a type was lost on two of them. */
    const planetNameOf = (kind: TokenKind, planetId: string | null): string | undefined =>
      (new Set(pictures.filter(p => p.kind === kind).map(p => p.planetId)).size > 1 ? planets.find(p => p.id === planetId)?.name : undefined);
    return (
      <div key={owner} role="group" aria-label={heading}>
        <h3>{heading}</h3>
        {pictures.length === 0 && <p className="muted">{t('stage.noLosses')}</p>}
        <div className="stage-losses">
          {pictures.map(({ key, kind, planetId, count, back }) => {
            const planet = planetNameOf(kind, planetId);
            // TODO(P2-208) #ws:ui-containers #type:dup #dep:P2-261 #size:s #unit-tile — Кнопка потери .stage-loss — ещё одна плитка юнита с числом: UnitTile variant="loss"
            return (
              <button
                key={key} type="button" className="stage-loss" onClick={back}
                aria-label={planet ? t('stage.giveBackOn', { unit: kindName(kind), planet }) : t('stage.giveBack', { unit: kindName(kind) })}
              >
                <TokenPicture kind={kind} colour={colours[owner]} px={52} />
                {count > 1 && <i>{count}</i>}
                {planet && <small>{planet}</small>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const sideFaction = side === mine ? view.faction : seated.find(o => o.id === side)?.faction ?? '';
  const sideUpgrades = side === mine ? onPurchase?.upgrades ?? beforeTactical?.upgrades ?? acting.upgrades : game.upgrades.opponents[side] ?? [];
  const inBuild = mode === 'build';
  const units = UNIT_ORDER.filter(u => pack.units[u]);
  const boughtOf = (kind: TokenKind): number => Object.entries(bought)
    .filter(([key]) => { const k = parseKey(key); return k.kind === kind && (isStructure(kind) || k.owner === side); })
    .reduce((sum, [, n]) => sum + n, 0);
  /** A structure is its owner's; a new one goes to whoever holds the planet. */
  const structureColour = colours[targetPlanet ? structureOwner(state, 'spacedock', targetPlanet.id) ?? structureOwner(state, 'pds', targetPlanet.id) ?? holderOf(targetPlanet.id) : 'me'];
  const shopItems: ShopItem[] = [
    ...(only === 'build' ? [] : units.map((kind): ShopItem => ({
      kind, label: kindName(kind), colour: colours[side], disabled: pack.units[kind]?.ground && planets.length === 0,
      price: inBuild ? unitStats(sideFaction, kind, sideUpgrades.includes(kind), pack)?.cost : undefined,
      bought: inBuild ? boughtOf(kind) : undefined,
    }))),
    ...(only === 'units' ? [] : STRUCTURES.map((kind): ShopItem => ({
      kind, label: kindName(kind), colour: structureColour, disabled: planets.length === 0, bought: inBuild ? boughtOf(kind) : undefined,
    }))),
  ];
  const sideUnits: UnitCounts = Object.fromEntries(units.map(unit => [unit, boughtOf(unit)]));
  const boughtTotal = Object.keys(bought).filter(key => parseKey(key).owner === side).reduce((sum, key) => sum + bought[key], 0);
  // TODO(P2-210) #ws:ui-warnings #type:dup #size:m #warning-channel #duplicate-of-domain — Перебор ресурсов, флота и вместимости решает сам (over, класс stage-meter-over): красить счётчики по кодам shortResources/fleetPool/capacitySystem записи
  /** My shop counts along: what it costs against what I can pay, and what the system holds after it. */
  const payer = onPurchase?.before ?? beforeTactical ?? acting;
  const spent = productionCost(sideUnits, sideFaction, sideUpgrades, pack);
  const spendable = readyResources(payer, pack) + payer.tradeGoods;
  const meters = systemMeters(view, acting.systems[slot] ?? {}, acting.upgrades, pack);
  const meterRows = [
    { key: 'resources', now: spent, of: spendable, over: spent > spendable },
    { key: 'fleet', now: meters.ships, of: acting.fleet, over: meters.ships > acting.fleet },
    { key: 'capacity', now: meters.load, of: meters.capacity, over: meters.load > meters.capacity },
  ];
  const warningEntry = onPurchase ? onPurchase.entryId : tactical?.id;
  // The shop answers for what is bought and how it is paid; a route or a landing has its own block in the editor.
  const shopPlaces: WarningPlace[] = onPurchase ? ['production', 'payment', 'units'] : ['production', 'payment'];
  const entryWarnings = (warningEntry ? projection.warningsByEntry[warningEntry] ?? [] : [])
    .filter(w => placesOf(w).some(place => shopPlaces.includes(place)));

  const mapValue = game.map[slot];
  const tileId = isOnMap(game, slot) ? tileIdOf(game, slot) : pack.tiles[slot] ? slot : '';
  const tile = pack.tiles[tileId];
  const rotation = mapValue?.split('@')[1];
  const anomalies = [tile?.anomaly, tile?.secondAnomaly].filter(Boolean).map(name => t(`map.anomaly.${name}`)).join(', ');
  const title = t('map.sheet.title', { number: tile ? systemName(game, pack, slot) : tileId });
  const shown = shownState ?? state;
  const control = targetPlanet ? shown.control[targetPlanet.id] : undefined;
  const planetOwner = control === 'enemy' && targetPlanet ? planetHolder(game, targetPlanet.id) ?? null : control ?? null;
  const owners: { value: string | null; label: string; color?: number }[] = [
    { value: 'me', label: t('map.sheet.mine'), color: game.color },
    ...seated.map(o => ({ value: o.id, label: seatName(o), color: o.color })),
    { value: null, label: t('map.sheet.none') },
  ];
  const { x, y } = slotToPixel(slot);
  const closeOutside = (e: MouseEvent) => { if (e.target === e.currentTarget) onClose(); };

  // TODO(P2-201) #ws:ui-containers #type:ui #size:m #modal — Модал собран руками (.stage + .stage-dialog, без портала), третья копия после FactionPicker и ShareConflict: Modal с title, onClose и HexRemove
  return (
    <div className="stage" onClick={closeOutside}>
      <div className="stage-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="stage-hex">
          <svg viewBox="-68 -62 136 124" role="group" aria-label={t('stage.hex')}>
            <g transform={`translate(${-x} ${-y})`}>
              <TileView
                slotKey={slot} pack={pack} game={game} state={state} ingress={game.fracture.ingress.includes(slot)}
                stage={{ target, onPlanet: setPlanet, onToken, ringed: item => inBuild && (bought[item.key] ?? 0) > 0 }}
              />
            </g>
          </svg>
        </div>
        <div className="stage-panel">
          <div className="stage-head">
            <strong>{title}</strong>
            <HexRemove label={t('map.sheet.close')} onClick={onClose} />
          </div>
          {!onPurchase?.changeStructure && !adjusting && (
            <div className="segment" role="group" aria-label={t('stage.modes')}>
              {MODES.map(m => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{t(`stage.mode.${m}`)}</button>)}
            </div>
          )}

          {/* It answers a tap on the hex, so it stands at the top of the panel beside it. */}
          {/* TODO(P2-212) #ws:ui-warnings #type:ui #size:s #warning-channel — Пояснение к нажатию свёрстано как p.warning-text: показать через WarningList с произвольным текстом (message) */}
          {tapNote && <p className="warning-text place-warnings" role="status">{t(`stage.tapNote.${tapNote}`)}</p>}

          {mode === 'battle' && (
            <>
              {lossStrip('me', t('stage.lossesMine'))}
              {seated.map(o => lossStrip(o.id, t('stage.lossesOf', { name: o.name })))}
              <p className="muted">{t('stage.battleNote')}</p>
            </>
          )}

          {mode !== 'battle' && (
            <>
              {/* TODO(P2-213) #ws:ui-containers #type:ui #size:m #player-colour #inline-style #rivals — Выбор игрока точкой и именем собран руками, цвет через var(--player-N) во style: PlayerChoice с PlayerDot */}
              {!only && mine === 'me' && (
                <div className="segment stage-owners" role="group" aria-label={t('stage.owner')}>
                  {[{ id: 'me', name: t('stage.mine'), color: game.color, faction: '' }, ...seated].map(o => (
                    <button key={o.id} type="button" aria-pressed={side === o.id} onClick={() => setSide(o.id)}>
                      <span className="owner-dot" aria-hidden="true" style={{ background: `var(--player-${o.color})` }} />
                      {seatName(o)}
                    </button>
                  ))}
                </div>
              )}
              {/* TODO(P2-215) #ws:ui-containers #type:ui #size:s #section-title — Голые h3 здесь и в lossStrip, уровни заголовков произвольные: SectionTitle */}
              <h3>{t(only === 'build' ? 'stage.structures' : inBuild ? 'stage.shop' : 'stage.place')}</h3>
              <UnitShop items={shopItems} onPick={buy} />
              {inBuild && (
                <div className="stage-total">
                  <span>{t('stage.bought', { n: boughtTotal })}</span>
                  <b>{spent}</b>
                </div>
              )}
              {inBuild && side === mine && only !== 'build' && (
                <div className="stage-meters" role="group" aria-label={t('stage.meters')}>
                  {meterRows.map(({ key, now, of, over }) => (
                    <div key={key} className={over ? 'stage-meter stage-meter-over' : 'stage-meter'}>
                      <span>{t(`stage.meter.${key}`)}</span>
                      <b>{now} / {of}</b>
                    </div>
                  ))}
                </div>
              )}
              {inBuild && side === mine && <WarningList warnings={entryWarnings} game={game} pack={pack} />}
              <p className="muted">{t(inBuild ? 'stage.buildNote' : 'stage.setupNote')}</p>
              {planets.length > 1 && <p className="muted">{t('stage.planetNote')}</p>}
            </>
          )}

          {/* TODO(P2-217) #ws:ui-nesting #type:ui #needs:prototype #size:m #nesting #hex-stage — Свойства тайла и контроль планеты лежат пятым-шестым уровнем под режимом: отдельный режим сегмента или поповер */}
          {mode === 'setup' && (
            <div className="stage-facts">
              {!tile && <p className="muted">{t('map.sheet.unknown')}</p>}
              {rotation && <p className="muted">{t('map.sheet.rotation', { deg: Number(rotation) * 60 })}</p>}
              {anomalies && <p className="muted">{t('map.sheet.anomaly', { name: anomalies })}</p>}
              {tile && tile.wormholes.length > 0 && <p className="muted">{t('map.sheet.wormholes', { list: tile.wormholes.join(', ') })}</p>}
              {tile && planets.length === 0 && <p className="muted">{t('map.sheet.noPlanets')}</p>}
              {targetPlanet && (
                <div role="group" aria-label={targetPlanet.name} className="stage-planet">
                  <strong>{targetPlanet.name}</strong>
                  <PlanetDetails planet={targetPlanet} relic={tile?.kind === 'fracture'} exhausted={shown.exhausted.includes(targetPlanet.id)} />
                  {/* TODO(P2-214) #ws:ui-containers #type:ui #dep:P2-213 #size:s #player-colour #inline-style — Вторая ручная сборка выбора игрока (контроль планеты) с цветом во style: PlayerChoice с вариантом «Нет» */}
                  <div className="segment stage-owners" role="group" aria-label={t('map.sheet.controlLabel', { planet: targetPlanet.name })}>
                    {owners.map(o => (
                      <button key={String(o.value)} type="button" aria-pressed={planetOwner === o.value} onClick={() => setPlanetControl(targetPlanet.id, o.value)}>
                        {o.color !== undefined && <span className="owner-dot" aria-hidden="true" style={{ background: `var(--player-${o.color})` }} />}
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
