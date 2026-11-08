/** Reads a stored value; null when there is none or storage is unavailable. */
function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable: the choice applies for this session only
  }
}

/** A setting that is on or off, kept in `localStorage` as `on` or `off`. */
export interface Preference {
  /** The stored choice, or the default when there is none or storage is unavailable. */
  read(): boolean;
  /** Stores the choice and puts it on the root element. */
  write(on: boolean): void;
  /** Puts the choice on the root element, for the stylesheet and the code to read; nothing for a setting without one. */
  apply(on?: boolean): void;
  /** What the root element says now. */
  applied(): boolean;
}

/** One setting: its key, its default, and the `data-` attribute of the root element that carries it, if any. */
export function preference(key: string, fallback: boolean, rootAttr?: string): Preference {
  const read = (): boolean => {
    const value = readStored(key);
    return value === 'on' ? true : value === 'off' ? false : fallback;
  };
  const apply = (on: boolean = read()): void => {
    if (rootAttr) document.documentElement.dataset[rootAttr] = on ? 'on' : 'off';
  };
  return {
    read,
    apply,
    write(on) {
      writeStored(key, on ? 'on' : 'off');
      apply(on);
    },
    applied: () => (rootAttr ? document.documentElement.dataset[rootAttr] === 'on' : read()),
  };
}

/** Whether windows that take over the screen blur what is behind them. On unless turned off. */
export const blur = preference('ti4.blur', true, 'blur');

/** Whether the app saves the battery: no flights, no smooth motion, no blur. Off unless turned on. */
export const energy = preference('ti4.energy', false, 'energy');

/** Whether a flight keeps repeating while its details are open. On unless turned off: then it plays once. */
export const flightLoop = preference('ti4.flightLoop', true);

export const LAST_EXPORT_KEY = 'ti4.lastExportAt';

/** When the last file copy was made, so the export reminder can stay quiet for a while. */
export const lastExport = {
  read(): number | null {
    const value = Number(readStored(LAST_EXPORT_KEY));
    return value > 0 ? value : null;
  },
  write(at: number): void {
    writeStored(LAST_EXPORT_KEY, String(at));
  },
};
