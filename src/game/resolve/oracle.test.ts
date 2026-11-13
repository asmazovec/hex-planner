/**
 * The kernel against the frozen oracle (see oracle.ts): the whole corpus of games the tests built, every plan in "now"
 * and in "forecast", must give after every entry the same board for every player and the same warnings as recorded
 * when the old replay agreed with the kernel. The recorded result is the old replay's, but for the few entries that
 * carry a documented exclusion (flag 0), where it is the kernel's, frozen.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { marksOf, packOf, type Fixture } from './oracle';

const fixture = JSON.parse(gunzipSync(readFileSync('src/game/resolve/__oracle__/corpus.json.gz')).toString('utf8')) as Fixture;

describe('the frozen oracle', () => {
  test('the corpus is whole', () => {
    expect(fixture.cases.length).toBeGreaterThan(1000);
    const marks = fixture.cases.flatMap(c => c.runs.flatMap(r => r.marks));
    expect(marks.length).toBeGreaterThan(5000);
    // The old replay agreed on nearly all of it; the rest carries a documented exclusion.
    expect(marks.filter(m => m[3] === 1).length / marks.length).toBeGreaterThan(0.95);
  });

  test('every entry of every plan resolves as recorded', () => {
    const bad: string[] = [];
    fixture.cases.forEach((item, index) => {
      const pack = packOf({ packExpansions: item.packExpansions, packDelta: fixture.packs[item.pack] });
      for (const run of item.runs) {
        const plan = item.game.plans.find(p => p.id === run.plan)!;
        let now: ReturnType<typeof marksOf>;
        try { now = marksOf(item.game, pack, plan, run.filter); } catch (error) { bad.push(`case ${index} ${run.filter}: ${String(error)}`); continue; }
        run.marks.forEach((mark, i) => {
          const got = now[i];
          if (!got || got[0] !== mark[0] || got[1] !== mark[1] || got[2] !== mark[2]) bad.push(`case ${index} ${plan.name}/${run.filter} entry ${mark[0]} (${i}): ${got ? (got[1] !== mark[1] ? 'board' : 'warnings') : 'missing'}`);
        });
        if (now.length !== run.marks.length) bad.push(`case ${index} ${run.filter}: ${now.length} entries, recorded ${run.marks.length}`);
      }
    });
    expect(bad.slice(0, 15)).toEqual([]);
  });
});
