import { useState } from 'react';
import type { Preference } from './preferences';

/** A setting as a switch: what it is now, and a change that is stored and shown at once. */
export function usePreference(preference: Preference): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(preference.read);
  const change = (next: boolean) => {
    preference.write(next);
    setOn(next);
  };
  return [on, change];
}
