import type { ReactNode } from 'react';
import { SectionTitle } from './SectionTitle';

export interface EditorPartProps {
  /** The heading of the part, and its name as a group for the screen reader. */
  title: string;
  children?: ReactNode;
}

/**
 * A part of a turn's editor under the common heading of a section: the action's own setup first, then «В этом ходу»,
 * what any turn holds beside its action. The parts stand further apart than the blocks inside one.
 */
export function EditorPart({ title, children }: EditorPartProps) {
  return (
    <div className="editor-part panel-stack" role="group" aria-label={title}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}
