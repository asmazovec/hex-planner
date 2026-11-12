import { defineCode } from '../codeDef';

/**
 * A Creuss wormhole token put into a system that is neither one with a planet the player controls nor a non-home system
 * free of other players' ships (Creuss IFF, Wormhole Generator). No LRR point: the components' own text is the rule.
 * Made by their play; `systemId` is the system.
 */
export default defineCode('wormholeTokenPlace', {
  rules: ['promissory:iff', 'technology:wg'],
  step: 'component',
  text: {
    ru: 'Жетон червоточины Creuss можно поместить только в систему с вашей планетой или в не домашнюю систему без кораблей других игроков, а в {{system}} это не так.',
    en: 'A Creuss wormhole token goes only into a system with a planet you control, or into a non-home system with no other players\' ships, and {{system}} is neither.',
  },
});
