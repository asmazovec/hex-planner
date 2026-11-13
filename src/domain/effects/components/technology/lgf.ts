/**
 * Lazax Gate Folding (Winnu, technology): "During your tactical actions, if you do not control Mecatol Rex, treat its
 * system as if it has both an alpha and beta wormhole. ACTION: If you control Mecatol Rex, exhaust this card to place
 * 1 infantry from your reinforcements on Mecatol Rex."
 *
 * Decided: a mix. The wormholes change adjacency (40, 101): the route graph of the player's tactical actions joins the
 * Mecatol Rex system to every alpha and beta wormhole while Mecatol Rex is not theirs; this reaches the highlight of
 * where ships can fly (`routeReach`), not a warning, as a jump between marked systems is never warned of. The ACTION is
 * a `play`: one infantry on Mecatol Rex when the player controls it (the replay exhausts the card).
 */
import { componentById } from '../../../components';
import { MECATOL_PLANET } from '../../../mecatol';
import { planetsOf } from '../../../replay/board';
import { wormholeSlots } from '../../../movement';
import { violation } from '../../../rules/registry';
import componentCondition from '../../../rules/codes/componentCondition';
import { mecatolSlot } from '../../helpers/movement';
import type { DataPack, Game } from '../../../types';
import type { ComponentEffect } from '../../types';

/** The planet of the Mecatol Rex system on this map: `mr`, or `mrte` when Thunder's Edge replaced the tile. */
const mecatolPlanet = (game: Game, pack: DataPack, slot = mecatolSlot(game)): string => (slot === undefined ? MECATOL_PLANET : planetsOf(game, slot, pack)[0] ?? MECATOL_PLANET);

export const id = 'technology:lgf';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // Mecatol Rex joins every alpha and beta wormhole in the Winnu's tactical actions while they do not control it (40, 101).
  links: ({ game, pack, state, shared, during }) => {
    const mecatol = mecatolSlot(game);
    if (during !== 'tactical' || game.faction !== 'winnu' || mecatol === undefined || state?.control[mecatolPlanet(game, pack, mecatol)] === 'me') return [];
    const tokens = shared?.wormholeTokens ?? state?.wormholeTokens;
    return ['alpha', 'beta'].flatMap(type => wormholeSlots(game, pack, type, tokens).filter(slot => slot !== mecatol).map((slot): [string, string] => [mecatol, slot]));
  },
  play: ({ game, state, pack, warnings, held }) => {
    if (!held || game.faction !== 'winnu') return;
    const planet = mecatolPlanet(game, pack);
    if (state.control[planet] !== 'me') {
      warnings.push(violation(componentCondition.code, { id, name: componentById(pack, id)?.name ?? id, condition: 'Mecatol Rex' }));
      return;
    }
    const here = (state.ground[planet] ??= {});
    here.infantry = (here.infantry ?? 0) + 1;
  },
};
