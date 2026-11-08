import { energy } from './preferences';

/** The system's setting, or the app's energy saving: everything that plays motion asks here. */
export const reducedMotion = () => energy.applied() || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
/** Without motion, or where the browser cannot say, things go straight to their end. */
export const animates = (): boolean => typeof window.matchMedia === 'function' && !reducedMotion();
