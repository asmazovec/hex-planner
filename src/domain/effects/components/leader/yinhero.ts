/**
 * Dannel of the Tenth (Yin, hero): "ACTION: Commit up to 3 infantry from your reinforcements to any non-home
 * planets and resolve ground combats on those planets. Players cannot use SPACE CANNON against these units. Then,
 * purge this card."
 *
 * Pass 2: a `play`: the component action puts up to three infantry from the reinforcements on the non-home planets
 * of its choices and, where nobody else stands, takes control of them. Today a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:yinhero';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
};
