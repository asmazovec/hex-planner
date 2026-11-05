import { useEffect, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlacedStack, TokenKind } from '../../domain/hexLayout';
import { mergedCounts } from '../../domain/losses';
import { autoPay } from '../../domain/payment';
import { opponentsBySeat, planetHolder } from '../../domain/players';
import { productionCost, productionPlanet, project, stateBeforeEntry, systemPlanets, tileIdOf } from '../../domain/project';
import { unitStats } from '../../domain/unitStats';
import type { DataPack, Entry, StructureKind, UnitCounts, UnitId } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { withCount, type TacticalEntry } from '../plan/tactical';
import { tokenColours } from '../units/sprites';
import { UNIT_ORDER } from '../units/unitOrder';
import { hexToPixel } from './geometry';
import { opponentName } from './opponentName';
import { PlanetDetails } from './PlanetDetails';
import { TileView } from './TileView';
import { TokenPicture, UnitShop, type ShopItem } from './UnitShop';

export type StageMode = 'setup' | 'battle' | 'build';

export interface BoughtUnit { unit: UnitId; /** Null for the system's space area. */ planetId: string | null; count: number }

/** Where my purchases go: what it holds so far, and one tap to buy (1) or take back (-1). */
export interface PurchaseTarget {
  bought: BoughtUnit[];
  change: (unit: UnitId, planetId: string | null, amount: 1 | -1) => void;
  /** Structures this target holds: with `changeStructure` they stay in the entry and off the game. */
  structures?: { kind: StructureKind; planetId: string }[];
  changeStructure?: (kind: StructureKind, planetId: string, amount: 1 | -1) => void;
}

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

/**
 * The big hex over the map, driven by taps on pictures. Setup places and removes units of any origin, battle records
 * losses, build buys. Tile details live in the setup panel. Enemy units and structures have no entry to hold what was
 * lost or bought, so those strips last as long as this view.
 */
