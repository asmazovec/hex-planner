import { defineCode } from '../codeDef';

/**
 * Ground forces committed from a planet, not from the space area of the active system. LRR 49.2: only ground forces
 * in the space area of the active system are committed. `planetId` is the planet landed on, `from` the planet they
 * leave, `unit` the first kind and `count` all the ground forces of the landing.
 */
export default defineCode('landingFromPlanet', {
  rules: ['49.2'],
  step: 'invasion',
  text: {
    ru: 'Наземные войска высаживаются из космоса активной системы, а с планеты {{from}} взято: {{unit}}.',
    en: 'Ground forces are committed from the space area of the active system, and {{unit}} comes from {{from}}.',
  },
});
