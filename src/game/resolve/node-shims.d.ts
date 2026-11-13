/** The few Node modules the oracle (a test fixture reader and its recorder) uses; the app has no Node types. */
declare module 'node:fs' {
  export function readFileSync(path: string): { toString(encoding: string): string };
  export function writeFileSync(path: string, data: unknown, options?: { flag: string }): void;
  export function mkdirSync(path: string, options?: { recursive: boolean }): void;
}
declare module 'node:zlib' {
  export function gzipSync(data: string): unknown;
  export function gunzipSync(data: unknown): { toString(encoding: string): string };
}
declare module 'node:crypto' {
  export function createHash(kind: string): { update(data: string): { digest(encoding: string): string } };
}
declare const process: { env: Record<string, string | undefined> };
