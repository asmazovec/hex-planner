import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import type { ComponentKind, DataPack } from '../../../domain/types';
import { ComponentCard } from '../../components/ComponentCard';
import { ComponentPicker } from '../../components/ComponentPicker';
import { Section } from '../../primitives/Section';

const TECHNOLOGY: ComponentKind[] = ['technology'];

export interface ResearchBlockProps {
  title: string;
  /** How many the card researches and what it costs. */
  note: string;
  /** The technologies the entry researches, by component id. */
  researched: string[];
  /** Whose entry it is: `me` or an opponent id. */
  player: string;
  pack: DataPack;
  onChange: (researched: string[]) => void;
  warnings?: ReactNode;
}

/** What a card researches: each technology a card with its cross, and the button that opens the choice of technologies. */
export function ResearchBlock({ title, note, researched, player, pack, onChange, warnings }: ResearchBlockProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  return (
    <Section
      label={title} title={title} warnings={warnings}
      action={<div className="side-actions"><button type="button" onClick={() => setPicking(true)}>{t('components.research')}</button></div>}
    >
      <span className="muted">{note}</span>
      {researched.map(id => {
        const def = componentById(pack, id);
        return def && <ComponentCard key={id} def={def} pack={pack} held onRemove={() => onChange(researched.filter(other => other !== id))} />;
      })}
      {picking && (
        <ComponentPicker
          kinds={TECHNOLOGY} player={player} onClose={() => setPicking(false)}
          onPick={id => { if (!researched.includes(id)) onChange([...researched, id]); setPicking(false); }}
        />
      )}
    </Section>
  );
}
