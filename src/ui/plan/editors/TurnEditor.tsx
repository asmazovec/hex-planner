import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { componentById } from '../../../domain/components';
import { readyToPlay } from '../../../domain/project';
import { playerState } from '../../../domain/stacks';
import type { ComponentKind, DataPack, Entry, Game, GameState, Warning } from '../../../domain/types';
import { ComponentCard } from '../../components/ComponentCard';
import { ComponentPicker } from '../../components/ComponentPicker';
import { placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { StepHints } from '../../feedback/StepHints';
import { EditorFrame } from '../../primitives/EditorFrame';
import { NoteField } from '../../primitives/NoteField';
import { Section } from '../../primitives/Section';

/** What a component action can play. */
const PLAYED_KINDS: ComponentKind[] = ['actionCard', 'leader', 'relic', 'technology', 'promissory', 'ability', 'breakthrough', 'legendary'];

export interface TurnEditorProps {
  entry: Extract<Entry, { type: 'component' | 'pass' }>;
  game: Game;
  pack: DataPack;
  /** The whole board just before the entry: what its owner can play as a component action is reminded of. */
  board?: GameState;
  /** The turn's warnings: those its blocks do not show stand first, such as what an expedition lacks to pay. */
  warnings: Warning[];
  /** The «В этом ходу» block of the turn. */
  turnActs: ReactNode;
  onNote: (note: string) => void;
  /** The component the action plays; none takes it off. */
  onComponent: (id: string | undefined) => void;
  onDone: () => void;
  onRemove: () => void;
}

/** A component action or a pass as a turn: the component the action plays and its note, then the acts the turn holds. */
export function TurnEditor({ entry, game, pack, board, warnings, turnActs, onNote, onComponent, onDone, onRemove }: TurnEditorProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  // What the owner holds ready just before the entry stands first in the choice; the rest can be played too, and the plan warns.
  const ready = useMemo(() => (board ? readyToPlay(pack, playerState(board, entry.owner).holdings, game.faction) : undefined), [board, pack, entry.owner, game.faction]);
  const played = entry.type === 'component' && entry.componentId ? componentById(pack, entry.componentId) : undefined;
  const placer = placeWarnings(warnings);
  // The acts block shows its own; the rest stands first, where it cannot be missed.
  placer.at('deal');
  placer.at('slice');
  // What the component itself breaks stands with the component, under the rest.
  const ofComponent = placer.at('component');
  return (
    <EditorFrame title={t(`plan.menu.${entry.type}`)} removeLabel={t('editor.remove')} onRemove={onRemove} onDone={onDone}>
      <WarningList warnings={placer.rest()} game={game} pack={pack} />
      {entry.type === 'component' && (
        <>
          <Section
            label={t('components.played')} title={t('components.played')} warnings={<WarningList warnings={ofComponent} game={game} pack={pack} />}
            action={<div className="side-actions"><button type="button" onClick={() => setPicking(true)}>{t('components.pickPlayed')}</button></div>}
          >
            {played && <ComponentCard def={played} pack={pack} held onRemove={() => onComponent(undefined)} />}
          </Section>
          <StepHints pack={pack} board={board} step="component" players={[entry.owner ?? 'me']} />
          <NoteField label={t('plan.entries.note')} value={entry.note} onCommit={onNote} />
        </>
      )}
      {turnActs}
      {picking && (
        <ComponentPicker
          kinds={PLAYED_KINDS} player={entry.owner ?? 'me'} owned={ready} prefer="owned" onClose={() => setPicking(false)}
          onPick={id => { onComponent(id); setPicking(false); }}
        />
      )}
    </EditorFrame>
  );
}
