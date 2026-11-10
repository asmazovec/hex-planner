import { useCallback, useState } from 'react';

export type DrawerName = 'players' | 'legend' | 'components' | 'te';
type LeftDrawer = 'players' | 'legend';
type RightDrawer = 'components' | 'te';

const isLeft = (name: DrawerName): name is LeftDrawer => name === 'players' || name === 'legend';

/**
 * The drawers beside the map, one at a time. Each side keeps what it held last, so a drawer slides away with its content.
 * The Thunder's Edge drawer stands aside while the map chooses for it (`teAside`) and comes back after.
 */
export function useDrawers(hasTe: boolean, teAside: boolean) {
  const [open, setOpen] = useState<DrawerName | null>(null);
  const [left, setLeft] = useState<LeftDrawer>('players');
  const [right, setRight] = useState<RightDrawer>('components');

  const toggle = useCallback((name: DrawerName) => {
    setOpen(current => (current === name ? null : name));
    if (isLeft(name)) setLeft(name);
    else setRight(name);
  }, []);
  const close = useCallback(() => setOpen(null), []);
  const closeTe = useCallback(() => setOpen(current => (current === 'te' ? null : current)), []);
  /** The map is about to be asked for a system: a right drawer would cover it and its hint. */
  const closeRight = useCallback(() => setOpen(current => (current !== null && !isLeft(current) ? null : current)), []);

  const teOpen = hasTe && open === 'te' && !teAside;
  return {
    open, left, right, toggle, close, closeTe, closeRight,
    leftOpen: open !== null && isLeft(open),
    rightOpen: open === 'components' || teOpen,
  };
}
