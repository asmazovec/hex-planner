import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { duplicateTiles, mapIsEmpty } from '../../domain/mapBuilder';
import { project, stateBeforeEntry } from '../../domain/project';
import type { Entry, EntryBody, Plan } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { HexMap, type Arrow } from '../map/HexMap';
import { MapBuilderPanel } from '../map/MapBuilderPanel';
import { TileSheet } from '../map/TileSheet';
import type { Highlight } from '../map/TileView';
import { useArrowDrag } from '../map/useArrowDrag';
import type { ActionType } from '../plan/ActionMenu';
import { ActionMenu } from '../plan/ActionMenu';
import { EntryList } from '../plan/EntryList';
import { PlanTabs, planDisplayName } from '../plan/PlanTabs';
import { StrategyCards } from '../plan/StrategyCards';
import { SummaryBar } from '../plan/SummaryBar';
import { arrowsOf, hasUnits, sourceSlot, suggestMoves, type TacticalEntry } from '../plan/tactical';
import { TacticalEditor } from '../plan/TacticalEditor';

/** `entryId` is null while a new action waits for its system; `picking` means the next tile tap sets the system. */
interface Editing { entryId: string | null; picking: boolean; addingSource: boolean; pickerFrom: string | null }

const EMPTY_PAYMENT = { planets: [], tradeGoods: 0 };

const SIMPLE_BODIES: Record<Exclude<ActionType, 'tactical'>, EntryBody> = {
  strategic: { type: 'strategic' },
  secondary: { type: 'secondary' },
  component: { type: 'component', note: '' },
  expedition: { type: 'expedition', sliceId: null, payment: EMPTY_PAYMENT },
  pass: { type: 'pass' },
  adjustment: { type: 'adjustment', label: '', delta: {} },
};

function PlanName({ plan }: { plan: Plan }) {
  const { t } = useTranslation();
  const renamePlan = useGame(s => s.renamePlan);
  const shown = planDisplayName(plan.name, t);
  const [text, setText] = useState(shown);
  const commit = () => { if (text !== shown) renamePlan(text); };
  return (
    <input
      type="text" aria-label={t('plan.name')} value={text} onChange={e => setText(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); }}
    />
  );
}

