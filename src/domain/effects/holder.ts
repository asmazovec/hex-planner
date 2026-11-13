/**
 * On whose action a component speaks: the one place that rule lives. An ability declares `holder`: `self`, the holder's
 * own action (and a battle or invasion it stands in); `others`, the action of another player ("After another player
 * activates a system: ..."); `anyone`, every action. A component file never compares ids to find out if an entry is its
 * own. A file that declares nothing is read from what the card prints (`defaultHolder`).
 */
import type { ComponentDef } from '../types';

export type HolderRule = 'self' | 'others' | 'anyone';

/** The trigger a card opens with, before its first colon or sentence: it names another player's action. */
const OTHERS = /^(?:(?:once|up to \d+ times?) per [a-z ]+, )?(?:after|when|before|at the (?:start|end) of)\s+(?:another player|a player other than you)\b/i;

/** What the card prints about when it speaks: the window of an action card, else the first clause of its text. */
function triggerOf(component: Pick<ComponentDef, 'text' | 'detail'>): string {
  const window = component.detail?.window;
  if (typeof window === 'string' && window !== '') return window;
  return component.text.split(/\n/)[0].split(/[:.]/)[0];
}

/** What a card that declares no `holder` is read as: `others` when its trigger is another player's action, else `self`. */
export const defaultHolder = (component: Pick<ComponentDef, 'text' | 'detail'>): HolderRule => (OTHERS.test(triggerOf(component).trim()) ? 'others' : 'self');

/**
 * Whether a holder's reminder shows in an action: `holderIsActor` says whose action it is, `concerned` that the holder
 * stands in the step of it (a battle, an invasion) and so counts as taking part.
 */
export function speaksIn(rule: HolderRule, holderIsActor: boolean, concerned: boolean): boolean {
  if (rule === 'anyone') return true;
  return rule === 'self' ? holderIsActor || concerned : !holderIsActor;
}
