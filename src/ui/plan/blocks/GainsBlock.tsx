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
  /**
   * The kind this entry takes more often than any other, by a button of its own that offers that kind alone: the action
   * card drawn in the status phase (81.3). Which card it is only the player knows.
   */
  lead?: ComponentKind;
  /** The list that changed; without a value when it became empty. */
  onChange: (patch: { gains?: string[] } | { spends?: string[] }) => void;
}

/**
 * The components the owner of an entry takes with it, from a deck or the supply, and discards or purges: each a card
 * with its cross, and two buttons that open the choice. What goes to another player is a transaction, not this block.
 * Taking offers the whole catalogue, discarding only what the owner holds by then. What a player does not hold as a
 * card (an agenda the entry names) is not listed here and stays in the entry as it is. The buttons stand over the
 * cards, so a card added moves no button.
 */
export function GainsBlock({ entry, pack, before, lead, onChange }: GainsBlockProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState<Side | 'lead' | null>(null);
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
      <div className="side-actions">
        {lead && <button type="button" onClick={() => setPicking('lead')}>{t(`components.gains.lead.${lead}`)}</button>}
        <button type="button" onClick={() => setPicking('gains')}>{t('components.gains.gain')}</button>
        <button
          type="button" disabled={nothing} onClick={() => setPicking('spends')}
          title={nothing ? t('components.gains.nothing') : undefined}
          aria-label={nothing ? `${t('components.gains.spend')}: ${t('components.gains.nothing').toLowerCase()}` : undefined}
        >
          {t('components.gains.spend')}
        </button>
      </div>
      {(['gains', 'spends'] as const).flatMap(side => listOf(side).map((id, index) => {
        const def = componentById(pack, id);
        return def && HELD_KINDS.includes(def.kind) && (
          <ComponentCard
            key={`${side}-${index}`} def={def} pack={pack} held={side === 'gains'}
            note={side === 'gains' ? t('components.gains.gained') : t('components.gains.spent')}
            onRemove={() => write(side, listOf(side).filter((_, i) => i !== index))}
          />
        );
      }))}
      {picking && (
        <ComponentPicker
          kinds={picking === 'lead' && lead ? [lead] : HELD_KINDS} player={entry.owner ?? 'me'} onClose={() => setPicking(null)}
          {...(picking === 'spends' ? { ids: canLose } : { owned: once, prefer: 'new' as const })}
          onPick={id => { const side = picking === 'spends' ? 'spends' : 'gains'; write(side, [...listOf(side), id]); setPicking(null); }}
        />
      )}
    </Section>
  );
}
