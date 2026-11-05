/** Edge pairs of a hyperlane turned `steps` times by 60 degrees clockwise: every edge number moves up by `steps`. */
export function rotateLanes(lanes: [number, number][], steps: number): [number, number][] {
  return lanes
    .map(([a, b]) => [(a + steps) % 6, (b + steps) % 6].sort((x, y) => x - y) as [number, number])
    .sort((x, y) => x[0] - y[0] || x[1] - y[1]);
}