/** Map on the left, plan on the right, tabs and totals on top. */
export function PlanScreen() {
  const { t, i18n } = useTranslation();
  const game = useGame(s => s.game);
  const addEntry = useGame(s => s.addEntry);
  const updateEntry = useGame(s => s.updateEntry);
  const addRound = useGame(s => s.addRound);
  const pack = useMemo(() => loadPack(game?.expansions ?? []), [game?.expansions]);

  const [roundNo, setRoundNo] = useState<number | null>(null);
  const [mapMode, setMapMode] = useState<'forecast' | 'now'>('forecast');
  const [sheet, setSheet] = useState<string | null>(null);
  const [building, setBuilding] = useState(() => game !== null && mapIsEmpty(game, pack));
  const [editing, setEditing] = useState<Editing | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [manualPayments, setManualPayments] = useState<string[]>([]);
  const [view, setView] = useState<'map' | 'plan'>('map');

  const plan = game?.plans.find(p => p.id === game.activePlanId);
  const round = plan?.rounds.find(r => r.number === roundNo) ?? plan?.rounds.at(-1);
  const entry = editing?.entryId
    ? round?.entries.find((e): e is Entry & TacticalEntry => e.id === editing.entryId && e.type === 'tactical')
    : undefined;
  // Undo can remove the edited entry, which ends the editing.
  const session = editing && (entry || editing.entryId === null) ? editing : null;
  const activeSystem = session && !session.picking ? entry?.systemId ?? null : null;

  const openSource = (source: string) => {
    if (!game || !plan || !entry || !session) return;
    const known = entry.moves.some(m => sourceSlot(game, pack, m.from) === source);
    if (!known) {
      const added = suggestMoves(game, pack, stateBeforeEntry(game, plan, entry.id, pack), source);
      if (added.length > 0) updateEntry(entry.id, { moves: [...entry.moves, ...added] });
    }
    setEditing({ ...session, addingSource: false, pickerFrom: source });
    setView('plan');
  };

  const arrow = useArrowDrag({ activeSystem, onComplete: openSource, onCancel: () => undefined });

  if (!game || !plan || !round) {
    return <section className="screen"><p className="muted">{t('plan.noGame')}</p></section>;
  }

  // Totals and map show the end of the chosen round: later rounds would ready planets and clear its tokens.
  const upToRound = { ...plan, rounds: plan.rounds.filter(r => r.number <= round.number) };
  const now = project(game, upToRound, 'now', pack);
  const forecast = project(game, upToRound, 'forecast', pack);

  const closePanels = () => {
    setEditing(null);
    setSheet(null);
    setOpenId(null);
  };

  const onPick = (type: ActionType) => {
    if (type === 'tactical') {
      setSheet(null);
      setBuilding(false);
      setEditing({ entryId: null, picking: true, addingSource: false, pickerFrom: null });
      setView('map');
      return;
    }
    const id = addEntry(round.number, SIMPLE_BODIES[type], 'action');
    setOpenId(id);
  };

  const onTileTap = (slot: string) => {
    if (session?.picking) {
      if (!game.map[slot]) return;
      if (entry) {
        updateEntry(entry.id, { systemId: slot });
        setEditing({ ...session, picking: false });
      } else {
        const id = addEntry(round.number, {
          type: 'tactical', systemId: slot, moves: [], landings: [], production: {}, payment: EMPTY_PAYMENT,
        }, 'action');
        setEditing({ entryId: id, picking: false, addingSource: false, pickerFrom: null });
      }
      setView('plan');
      return;
    }
    if (session && entry) {
      if (session.addingSource && slot !== entry.systemId && game.map[slot]) openSource(slot);
      return;
    }
    setSheet(slot);
    setView('plan');
  };

  const toggleBuilding = () => {
    closePanels();
    setBuilding(!building);
  };

  const onOpenEntry = (opened: Entry) => {
    setSheet(null);
    if (opened.type === 'tactical') {
      setEditing({ entryId: opened.id, picking: opened.systemId === null, addingSource: false, pickerFrom: null });
      if (opened.systemId === null) setView('map');
    } else {
      setOpenId(openId === opened.id ? null : opened.id);
    }
  };

  const shownState = session || mapMode === 'forecast' ? forecast.state : now.state;
  const tacticals = round.entries.filter((e): e is Entry & TacticalEntry => e.type === 'tactical');
  const arrows = new Map<string, Arrow>();
  for (const item of tacticals) {
    if (item.id !== entry?.id && (item.status !== 'planned' || (!session && mapMode === 'now'))) continue;
    for (const a of arrowsOf(game, pack, item, forecast.warningsByEntry[item.id] ?? [])) arrows.set(`${a.from}>${a.to}`, a);
  }

  const highlights: Record<string, Highlight> = {};
  if (activeSystem !== null) {
    for (const slot of Object.keys(game.map)) if (hasUnits(forecast.state.systems[slot])) highlights[slot] = 'valid';
    highlights[activeSystem] = 'active';
  }

  const duplicates = building ? duplicateTiles(game.map) : [];
  const hint = session?.picking ? t('plan.tactical.pickHint')
    : session?.addingSource ? t('plan.tactical.sourceHint')
      : duplicates.length > 0 ? t('builder.duplicates', { list: duplicates.join(', ') }) : null;
  const manualPayment = entry !== undefined && manualPayments.includes(entry.id);
  const hasStatusEntry = round.entries.some(e => e.type === 'statusTokens');

  return (
    <section className="plan-screen" data-view={view}>
      <PlanTabs
        game={game} roundNo={round.number} onSelectPlan={closePanels}
        onSelectRound={number => { closePanels(); setRoundNo(number); }}
        onAddRound={() => {
          closePanels();
          addRound();
          setRoundNo(Math.max(...plan.rounds.map(r => r.number)) + 1);
        }}
      />
      <SummaryBar now={now.state} forecast={forecast.state} pack={pack} />
      <div className="plan-body">
        <div className="plan-map">
          <HexMap
            game={game} state={shownState} pack={pack} highlights={highlights} arrows={[...arrows.values()]}
            arrowPreview={arrow.preview} selectedId={sheet} onTileTap={onTileTap} onTilePointerDown={arrow.onTilePointerDown}
          />
          <div className="map-tools">
            <button type="button" aria-pressed={building} onClick={toggleBuilding}>{t('plan.buildMap')}</button>
            <div className="map-mode" role="group" aria-label={t('plan.mapShows')}>
              {(['forecast', 'now'] as const).map(mode => (
                <button key={mode} type="button" aria-pressed={mapMode === mode} disabled={session !== null} onClick={() => setMapMode(mode)}>
                  {t(`plan.${mode}`)}
                </button>
              ))}
            </div>
          </div>
          {hint && <p className="map-hint" role="status">{hint}</p>}
        </div>
        <div className="plan-panel">
          {sheet !== null && building && (
            <MapBuilderPanel slot={sheet} game={game} pack={pack} state={shownState} onClose={() => setSheet(null)} />
          )}
          {sheet !== null && !building && (
            <TileSheet slotKey={sheet} pack={pack} game={game} state={shownState} onClose={() => setSheet(null)} />
          )}
          {sheet === null && session?.picking && (
            <div className="panel-head">
              <h2>{t('plan.tactical.title')}</h2>
              <button
                type="button"
                onClick={() => setEditing(entry ? { ...session, picking: false } : null)}
              >
                {t('plan.tactical.cancel')}
              </button>
            </div>
          )}
          {sheet === null && session && !session.picking && entry && (
            <TacticalEditor
              game={game} pack={pack} entry={entry} before={stateBeforeEntry(game, plan, entry.id, pack)}
              warnings={forecast.warningsByEntry[entry.id] ?? []} addingSource={session.addingSource}
              pickerFrom={session.pickerFrom} manualPayment={manualPayment}
              onUpdate={patch => updateEntry(entry.id, patch)}
              onAddSource={() => {
                setEditing({ ...session, addingSource: !session.addingSource });
                if (!session.addingSource) setView('map');
              }}
              onOpenPicker={source => setEditing({ ...session, pickerFrom: source })}
              onChangeSystem={() => {
                setEditing({ ...session, picking: true, addingSource: false });
                setView('map');
              }}
              onManualPayment={open => setManualPayments(ids => (open ? [...ids, entry.id] : ids.filter(id => id !== entry.id)))}
              onDone={() => setEditing(null)}
            />
          )}
          {sheet === null && !session && (
            <>
              <PlanName key={`${plan.id}:${plan.name}:${i18n.language}`} plan={plan} />
              <StrategyCards key={`${plan.id}:${round.number}`} expansions={game.expansions} round={round} />
              <EntryList
                game={game} pack={pack} round={round} warnings={forecast.warningsByEntry} state={forecast.state}
                openId={openId} onOpen={onOpenEntry}
              />
              <ActionMenu onPick={onPick} />
              {!hasStatusEntry && (
                <button type="button" onClick={() => addEntry(round.number, { type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0 }, 'status')}>
                  {t('plan.entries.statusTokens')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="plan-switch" role="group" aria-label={t('plan.views')}>
        <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>{t('plan.mobileMap')}</button>
        <button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>{t('plan.mobilePlan')}</button>
      </div>
    </section>
  );
}
