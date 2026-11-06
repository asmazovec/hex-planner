import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Node 25 ships an experimental global localStorage that shadows jsdom's and is
// unusable without --localstorage-file. Replace it with a simple in-memory Storage.
if (typeof localStorage?.getItem !== 'function') {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
}

// Sprites are baked through a canvas, which jsdom lacks; without this function they stay on the vector art.
const withoutBlobUrls = () => { Object.assign(URL, { createObjectURL: undefined }); };
withoutBlobUrls();
afterEach(withoutBlobUrls);
