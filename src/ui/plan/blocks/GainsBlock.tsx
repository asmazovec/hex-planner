import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import { emptyHoldings, heldOnce, HOLDING_FIELD, losable } from '../../../domain/holdings';
import type { ComponentKind, DataPack, Entry, GameState } from '../../../domain/types';
import { ComponentCard } from '../../components/ComponentCard';
import { ComponentPicker } from '../../components/ComponentPicker';
import { Section } from '../../primitives/Section';

type Side = 'gains' | 'spends';
/** What a player holds as a list: only these can be taken or discarded. */
const HELD_KINDS = Object.keys(HOLDING_FIELD) as ComponentKind[];

export interface GainsBlockProps {
  /** Any entry: its owner gains and gives. */
  entry: Entry;
  pack: DataPack;
  /** The state of the entry's owner just before it: only what they hold then can be discarded. Without it nothing can. */
  before?: GameState;
  /** The list that changed; without a value when it became empty. */
  onChange: (patch: { gains?: string[] } | { spends?: string[] }) => void;
}

/**
 * The components the owner of an entry takes with it, from a deck or the supply, and discards or purges: each a card
 * with its cross, and two buttons that open the choice. What goes to another player is a transaction, not this block.
 * Taking offers the whole catalogue, discarding only what the owner holds by then.
 */
export function GainsBlock({ entry, pack, before, onChange }: GainsBlockProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState<Side | null>(null);
  const listOf = (side: Side): string[] => entry[side] ?? [];
  const write = (side: Side, ids: string[]) => onChange(side === 'gains' ? { gains: ids.length > 0 ? ids : undefined } : { spends: ids.length > 0 ? ids : undefined });
  const title = t('components.gains.title');
  const holdings = before?.holdings ?? emptyHoldings();
  const canLose = losable(holdings, entry);
  const once = useMemo(() => heldOnce(holdings), [holdings]);
  const nothing = canLose.length === 0;
  return (
    <Section label={title} title={title}>
      <span className="muted">{t('components.gains.hint')}</span>
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
        <button
          type="button" disabled={nothing} onClick={() => setPicking('spends')}
          title={nothing ? t('components.gains.nothing') : undefined}
          aria-label={nothing ? `${t('components.gains.spend')}: ${t('components.gains.nothing').toLowerCase()}` : undefined}
        >
          {t('components.gains.spend')}
        </button>
      </div>
      {picking && (
        <ComponentPicker
          kinds={HELD_KINDS} player={entry.owner ?? 'me'} onClose={() => setPicking(null)}
          {...(picking === 'spends' ? { ids: canLose } : { owned: once, prefer: 'new' as const })}
          onPick={id => { write(picking, [...listOf(picking), id]); setPicking(null); }}
        />
      )}
    </Section>
  );
}
