/**
 * Dannel of the Tenth (Yin, hero): "ACTION: Commit up to 3 infantry from your reinforcements to any non-home
 * planets and resolve ground combats on those planets. Players cannot use SPACE CANNON against these units. Then,
 * purge this card."
 *
 * Decided: a `play`. The infantry stand on the planets of the choices straight from the reinforcements, with no
 * activation and no landing from a ship, so nothing of the landing is checked for them (Yin notes, Quantum
 * Dissemination 4.1 and 6). Where nobody else stands, the Yin take control of the planet (`takeControl`); where
 * somebody does, the ground combat is not simulated and control stays as the player enters it. A home planet gets
 * nothing: the card names non-home planets only.
 *
 * The choices: `planet`, `planet2`, `planet3` (one infantry each, the same planet twice gives two), or, written by
 * hand, a planet id with its number (`{ t1: 2, t2: 1 }`). More than three is not forbidden. The purge is the leader's
 * own rule (51.12).
 */
import { planetsOf, systemSlots } from '../../../replay/board';
import { takeControl } from '../../../replay/invasion';
import { add } from '../../../replay/state';
import { inHomeSystem, othersOnPlanet } from '../../../stacks';
import type { ChoiceSpec, ComponentEffect } from '../../types';

export const id = 'leader:yinhero';

const SLOTS = ['planet', 'planet2', 'planet3'];
const label = (n: number) => ({ ru: `Планета ${n}`, en: `Planet ${n}` });

/** One spec for each infantry: a non-home planet of the map. */
const slot = (key: string, n: number, after?: string): ChoiceSpec => ({
  key, kind: 'planet', label: label(n),
  options: ({ game, pack }) => [...new Set(systemSlots(game).flatMap(s => planetsOf(game, s, pack)))].filter(planetId => !inHomeSystem(game, planetId, pack)),
  when: after === undefined ? undefined : chosen => chosen[after] !== undefined,
});

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [slot('planet', 1), slot('planet2', 2, 'planet'), slot('planet3', 3, 'planet2')],
  play: ({ game, state, player, pack, choices, held }) => {
    if (!held) return;
    const committed: Record<string, number> = {};
    for (const [key, value] of Object.entries(choices)) {
      if (SLOTS.includes(key)) committed[String(value)] = (committed[String(value)] ?? 0) + 1;
      else if (pack.planets[key] !== undefined) committed[key] = (committed[key] ?? 0) + Number(value);
    }
    for (const [planetId, count] of Object.entries(committed)) {
      if (pack.planets[planetId] === undefined || count <= 0 || inHomeSystem(game, planetId, pack)) continue;
      add(state.ground, planetId, { infantry: count });
      // Taken only where nobody else stands: the outcome of a ground combat is entered by the player.
      const defended = state.control[planetId] === 'enemy'
        || othersOnPlanet(game, state, planetId).some(other => other.owner !== player);
      if (!defended) takeControl(game, state, planetId, pack);
    }
  },
};
