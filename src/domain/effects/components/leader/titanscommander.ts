/**
 * Tungstantus (Titans of Ul, commander): "When 1 or more of your units use PRODUCTION: You may gain 1 trade good."
 *
 * Decided: `play`, named in `uses` of the entry whose production triggers it: the entry gains 1 trade good. A trade
 * good is gained only if at least one unit is produced (Titans of Ul, Tungstantus note 1.2), and a commander is not
 * exhausted by its use. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:titanscommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
