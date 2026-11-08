/** The address of this page carrying a game's link query; `absolute` adds the origin, for a link to pass on. Without a query the address is clean. */
export function gameAddress(query: string, absolute = false): string {
  const page = `${absolute ? window.location.origin : ''}${window.location.pathname}`;
  return query ? `${page}?${query}` : page;
}
