/**
 * Dimensional Tear II (Vuil'raith Cabal, space dock upgrade): "PRODUCTION 7. This system is a gravity rift; your ships
 * do not roll for this gravity rift. Place a dimensional tear token beneath this unit as a reminder. Up to 12 fighters
 * in this system do not count against your ships' capacity."
 *
 * Decided: `modify` at three points: the dock's Production is 7, whatever its planet's resources (the generated Space
 * Dock II would give resources + 4); its system keeps 12 fighters apart from capacity instead of 3; and its system is a
 * gravity rift for the Cabal's moves (+1 out of or through it, Vuil'raith, Dimensional Tear note 2). Pass 1: the
 * generated upgrade only.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:dt2';

export const effect: ComponentEffect = { tier: 'passive', rule: '97.4' };
