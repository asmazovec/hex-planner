/**
 * Judicial Abolishment (agenda): "Discard the elected law from play."
 *
 * A hint. The law discarded is entered as a spend of that law (`spends`), which already takes it out of play; the
 * agenda itself leaves nothing.
 *
 * Pass 1: written as the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:abolishment';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
