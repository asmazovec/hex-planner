/** The bodies of new entries, by the kind of action, and whose they are: the screen only asks for one. */

export type NewAction = 'tactical' | 'strategic' | 'component' | 'pass' | 'adjustment';

export const EMPTY_PAYMENT = { planets: [], tradeGoods: 0 };
