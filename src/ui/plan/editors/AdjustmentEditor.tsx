import { useTranslation } from 'react-i18next';
import type { AdjustmentDelta, DataPack, Entry, Game, UnitCounts, Warning } from '../../../domain/types';
import { NoteField } from '../../primitives/NoteField';
import { HexRemove } from '../../primitives/Icon';
import { Stepper } from '../../primitives/Stepper';
import { systemName } from '../../map/systemName';
import { placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { unitsText } from '../../units/unitsText';
import { MapPickButton } from '../../primitives/MapPickButton';
import { EditorFrame } from '../../primitives/EditorFrame';
import { Section } from '../../primitives/Section';

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
  /** The cross of the head: the adjustment goes. */
  onRemove: () => void;
}

/** A manual adjustment on one screen: its label, the numbers it changes, and the system whose units it changes in the big hex. */
export function AdjustmentEditor({ game, pack, entry, warnings, picking, onPickSystem, onOpenHex, onUpdate, onDone, onRemove }: AdjustmentEditorProps) {
  const { t } = useTranslation();
  const { delta } = entry;
  const setDelta = (patch: Partial<AdjustmentDelta>) => onUpdate({ delta: { ...delta, ...patch } });
  const systemId = delta.units?.systemId;
  const signed = (units: UnitCounts) => unitsText(units, t, true);
  const changes = [
    signed(delta.units?.units ?? {}),
    ...Object.entries(delta.ground ?? {}).filter(([, units]) => signed(units)).map(([planetId, units]) => `${pack.planets[planetId]?.name ?? planetId}: ${signed(units)}`),
  ].filter(Boolean);
  // The units of the system change in its block; the rest has no block here.
  const placer = placeWarnings(warnings);
  const systemWarnings = [...placer.at('units'), ...placer.at('system')];

  return (
    <EditorFrame title={t('plan.menu.adjustment')} removeLabel={t('editor.remove')} onRemove={onRemove} onDone={onDone}>
      {/* A warning whose block is not on the screen stands first, where it cannot be missed. */}
      <WarningList warnings={placer.rest()} game={game} pack={pack} />

      <Section>
        <NoteField label={t('plan.entries.label')} value={entry.label} onCommit={label => onUpdate({ label })} />
      </Section>

      <Section>
        {DELTA_FIELDS.map(field => (
          <Stepper key={field} name={t(`plan.summary.${field}`)} value={delta[field] ?? 0} onChange={value => setDelta({ [field]: value })} />
        ))}
      </Section>

      <Section label={t('plan.entries.system')} title={t('plan.entries.system')} warnings={<WarningList warnings={systemWarnings} game={game} pack={pack} />}>
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
      </Section>
    </EditorFrame>
  );
}
