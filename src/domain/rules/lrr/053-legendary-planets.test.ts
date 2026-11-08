/** LRR 53 Legendary Planets. Source: tirules2 rules-reference/legendary-planets.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { MECATOL_PLANET } from '../../mecatol';

describe('LRR 53 Legendary Planets', () => {
  test('53.1: a legendary planet is marked as such, with the name of its ability', () => {
    const pack = loadPack(['pok']);
    expect(pack.planets.hopesend?.legendary).toBe('Imperial Arms Vault');
    expect(pack.planets.primor?.legendary).toBe('The Atrament');
    expect(pack.planets.h1?.legendary).toBeUndefined();
  });

  test.todo('53.2: gaining a legendary planet puts its ability card in the play area — not modelled: ability cards are not tracked');
  test.todo('53.2.1: an ability card from the deck comes readied — not modelled: ability cards are not tracked');
  test.todo('53.2.2: an exhausted ability card taken over stays exhausted — not modelled: ability cards are not tracked');
  test.todo('53.3: the controller may use the ability on the card — not modelled: abilities are shown, not applied');
  test.todo('53.4: purging the planet card purges its ability card — not modelled: purging is not tracked');
  test.todo('53 note 1: Imperial Arms Vault may take a mech from the board when reinforcements are empty — not modelled: abilities are shown, not applied');
  test.todo('53 note 2: end-of-turn legendary abilities still resolve after "end your turn" — not modelled: no turn timing');
  test.todo('53 note 3: several legendary abilities may resolve at the end of one turn — not modelled: no turn timing');
  test.todo('53 note 4: the ability card exhausts and readies apart from its planet card — not modelled: ability cards are not tracked');
  test.todo('53 note 5: readying a planet does not ready its ability card — not modelled: ability cards are not tracked');
  test.todo('53 note 6: the ability card readies in the status phase — not modelled: ability cards are not tracked');

  test('53 note 7: Mecatol Rex is not a legendary planet', () => {
    expect(loadPack(['pok']).planets[MECATOL_PLANET]?.legendary).toBeUndefined();
  });

  test.todo('53 note 8: Malice\'s system is the wormhole nexus — not modelled: covered by the tile data, no rule to compute');
});
