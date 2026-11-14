import { useMemo, useState, type ReactNode } from 'react';
import type { KernelView } from '../kernelView';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import type { AdjustmentDelta, DataPack, Entry, UnitCounts, Warning } from '../../../domain/types';
import { mapSource } from '../../../game/space';
import { ComponentPicker } from '../../components/ComponentPicker';
import { NoteField } from '../../primitives/NoteField';
import { HexRemove } from '../../primitives/Icon';
import { Stepper } from '../../primitives/Stepper';
import { systemTitle } from '../../map/systemName';
import { placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { unitsText } from '../../units/unitsText';
import { MapPickButton } from '../../primitives/MapPickButton';
import { EditorFrame } from '../../primitives/EditorFrame';
import { EditorPart } from '../../primitives/EditorPart';
import { Section } from '../../primitives/Section';
import { AgendaChoices } from '../blocks/AgendaChoices';
import { ComponentSlot } from '../blocks/ComponentSlot';

const DELTA_FIELDS = ['tradeGoods', 'commodities', 'tactic', 'fleet', 'strategy', 'vp'] as const;

/** The agenda an entry of the agenda phase names, among what it gains. */
export const agendaOf = (entry: Pick<Entry, 'gains'>, pack: DataPack) =>
  (entry.gains ?? []).flatMap(id => componentById(pack, id) ?? []).find(def => def.kind === 'agenda');

export interface AdjustmentEditorProps {
  /** The table and the board just before the entry, as the kernel keeps them: names, notes, reminders and the places of warnings are read from it. */
  view: KernelView;
  pack: DataPack;
  entry: Extract<Entry, { type: 'adjustment' }>;
  warnings: Warning[];
  /** The next tap on the map chooses the system. */
  picking: boolean;
  /** The common part of every editor, under its own heading: what the entry takes and discards. It stands last. */
  common?: ReactNode;
  onPickSystem: () => void;
  /** Opens the big hex of the system, where its units change. */
  onOpenHex: (slot: string) => void;
  onUpdate: (patch: { label?: string; delta?: AdjustmentDelta; gains?: string[]; choices?: Record<string, string> }) => void;
  onDone: () => void;
  /** The cross of the head: the adjustment goes. */
  onRemove: () => void;
}

/**
 * A manual adjustment on one screen: its label, the numbers it changes, and the system whose units it changes in the
 * big hex. In the agenda phase it is an agenda that was resolved: the card stands first, and a law among them stays in
 * play (7.3), while a directive leaves nothing (7.8); what the outcome changed is entered by the same numbers.
 */
export function AdjustmentEditor({ pack, view, entry, warnings, picking, common, onPickSystem, onOpenHex, onUpdate, onDone, onRemove }: AdjustmentEditorProps) {
  const { t } = useTranslation();
  const [choosing, setChoosing] = useState(false);
  const { delta } = entry;
  const setDelta = (patch: Partial<AdjustmentDelta>) => onUpdate({ delta: { ...delta, ...patch } });
  const systemId = delta.units?.systemId;
  const signed = (units: UnitCounts) => unitsText(units, t, true);
  const changes = [
    signed(delta.units?.units ?? {}),
    ...Object.entries(delta.ground ?? {}).filter(([, units]) => signed(units)).map(([planetId, units]) => `${pack.planets[planetId]?.name ?? planetId}: ${signed(units)}`),
  ].filter(Boolean);
  // The units of the system change in its block; the rest has no block here.
  const placer = placeWarnings(warnings, entry);
  const systemWarnings = [...placer.at('units'), ...placer.at('system')];

  const ofAgenda = entry.phase === 'agenda';
  const agenda = ofAgenda ? agendaOf(entry, pack) : undefined;
  const laws = useMemo(() => view.board.common.laws.map(law => law.id), [view.board]);
  const inPlay = useMemo(() => new Set(laws), [laws]);
  /** The entry names one agenda: another takes its place, and the rest of what the entry gains stays. */
  const setAgenda = (id: string | undefined) => {
    const rest = (entry.gains ?? []).filter(other => componentById(pack, other)?.kind !== 'agenda');
    const next = [...rest, ...(id ? [id] : [])];
    onUpdate({ gains: next.length > 0 ? next : undefined });
  };

  return (
    <EditorFrame title={t(ofAgenda ? 'plan.agenda.title' : 'plan.menu.adjustment')} removeLabel={t('editor.remove')} onRemove={onRemove} onDone={onDone}>
      {/* A warning whose block is not on the screen stands first, where it cannot be missed. */}
      <WarningList warnings={placer.rest()} table={view.table} board={view.board} pack={pack} />

      <EditorPart title={t(ofAgenda ? 'plan.agenda.part' : 'editor.setup')}>
        {ofAgenda && (
          <Section label={t('plan.agenda.card')}>
            <ComponentSlot
              label={t('plan.agenda.pick')} def={agenda} pack={pack}
              card={agenda && { note: t(agenda.detail?.type === 'directive' ? 'plan.agenda.directive' : 'plan.agenda.law') }}
              onPick={() => setChoosing(true)} onRemove={() => setAgenda(undefined)}
            />
            <span className="muted">{t('plan.agenda.hint')}</span>
          </Section>
        )}
        {agenda && <AgendaChoices table={view.table} pack={pack} agenda={agenda} choices={entry.choices} laws={laws} onChange={choices => onUpdate({ choices })} />}

        <Section>
          <NoteField label={t('plan.entries.label')} value={entry.label} onCommit={label => onUpdate({ label })} />
        </Section>

        <Section>
          {DELTA_FIELDS.map(field => (
            <Stepper key={field} name={t(`plan.summary.${field}`)} value={delta[field] ?? 0} onChange={value => setDelta({ [field]: value })} />
          ))}
        </Section>

        <Section label={t('plan.entries.system')} title={t('plan.entries.system')} warnings={<WarningList warnings={systemWarnings} table={view.table} board={view.board} pack={pack} />}>
          {systemId
            ? (
              <div className="source-row in-card">
                <button type="button" className="source-button" onClick={() => onOpenHex(systemId)}>
                  {systemTitle(mapSource(view.table, view.board), pack, systemId, t)}
                  {changes.map(line => <small key={line}>{line}</small>)}
                  {changes.length === 0 && <small>{t('plan.entries.changeUnits')}</small>}
                </button>
                <HexRemove label={t('plan.entries.clearSystem')} onClick={() => setDelta({ units: undefined, ground: undefined })} />
              </div>
            )
            : <MapPickButton active={picking} onToggle={onPickSystem}>{t('plan.entries.pickSystem')}</MapPickButton>}
        </Section>
      </EditorPart>
      {common}
      {choosing && (
        <ComponentPicker
          kinds={['agenda']} player={entry.owner ?? 'me'} owned={inPlay} prefer="new" onClose={() => setChoosing(false)}
          onPick={id => { setAgenda(id); setChoosing(false); }}
        />
      )}
    </EditorFrame>
  );
}
