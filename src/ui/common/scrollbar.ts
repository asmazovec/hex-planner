/**
 * The width of a thin scrollbar on this device, as `--scrollbar` on the root: about 10px with classic scrollbars,
 * 0 on a tablet, whose scrollbars float over the content. Scrolling columns reserve that much at their right edge
 * and take it off their right padding, so the bar sits at the screen's edge and the content keeps even margins.
 */
export function measureScrollbar(doc: Document = document): number {
  const probe = doc.createElement('div');
  probe.style.cssText = 'position:absolute;top:-9999px;width:100px;height:100px;overflow-y:scroll;scrollbar-width:thin;visibility:hidden';
  doc.body.appendChild(probe);
  const width = Math.max(0, probe.offsetWidth - probe.clientWidth);
  probe.remove();
  doc.documentElement.style.setProperty('--scrollbar', `${width}px`);
  return width;
}
