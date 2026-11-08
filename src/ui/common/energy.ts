// TODO(P2-447) #ws:ui-structure #type:dup #size:s #dep:P2-446 #preferences — копия blur.ts с другим ключом и умолчанием: перейти на фабрику настроек
const STORAGE_KEY = 'ti4.energy';

// TODO(P2-448) #ws:ui-structure #type:arch #size:s #preferences #motion — reducedMotion(), который читает эту настройку вместе с системной, живёт в map/usePanZoom и импортируется в plan/ и screens/: перенести в common/motion.ts
/** Whether the app saves the battery: no flights, no smooth motion, no blur. Off unless turned on. */
export function energyOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

/** The stylesheet and the code that plays motion read the setting from the root element. */
export function applyEnergy(on: boolean = energyOn()): void {
  document.documentElement.dataset.energy = on ? 'on' : 'off';
}

export function setEnergy(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // storage unavailable: the choice applies for this session only
  }
  applyEnergy(on);
}
