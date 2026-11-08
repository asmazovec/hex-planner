// TODO(P2-446) #ws:ui-structure #type:dup #size:s #preferences — blur, energy и flightLoop — три копии флага в localStorage с try/catch и записью на корень: одна фабрика preference(key, default, rootAttr?) в common/preferences.ts
const STORAGE_KEY = 'ti4.blur';

/** Whether windows that take over the screen blur what is behind them. On unless turned off. */
export function blurOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** The stylesheet reads the setting from the root element. */
export function applyBlur(on: boolean = blurOn()): void {
  document.documentElement.dataset.blur = on ? 'on' : 'off';
}

export function setBlur(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // storage unavailable: the choice applies for this session only
  }
  applyBlur(on);
}
