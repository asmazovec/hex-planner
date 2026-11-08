import { flights, motion } from './preferences';

const systemReduces = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** The system's setting, or smooth motion turned off in the app: everything that plays motion on screen asks here. */
export const reducedMotion = (): boolean => !motion.applied() || systemReduces();
/** Without motion, or where the browser cannot say, things go straight to their end. */
export const animates = (): boolean => typeof window.matchMedia === 'function' && !reducedMotion();
/** Ships fly over the map unless flights are turned off in the app or the system reduces motion. */
export const playsFlights = (): boolean => flights.applied() && !systemReduces();
