import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { COMPONENT_GROUPS, type ComponentGroup } from '../../domain/holdings';
import { DrawerTab } from '../overlays/Drawer';

export interface ComponentTabsProps {
  /** The components drawer is open: the stack stands fanned out, a tab per group. */
  open: boolean;
  /** The group the drawer shows, or will show when the stack is pressed. */
  group: ComponentGroup;
  /** What the shown player holds in each group. */
  counts: Record<ComponentGroup, number>;
  /** What I hold in all: the number on the folded stack. */
  total: number;
  /** A press on the folded stack. */
  onOpen: () => void;
  /** A press on a tab of the fan. */
  onGroup: (group: ComponentGroup) => void;
}

const counted = (name: string, count: number): string => (count > 0 ? `${name} · ${count}` : name);

/**
 * The tabs of the components drawer. Folded, they lie as a stack: one tab over the shades of the others. A press fans
 * them out, a tab per group. The group that opens stands first, where the stack was, so a second press at the same
 * point folds the fan again; the rest follow in their usual order, and no tab leaves its place while the fan is open.
 */
export function ComponentTabs({ open, group, counts, total, onOpen, onGroup }: ComponentTabsProps) {
  const { t } = useTranslation();
  const [first, setFirst] = useState(group);
  if (!open && first !== group) setFirst(group);
  const order = [first, ...COMPONENT_GROUPS.filter(other => other !== first)];
  return (
    <div className={`tab-fan${open ? ' tab-fan-open' : ''}`}>
      {order.map((name, slot) => (
        <DrawerTab
          key={slot} side="right" open={open && name === group} aside={!open && slot > 0} style={{ '--slot': slot } as CSSProperties}
          onClick={() => (open ? onGroup(name) : onOpen())}
        >
          {open || slot > 0 ? counted(t(`components.group.${name}`), counts[name]) : counted(t('components.title'), total)}
        </DrawerTab>
      ))}
    </div>
  );
}
