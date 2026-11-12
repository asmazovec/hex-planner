/**
 * Berekar Berekon (Winnu, agent): "When 1 or more of a player's units use PRODUCTION: You may exhaust this card to
 * reduce the combined cost of the produced units by 2."
 *
 * Decided: `play` with a waiver. The agent is named in `uses` of the entry that produces (the replay exhausts it); the
 * `shortResources` warning of that production is lifted when the shortfall is 2 or less. A `play` effect cannot change
 * a number of the count, so the reduction is a waiver narrowed to what 2 resources cover. Ruling (Winnu, Berekar
 * Berekon 1): production limits still apply.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:winnuagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
