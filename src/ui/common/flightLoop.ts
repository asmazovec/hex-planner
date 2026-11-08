// TODO(P2-449) #ws:ui-structure #type:dup #size:s #dep:P2-446 #preferences — та же настройка-флаг, что blur и energy: перейти на фабрику настроек
const STORAGE_KEY = 'ti4.flightLoop';

/** Whether a flight keeps repeating while its details are open. On unless turned off: then it plays once. */
export function flightLoopOn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setFlightLoop(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // storage unavailable: the flights keep their default
  }
}
