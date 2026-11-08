import { useTranslation } from 'react-i18next';
import type { AdjustmentDelta, DataPack, Entry, Game, UnitCounts, Warning } from '../../../domain/types';
import { NoteField } from '../../primitives/NoteField';
import { HexRemove } from '../../primitives/Icon';
import { Stepper } from '../../primitives/Stepper';
import { systemName } from '../../map/systemName';
import { WarningList } from '../../feedback/WarningText';
import { unitsText } from '../../units/unitsText';
import { MapPickButton } from '../../primitives/MapPickButton';

const DELTA_FIELDS = ['tradeGoods', 'tactic', 'fleet', 'strategy', 'vp'] as const;

export interface AdjustmentEditorProps {
  game: Game;
  pack: DataPack;
  entry: Extract<Entry, { type: 'adjustment' }>;
  warnings: Warning[];
  /** The next tap on the map chooses the system. */
  picking: boolean;
  onPickSystem: () => void;
  /** Opens the big hex of the system, where its units change. */
  onOpenHex: (slot: string) => void;
  onUpdate: (patch: { label?: string; delta?: AdjustmentDelta }) => void;
  onDone: () => void;
}

/** A manual adjustment on one screen: its label, the numbers it changes, and the system whose units it changes in the big hex. */
export function AdjustmentEditor({ game, pack, entry, warnings, picking, onPickSystem, onOpenHex, onUpdate, onDone }: AdjustmentEditorProps) {
  const { t } = useTranslation();
  const { delta } = entry;
  const setDelta = (patch: Partial<AdjustmentDelta>) => onUpdate({ delta: { ...delta, ...patch } });
  const systemId = delta.units?.systemId;
  const signed = (units: UnitCounts) => unitsText(units, t, true);
  const changes = [
    signed(delta.units?.units ?? {}),
    ...Object.entries(delta.ground ?? {}).filter(([, units]) => signed(units)).map(([planetId, units]) => `${pack.planets[planetId]?.name ?? planetId}: ${signed(units)}`),
  ].filter(Boolean);

  // TODO(P2-362) #ws:ui-containers #type:ui #needs:prototype #dep:P2-319 #dep:P2-316 — чужой класс .tactical-editor (которого нет в CSS), своя голова и ручные блоки; общая рамка редактора и Section
  return (
    <div className="tactical-editor panel-stack">
      <div className="panel-head">
        <h2>{t('plan.menu.adjustment')}</h2>
        <button type="button" className="primary" onClick={onDone}>{t('plan.tactical.done')}</button>
      </div>

      <div className="editor-section">
        <NoteField label={t('plan.entries.label')} value={entry.label} onCommit={label => onUpdate({ label })} />
      </div>

      <div className="editor-section">
        {DELTA_FIELDS.map(field => (
          <Stepper key={field} name={t(`plan.summary.${field}`)} value={delta[field] ?? 0} onChange={value => setDelta({ [field]: value })} />
        ))}
      </div>

      <div className="editor-section" role="group" aria-label={t('plan.entries.system')}>
        <strong>{t('plan.entries.system')}</strong>
        {systemId
          ? (
            <div className="source-row in-card">
              <button type="button" className="source-button" onClick={() => onOpenHex(systemId)}>
                {systemName(game, pack, systemId)}
                {changes.map(line => <small key={line}>{line}</small>)}
                {changes.length === 0 && <small>{t('plan.entries.changeUnits')}</small>}
              </button>
              <HexRemove label={t('plan.entries.clearSystem')} onClick={() => setDelta({ units: undefined, ground: undefined })} />
            </div>
          )
          : <MapPickButton active={picking} onToggle={onPickSystem}>{t('plan.entries.pickSystem')}</MapPickButton>}
        {/* TODO(P2-363) #ws:ui-warnings #type:ui #size:s — все предупреждения в блоке «Система»; placeWarnings по местам и остаток вверху редактора */}
        <WarningList warnings={warnings} game={game} pack={pack} />
      </div>
    </div>
  );
}
