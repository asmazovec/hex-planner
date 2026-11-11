import { useTranslation } from 'react-i18next';
import type { ComponentDef, DataPack } from '../../../domain/types';
import { ComponentCard, type ComponentCardProps } from '../../components/ComponentCard';

export interface ComponentSlotProps {
  /** What the empty place says: what a tap on it chooses. */
  label: string;
  /** The component chosen; none leaves the place empty. */
  def?: ComponentDef;
  pack: DataPack;
  /** What the card says of the component in this place: its note, whose it is, its text. */
  card?: Pick<ComponentCardProps, 'note' | 'owner' | 'text'>;
  /** Opens the choice: from the empty place, and to put another component in a taken one. */
  onPick: () => void;
  onRemove: () => void;
}

/**
 * The one component an entry names: an empty place as wide as its block, dashed, that opens the choice; once chosen,
 * the card of the component with the cross that takes it off and «Заменить» inside the card.
 */
export function ComponentSlot({ label, def, pack, card, onPick, onRemove }: ComponentSlotProps) {
  const { t } = useTranslation();
  if (!def) return <button type="button" className="component-slot" onClick={onPick}>{label}</button>;
  return (
    <ComponentCard def={def} pack={pack} held {...card} onRemove={onRemove}>
      <div className="side-actions"><button type="button" onClick={onPick}>{t('components.change')}</button></div>
    </ComponentCard>
  );
}
