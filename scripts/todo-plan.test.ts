import { describe, expect, test } from 'vitest';
import { parseTodo, uncovered, validate, waves } from './todo-plan';

describe('todo-plan', () => {
  test('reads the id, the known tags, free tags and the text, in any comment syntax', () => {
    const t = parseTodo('  {/* TODO(P2-017) #ws:transport #type:check #rule:95.3 #rule:95.1 #test:095-transport #size:s #pickup — no token check */}', 'src/ui/x.tsx', 4)!;
    expect(t).toMatchObject({ id: 'P2-017', num: 17, ws: 'transport', type: 'check', rules: ['95.3', '95.1'], tests: ['095-transport'],
      size: 's', tags: ['pickup'], text: 'no token check', layer: 'ui', line: 4 });
    expect(parseTodo('<!-- TODO(P2-900) #ws:docs #type:doc fix the rift line -->', 'CLAUDE.md', 1)!.text).toBe('fix the rift line');
    expect(parseTodo('// nothing here', 'a.ts', 1)).toBeNull();
  });

  test('flags duplicate ids, unknown workstreams and types, and dangling deps', () => {
    const a = parseTodo('// TODO(P2-001) #ws:transport #type:bug x', 'src/domain/a.ts', 1)!;
    const b = parseTodo('// TODO(P2-001) #ws:nowhere #type:odd #dep:X-1 y', 'src/domain/b.ts', 2)!;
    const errors = validate([a, b]).join('\n');
    expect(errors).toMatch(/already used/);
    expect(errors).toMatch(/unknown or missing #ws "nowhere"/);
    expect(errors).toMatch(/unknown or missing #type "odd"/);
    expect(errors).toMatch(/X-1 is not a TODO id/);
  });

  test('a #dep on a TODO no longer in the code is a dependency already done, not an error', () => {
    const t = parseTodo('// TODO(P2-003) #ws:transport #type:bug #dep:P2-001 x', 'src/domain/a.ts', 1)!;
    expect(validate([t])).toEqual([]);
  });

  test('a workstream comes one wave after the latest it builds on', () => {
    const w = waves([
      { id: 'a', title: '', goal: '', after: [], owns: [] },
      { id: 'b', title: '', goal: '', after: ['a'], owns: [] },
      { id: 'c', title: '', goal: '', after: ['a', 'b'], owns: [] },
    ]);
    expect([w.get('a'), w.get('b'), w.get('c')]).toEqual([0, 1, 2]);
  });

  test('a failing test is covered by a TODO naming its file and its rule', () => {
    const t = parseTodo('// TODO(P2-002) #ws:transport #type:check #rule:95.3 #test:095-transport x', 'src/domain/a.ts', 1)!;
    const failing = [{ file: '095-transport', title: '95.3: picks up' }, { file: '095-transport', title: '95.1: off route' }];
    expect(uncovered([t], failing)).toEqual([{ file: '095-transport', title: '95.1: off route' }]);
  });
});
