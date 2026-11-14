import { slotKeyOf } from './layouts';

/** Makes an id with a prefix; it only has to be unique within one user's local games. */
export type IdMaker = (prefix: string) => string;

let counter = 0;
/** The default maker, for callers that pass none: time, a random part and a counter, no browser or node API. */
export const timeIdMaker: IdMaker = prefix => {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${counter}`;
};

export function makeId(prefix: string, make: IdMaker = timeIdMaker): string {
  return make(prefix);
}

export { slotKeyOf };
