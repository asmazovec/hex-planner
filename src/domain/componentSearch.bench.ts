import { bench, describe } from 'vitest';
import { loadPack } from '../data/loadPack';
import { searchComponents } from './componentSearch';
import { componentsOf } from './components';

const pack = loadPack(['pok', 'te'], 'ru');
searchComponents(pack, 'a');

/** Every keystroke of a line is a search of its own. */
function typed(line: string): void {
  for (let n = 1; n <= line.length; n++) searchComponents(pack, line.slice(0, n));
}

describe(`the one search line over ${componentsOf(pack).length} components, Russian texts with their originals`, () => {
  bench('the index of a pack just loaded, with its first search', () => { searchComponents(loadPack(['pok', 'te'], 'ru'), 'a'); });
  bench('one word of a name', () => { searchComponents(pack, 'sabotage'); });
  bench('a kind and a faction: «агент хакан»', () => { searchComponents(pack, 'агент хакан'); });
  bench('three words of a Russian text with typos', () => { searchComponents(pack, 'передвигатся через астеройды'); });
  bench('«красная технология jol» typed letter by letter, 22 searches', () => { typed('красная технология jol'); });
});
