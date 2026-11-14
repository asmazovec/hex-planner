/**
 * The measures and rules of a board that screens and tests ask for, gathered in one place. A plan is replayed by the game kernel (src/game).
 */
export { isOnMap, sourceSlot, systemPlanets, systemsAdjacent, systemSlots, tileIdOf } from './board';
export { fleetSpeed, routeDistances, routeMove, routeSteps, shipSpeed } from '../movement';
export { readyToPlay } from './holdings';
export { statusTokensFree } from './status';
export { placesOf, productionCost, type ProductionPlace } from './production';
export { START_TOKENS } from './state';
export { dockFighterRoom, fightersFly, fleetLimit, pickupAllowed, systemMeters } from './transport';
export { isWaived, standing } from '../rules/registry';
export { inForce } from '../effects/registry';
