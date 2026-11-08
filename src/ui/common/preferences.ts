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
  /** What the root element says now; the stored choice before anything was put there. */
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
    applied: () => {
      const shown = rootAttr ? document.documentElement.dataset[rootAttr] : undefined;
      return shown === undefined ? read() : shown === 'on';
    },
  };
}

/** Whether windows that take over the screen blur what is behind them. On unless turned off. */
export const blur = preference('ti4.blur', true, 'blur');

/** Whether a tactical action flies its ships over the map. On unless turned off. */
export const flights = preference('ti4.flights', true, 'flights');

/** Whether a flight keeps repeating while its details are open. On unless turned off: then it plays once. */
export const flightLoop = preference('ti4.flightLoop', true);

/** Whether the screen moves smoothly: drawers, things appearing, the camera of the map. On unless turned off. */
export const motion = preference('ti4.motion', true, 'motion');

/** What costs the battery, each turned off on its own, in the order the settings show them. */
export const ENERGY_ITEMS: readonly Preference[] = [flights, flightLoop, motion, blur];

/**
 * Maximum saving: while it is on, every item is off and locked, and each keeps its own choice for when it is turned
 * off again. It keeps the key of the single switch of earlier versions, which meant the same.
 */
export const maxSaving = preference('ti4.energy', false);

/** What an item does now: its own choice, unless maximum saving overrides it. */
export const effective = (item: Preference): boolean => item.read() && !maxSaving.read();

/** Puts on the root element what every item does now, for the stylesheet and the code to read. */
export function applyAll(): void {
  for (const item of ENERGY_ITEMS) item.apply(effective(item));
}

/** Stores the choice of an item or of maximum saving, and puts what follows on the root element. */
export function choose(setting: Preference, on: boolean): void {
  setting.write(on);
  applyAll();
}

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
