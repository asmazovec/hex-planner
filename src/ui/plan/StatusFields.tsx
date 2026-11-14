import { useTranslation } from 'react-i18next';
import type { DataPack, Warning } from '../../domain/types';
import type { Turn } from '../../game/actions';
import { roundPointsOf, withRoundPoints, withStatusTokens } from '../../game/edit/turn';
import { legacyEntry } from '../../game/entry';
import { legacyKey } from '../../game/keys';
import { statusTokensFree } from '../../game/queries';
import { StepHints } from '../feedback/StepHints';
import { WarningList } from '../feedback/WarningText';
import { shortName } from '../players/names';
import { playerStyle } from '../primitives/player';
import { SectionTitle } from '../primitives/SectionTitle';
import { Stepper } from '../primitives/Stepper';
import { GainsBlock } from './blocks/GainsBlock';
import { ScoredBlock } from './blocks/ScoredBlock';
import { TokenTiles } from './blocks/TokenTiles';
import { UsesBlock } from './blocks/UsesBlock';
import type { KernelView } from './kernelView';

export interface StatusFieldsProps {
  /** The turn of the status phase. */
  turn: Turn;
  pack: DataPack;
  /** The table and the board just before the turn. */
  view: KernelView;
  /** The board at the end of the round, as the forecast has it: the points each player has with this turn's. */
  end: KernelView;
  warnings: Warning[];
  onChange: (turn: Turn) => void;
}

// TODO(P2-349) #ws:ui-nesting #type:ui #needs:prototype — жетоны статуса раскрываются внутри строки записи (5 уровней); отдельное меню на месте списка, как Strategy и Adjustment
/**
 * The status turn: the tokens taken this round, the points each player gains with their running total, and what the
 * phase brings: the action card drawn (81.3), whichever it is, has a button of its own.
 */
export function StatusFields({ turn, pack, view, end, warnings, onChange }: StatusFieldsProps) {
  const { t } = useTranslation();
  const status = turn.action.kind === 'status' ? turn.action : undefined;
  if (!status) return null;
  // Two tokens, and what the player's components make of them (Versatile, Hyper Metabolism, a note named in «Used»).
  const free = statusTokensFree(view.table, view.board, pack, turn.player, legacyEntry(view.table, turn));
  // The viewer first, then the others by seat, as the table lists them.
  const seated = view.table.players.filter(p => p.seat <= 8).sort((a, b) => a.seat - b.seat);
  const players = [...seated.filter(p => p.id === view.table.viewer), ...seated.filter(p => p.id !== view.table.viewer)];
  return (
    <>
      <TokenTiles
        free={free} values={{ tactic: status.tactic, fleet: status.fleet, strategy: status.strategy }}
        onChange={values => onChange(withStatusTokens(turn, values))}
      />
      <WarningList warnings={warnings} table={view.table} board={view.board} pack={pack} />
      <SectionTitle as="h5" className="status-points">{t('plan.entries.roundPoints')}</SectionTitle>
      {players.map((player, index) => {
        return (
          <div key={player.id} className="status-player" style={playerStyle('--player', player.color)}>
            <Stepper
              name={shortName(pack, player.faction, t('players.player', { n: index + 1 }))}
              note={t('plan.entries.pointsTotal', { n: end.board.players[player.id]?.vp ?? 0 })}
              value={roundPointsOf(turn, player.id)} min={0}
              onChange={value => onChange(withRoundPoints(turn, player.id, value))}
            />
          </div>
        );
      })}
      <p className="muted status-reminder">{t('plan.entries.planetsRefresh')}</p>
      {/* The objectives scored and their reminders come after the points: the warning under the tiles stays above the points. */}
      <StepHints pack={pack} table={view.table} board={view.board} step="status" players={[legacyKey(view.table, turn.player)]} />
      <ScoredBlock turn={turn} pack={pack} view={view} onChange={onChange} />
      {/* Last: a card taken stands under its buttons and moves nothing above. */}
      <GainsBlock turn={turn} pack={pack} view={view} lead="actionCard" onChange={onChange} />
      {/* What the status phase uses: Letani Behemoth replaces the infantry of Mitosis, an agent is readied there. */}
      <UsesBlock turn={turn} pack={pack} view={view} onChange={onChange} />
    </>
  );
}
