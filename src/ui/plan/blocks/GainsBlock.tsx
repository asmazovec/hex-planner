import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import { HOLDING_FIELD } from '../../../domain/holdings';
import type { ComponentKind, DataPack, Entry } from '../../../domain/types';
import { ComponentCard } from '../../components/ComponentCard';
import { ComponentPicker } from '../../components/ComponentPicker';
import { Section } from '../../primitives/Section';

type Side = 'gains' | 'spends';
/** What a player holds as a list: only these can be gained or given away. */
const HELD_KINDS = Object.keys(HOLDING_FIELD) as ComponentKind[];

export interface GainsBlockProps {
  /** Any entry: its owner gains and gives. */
  entry: Entry;
  pack: DataPack;
  /** The list that changed; without a value when it became empty. */
  onChange: (patch: { gains?: string[] } | { spends?: string[] }) => void;
}

/** The components the owner of an entry gains with it and gives away: each a card with its cross, and two buttons that open the choice. */
export function GainsBlock({ entry, pack, onChange }: GainsBlockProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState<Side | null>(null);
  const listOf = (side: Side): string[] => entry[side] ?? [];
  const write = (side: Side, ids: string[]) => onChange(side === 'gains' ? { gains: ids.length > 0 ? ids : undefined } : { spends: ids.length > 0 ? ids : undefined });
  const title = t('components.gains.title');
  return (
    <Section label={title} title={title}>
      {(['gains', 'spends'] as const).flatMap(side => listOf(side).map((id, index) => {
        const def = componentById(pack, id);
        return def && (
          <ComponentCard
            key={`${side}-${index}`} def={def} pack={pack} held={side === 'gains'}
            note={side === 'gains' ? t('components.gains.gained') : t('components.gains.spent')}
            onRemove={() => write(side, listOf(side).filter((_, i) => i !== index))}
          />
        );
      }))}
      <div className="side-actions">
        <button type="button" onClick={() => setPicking('gains')}>{t('components.gains.gain')}</button>
        <button type="button" onClick={() => setPicking('spends')}>{t('components.gains.spend')}</button>
      </div>
      {picking && (
        <ComponentPicker
          kinds={HELD_KINDS} player={entry.owner ?? 'me'} onClose={() => setPicking(null)}
          onPick={id => { write(picking, [...listOf(picking), id]); setPicking(null); }}
        />
      )}
    </Section>
  );
}
