import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { DataPack, Entry, Game, Warning } from '../../../domain/types';
import { placeWarnings } from '../../feedback/warningPlaces';
import { WarningList } from '../../feedback/WarningText';
import { EditorFrame } from '../../primitives/EditorFrame';
import { NoteField } from '../../primitives/NoteField';

export interface TurnEditorProps {
  entry: Extract<Entry, { type: 'component' | 'pass' }>;
  game: Game;
  pack: DataPack;
  /** The turn's warnings: those its blocks do not show stand first, such as what an expedition lacks to pay. */
  warnings: Warning[];
  /** The «В этом ходу» block of the turn. */
  turnActs: ReactNode;
  onNote: (note: string) => void;
  onDone: () => void;
  onRemove: () => void;
}

/** A component action or a pass as a turn: the note of the component action, then the acts the turn holds. */
export function TurnEditor({ entry, game, pack, warnings, turnActs, onNote, onDone, onRemove }: TurnEditorProps) {
  const { t } = useTranslation();
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
          <WarningList warnings={ofComponent} game={game} pack={pack} />
          <NoteField label={t('plan.entries.note')} value={entry.note} onCommit={onNote} />
        </>
      )}
      {turnActs}
    </EditorFrame>
  );
}