export function HexStage({ slot, roundNo, pack, initialMode = 'setup', only, onPurchase, manualPayments = [], onClose }: HexStageProps) {
  const { t } = useTranslation();
  const game = useGame(s => s.game);
  const setEnemyUnits = useGame(s => s.setEnemyUnits);
  const setPlanetControl = useGame(s => s.setPlanetControl);
  const setDock = useGame(s => s.setDock);
  const setPds = useGame(s => s.setPds);
  const changeAdjustment = useGame(s => s.changeAdjustment);
  const updateEntry = useGame(s => s.updateEntry);
  const [mode, setMode] = useState(initialMode);
  const [chosenSide, setSide] = useState('me');
  const [chosenPlanet, setPlanet] = useState(0);
  const [news, setNews] = useState<Record<string, number>>({});
  const [lost, setLost] = useState<Record<string, number>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const plan = game?.plans.find(p => p.id === game.activePlanId);
  const round = plan?.rounds.find(r => r.number === roundNo);
  if (!game || !plan || !round) return null;

  const state = project(game, { ...plan, rounds: plan.rounds.filter(r => r.number <= roundNo) }, 'forecast', pack).state;
  const planets = systemPlanets(game, slot, pack);
  const target = Math.min(chosenPlanet, Math.max(0, planets.length - 1));
  const targetPlanet = planets.at(target);
  const planetIdOf = (planet: number | undefined): string | null => (planet === undefined ? null : planets[planet]?.id ?? null);
  const side = only ? 'me' : chosenSide;
  const colours = tokenColours(game);
  const seated = opponentsBySeat(game).map(o => ({ id: o.id, color: o.color, faction: o.faction, name: opponentName(game, pack, o.id, t) }));
  const holderOf = (planetId: string): string => (state.control[planetId] === 'enemy' ? planetHolder(game, planetId) ?? 'me' : 'me');
  const kindName = (kind: TokenKind): string => (kind === 'pds' ? t('map.pds') : kind === 'spacedock' ? t('map.spaceDock') : t(`unit.${kind}`));

  const changeEnemy = (owner: string, unit: UnitId, amount: number) => {
    const units = game.enemyUnits[slot]?.[owner] ?? {};
    setEnemyUnits(slot, owner, withCount(units, unit, (units[unit] ?? 0) + amount));
  };
  const change = (kind: 'setup' | 'losses', unit: UnitId, planetId: string | null, amount: number) =>
    changeAdjustment(roundNo, { kind, systemId: slot, unit, planetId, amount });
  const changeStructure = (kind: StructureKind, planetId: string, amount: 1 | -1) => {
    if (kind === 'spacedock') setDock(planetId, amount > 0);
    else setPds(planetId, (game.pds[planetId] ?? 0) + amount);
  };

  const tactical = round.entries.filter((e): e is Entry & TacticalEntry => e.type === 'tactical' && e.systemId === slot && e.status !== 'cancelled').at(-1);
  /** Production has no planet of its own: the projection places what it builds. */
  const producedAt = (unit: UnitId): string | null => (pack.units[unit]?.ground ? productionPlanet(game, state, slot, pack) : null);
  const changeProduction = (entry: TacticalEntry, unit: UnitId, amount: 1 | -1) => {
    const before = stateBeforeEntry(game, plan, entry.id, pack);
    const production = withCount(entry.production, unit, (entry.production[unit] ?? 0) + amount);
    const cost = productionCost(production, game.faction, before.upgrades, pack);
    const seed = !manualPayments.includes(entry.id) && cost !== productionCost(entry.production, game.faction, before.upgrades, pack);
    updateEntry(entry.id, seed ? { production, payment: autoPay(before, cost, 'resources', pack) } : { production });
  };
  const purchases: PurchaseTarget = onPurchase ?? {
    bought: [
      ...(UNIT_ORDER.filter(u => (tactical?.production[u] ?? 0) > 0).map(unit => ({ unit, planetId: producedAt(unit), count: tactical?.production[unit] ?? 0 }))),
      ...mergedCounts(round, 'build', slot),
    ],
    change: (unit, planetId, amount) => {
      const held = (tactical?.production[unit] ?? 0) > 0 && producedAt(unit) === planetId;
      if (tactical && (amount > 0 || held)) changeProduction(tactical, unit, amount);
      else changeAdjustment(roundNo, { kind: 'build', systemId: slot, unit, planetId, amount });
    },
  };
  const keyOfBought = ({ unit, planetId }: BoughtUnit): string => {
    const index = planets.findIndex(p => p.id === planetId);
    return stackKey('me', unit, index < 0 ? undefined : index);
  };
  const bought: Record<string, number> = { ...news };
  for (const item of purchases.bought) bought[keyOfBought(item)] = (bought[keyOfBought(item)] ?? 0) + item.count;

  for (const { kind, planetId } of purchases.structures ?? []) {
    const index = planets.findIndex(p => p.id === planetId);
    if (index >= 0) bought[stackKey(holderOf(planetId), kind, index)] = (bought[stackKey(holderOf(planetId), kind, index)] ?? 0) + 1;
  }

  const buy = (kind: TokenKind) => {
    if (isStructure(kind)) {
      if (!targetPlanet || (kind === 'spacedock' && state.docks.includes(targetPlanet.id))) return;
      if (purchases.changeStructure) {
        purchases.changeStructure(kind, targetPlanet.id, 1);
        return;
      }
      changeStructure(kind, targetPlanet.id, 1);
      if (mode === 'build') setNews(bumped(news, stackKey(holderOf(targetPlanet.id), kind, target), 1));
      return;
    }
    const planetId = pack.units[kind]?.ground ? targetPlanet?.id ?? null : null;
    if (side !== 'me') {
      changeEnemy(side, kind, 1);
      if (mode === 'build') setNews(bumped(news, stackKey(side, kind, pack.units[kind]?.ground ? 0 : undefined), 1));
    } else if (mode === 'build') purchases.change(kind, planetId, 1);
    else change('setup', kind, planetId, 1);
  };

  const onToken = ({ kind, owner, planet, key }: PlacedStack) => {
    const planetId = planetIdOf(planet);
    if (mode === 'build') {
      if ((bought[key] ?? 0) === 0) return;
      if (isStructure(kind) && purchases.changeStructure) {
        purchases.changeStructure(kind, planetId ?? '', -1);
        return;
      }
      if (owner === 'me' && !isStructure(kind)) {
        purchases.change(kind, planetId, -1);
        return;
      }
      if (isStructure(kind)) changeStructure(kind, planetId ?? '', -1);
      else changeEnemy(owner, kind, -1);
      setNews(bumped(news, key, -1));
      return;
    }
    if (isStructure(kind)) changeStructure(kind, planetId ?? '', -1);
    else if (owner === 'me') change(mode === 'battle' ? 'losses' : 'setup', kind, planetId, -1);
    else changeEnemy(owner, kind, -1);
    if (mode === 'battle' && (owner !== 'me' || isStructure(kind))) setLost(bumped(lost, key, 1));
  };

  const giveBack = (key: string) => {
    const { owner, kind, planet } = parseKey(key);
    if (isStructure(kind)) changeStructure(kind, planetIdOf(planet) ?? '', 1);
    else changeEnemy(owner, kind, 1);
    setLost(bumped(lost, key, -1));
  };

  const myLosses = mergedCounts(round, 'losses', slot).filter(c => c.count < 0);
  const lossStrip = (owner: string, heading: string) => {
    const session = Object.keys(lost).filter(key => parseKey(key).owner === owner);
    const pictures = [
      ...(owner === 'me' ? myLosses.map(c => ({
        key: `${c.unit}|${c.planetId}`, kind: c.unit as TokenKind, count: -c.count, back: () => change('losses', c.unit, c.planetId, 1),
      })) : []),
      ...session.map(key => ({ key, kind: parseKey(key).kind, count: lost[key], back: () => giveBack(key) })),
    ];
    return (
      <div key={owner} role="group" aria-label={heading}>
        <h3>{heading}</h3>
        {pictures.length === 0 && <p className="muted">{t('stage.noLosses')}</p>}
        <div className="stage-losses">
          {pictures.map(({ key, kind, count, back }) => (
            <button key={key} type="button" className="stage-loss" aria-label={t('stage.giveBack', { unit: kindName(kind) })} onClick={back}>
              <TokenPicture kind={kind} colour={colours[owner]} size={52} />
              {count > 1 && <i>{count}</i>}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const sideFaction = side === 'me' ? game.faction : seated.find(o => o.id === side)?.faction ?? '';
  const sideUpgrades = side === 'me' ? state.upgrades : game.upgrades.opponents[side] ?? [];
  const inBuild = mode === 'build';
  const units = UNIT_ORDER.filter(u => pack.units[u]);
  const boughtOf = (kind: TokenKind): number => Object.entries(bought)
    .filter(([key]) => { const k = parseKey(key); return k.kind === kind && (isStructure(kind) || k.owner === side); })
    .reduce((sum, [, n]) => sum + n, 0);
  const structureColour = colours[targetPlanet ? holderOf(targetPlanet.id) : 'me'];
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

  const mapValue = game.map[slot];
  const tileId = mapValue ? tileIdOf(game, slot) : '';
  const tile = pack.tiles[tileId];
  const rotation = mapValue?.split('@')[1];
  const anomalies = [tile?.anomaly, tile?.secondAnomaly].filter(Boolean).map(name => t(`map.anomaly.${name}`)).join(', ');
  const title = t('map.sheet.title', { number: tile?.number ?? tileId });
  const control = targetPlanet ? state.control[targetPlanet.id] : undefined;
  const planetOwner = control === 'enemy' && targetPlanet ? planetHolder(game, targetPlanet.id) ?? null : control ?? null;
  const owners: { value: string | null; label: string; color?: number }[] = [
    { value: 'me', label: t('map.sheet.mine'), color: game.color },
    ...seated.map(o => ({ value: o.id, label: o.name, color: o.color })),
    { value: null, label: t('map.sheet.none') },
  ];
  const { x, y } = hexToPixel(...(slot.split(',').map(Number) as [number, number]));
  const closeOutside = (e: MouseEvent) => { if (e.target === e.currentTarget) onClose(); };

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
            <button type="button" aria-label={t('map.sheet.close')} onClick={onClose}>✕</button>
          </div>
          {!onPurchase?.changeStructure && (
            <div className="segment" role="group" aria-label={t('stage.modes')}>
              {MODES.map(m => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>{t(`stage.mode.${m}`)}</button>)}
            </div>
          )}

          {mode === 'battle' && (
            <>
              {lossStrip('me', t('stage.lossesMine'))}
              {seated.map(o => lossStrip(o.id, t('stage.lossesOf', { name: o.name })))}
              <p className="muted">{t('stage.battleNote')}</p>
            </>
          )}

          {mode !== 'battle' && (
            <>
              {!only && (
                <div className="segment stage-owners" role="group" aria-label={t('stage.owner')}>
                  {[{ id: 'me', name: t('stage.mine'), color: game.color }, ...seated].map(o => (
                    <button key={o.id} type="button" aria-pressed={side === o.id} onClick={() => setSide(o.id)}>
                      <span className="owner-dot" aria-hidden="true" style={{ background: `var(--player-${o.color})` }} />
                      {o.name}
                    </button>
                  ))}
                </div>
              )}
              <h3>{t(only === 'build' ? 'stage.structures' : inBuild ? 'stage.shop' : 'stage.place')}</h3>
              <UnitShop items={shopItems} onPick={buy} />
              {inBuild && (
                <div className="stage-total">
                  <span>{t('stage.bought', { n: boughtTotal })}</span>
                  <b>{productionCost(sideUnits, sideFaction, sideUpgrades, pack)}</b>
                </div>
              )}
              {inBuild && only !== 'build' && !planets.some(p => state.docks.includes(p.id)) && <p className="warning-text">{t('plan.tactical.noDock')}</p>}
              <p className="muted">{t(inBuild ? 'stage.buildNote' : 'stage.setupNote')}</p>
              {planets.length > 1 && <p className="muted">{t('stage.planetNote')}</p>}
            </>
          )}

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
                  <PlanetDetails planet={targetPlanet} relic={tile?.kind === 'fracture'} exhausted={state.exhausted.includes(targetPlanet.id)} />
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
