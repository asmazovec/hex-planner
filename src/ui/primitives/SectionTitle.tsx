import type { ReactNode } from 'react';

export interface SectionTitleProps {
  /** The heading level where the title stands in the page's outline; a paragraph or a div where it is no heading. */
  as?: 'h3' | 'h4' | 'h5' | 'p' | 'div';
  /** The place's own spacing, e.g. `phase-title` or `picker-title`. */
  className?: string;
  id?: string;
  children: ReactNode;
}

/** The heading of a section: a line, the title in the middle of the field, the line again. */
export function SectionTitle({ as: Tag = 'h3', className, id, children }: SectionTitleProps) {
  return <Tag className={`section-title${className ? ` ${className}` : ''}`} id={id}>{children}</Tag>;
}
