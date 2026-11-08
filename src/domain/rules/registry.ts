/**
 * The rule registry: each warning code with the LRR rules it stands for (first the main one, numbered as in the rules
 * tests' names, spaces as dashes) and the step of the round or of the tactical action that checks it.
 * The replay creates every warning through `violation`, so a warning knows its rule, step and place.
 */
import type { RuleStep, ViolationPlace, Warning, WarningCode } from '../types';

export interface RuleEntry { rules: string[]; step: RuleStep }

/** Steps in the order the replay goes through them. */
export const STEPS: readonly RuleStep[] = [
  'round', 'card', 'activation', 'movement', 'transport', 'combat', 'invasion', 'production', 'payment', 'status', 'expedition',
];

export const RULES: Record<WarningCode, RuleEntry> = {
  sourceActivated: { rules: ['58.3.3'], step: 'movement' },
  routeBlocked: { rules: ['58.3.2', '9.2.1', '11.1'], step: 'movement' },
  speedShort: { rules: ['58.3.6', '41.1', '59.2'], step: 'movement' },
  unitsMissing: { rules: ['58.3', '78.6', '42.2'], step: 'movement' },
  fleetPool: { rules: ['37.1', '76.2', '81.5.1'], step: 'movement' },
  capacityGroup: { rules: ['16.1', '95-note-4'], step: 'transport' },
  capacitySystem: { rules: ['16.3', '78.10.1'], step: 'transport' },
  landingOverLimit: { rules: ['49.2'], step: 'invasion' },
  planetExhausted: { rules: ['34.4', '71.4'], step: 'payment' },
  shortTradeGoods: { rules: ['93.4'], step: 'payment' },
  shortResources: { rules: ['26.1', '75.1'], step: 'payment' },
  shortInfluence: { rules: ['47.2', '26.1'], step: 'payment' },
  shortStrategy: { rules: ['20.5'], step: 'card' },
  primaryRepeated: { rules: ['83.2', '34.5'], step: 'card' },
  tokensOver: { rules: ['81.5', '52.3', '99.2'], step: 'status' },
  poolNegative: { rules: ['20.4', '81.5'], step: 'card' },
  systemHasToken: { rules: ['5.2', '89.1'], step: 'activation' },
  constructionUnits: { rules: ['24.3'], step: 'card' },
  sliceTaken: { rules: ['expedition-5'], step: 'expedition' },
  // command-tokens, round-flow, payment
  noReinforcements: { rules: ['20.3', '20.3.1', '23.2'], step: 'status' },
  actionAfterPass: { rules: ['3.3'], step: 'round' },
  passBeforeStrategy: { rules: ['3.4', '3.4.1', '82.2', '82.2.1'], step: 'round' },
  actionOutsidePhase: { rules: ['40.2'], step: 'round' },
  planetNotControlled: { rules: ['34-note-2', '64-note-5'], step: 'payment' },
  readyNotControlled: { rules: ['71-note-3'], step: 'card' },
  // strategy-cards
  foreignPrimary: { rules: ['83.3', '82.1'], step: 'card' },
  ownSecondary: { rules: ['83.4', '82.1', '20.5'], step: 'card' },
  secondaryRepeated: { rules: ['83.7', '92.4.2'], step: 'card' },
  readyOverLimit: { rules: ['32.2', '32.3'], step: 'card' },
  diplomacySystem: { rules: ['32.2'], step: 'card' },
  researchOverLimit: { rules: ['91.2', '91.3'], step: 'card' },
  researchOwned: { rules: ['90.10'], step: 'card' },
  // combat-order, invasion, structures
  shipOnPlanet: { rules: ['76.1'], step: 'invasion' },
  landingOutsideSystem: { rules: ['49.2', '89.4'], step: 'invasion' },
  custodians: { rules: ['54.1', '27.2', '49-note-4'], step: 'invasion' },
  structureLimit: { rules: ['85.4', '24.2', '24.3', '24.4', '63.3', '79.3', '85.5', '85.6'], step: 'card' },
  structureNotControlled: { rules: ['24.2', '24.3'], step: 'card' },
  structureOutsideSystem: { rules: ['24.3'], step: 'card' },
  // production, thunders-edge
  noProduction: { rules: ['67-/-79', '79.4', '99.3'], step: 'production' },
  productionBlockaded: { rules: ['67.6'], step: 'production' },
  blockaded: { rules: ['14.1'], step: 'production' },
  productionOver: { rules: ['68.1', '79.1', '99.3'], step: 'production' },
  reinforcementsOut: { rules: ['67.5', '72.1', '96.3'], step: 'production' },
  productionPlace: { rules: ['68.3', '67.4.1'], step: 'production' },
  scarProduction: { rules: ['entropic-scars-2'], step: 'production' },
  expeditionUnpaid: { rules: ['expedition-4.5'], step: 'expedition' },
  expeditionTwicePerTurn: { rules: ['expedition-5'], step: 'expedition' },
  stationGround: { rules: ['space-stations-4'], step: 'invasion' },
  stationStructure: { rules: ['space-stations-4'], step: 'card' },
  // transport
  pickupOffRoute: { rules: ['95.1'], step: 'transport' },
};

/** The rule and step of a code, from the registry. */
export const ruleOf = (code: WarningCode): RuleEntry => RULES[code];

const text = (value: string | number | undefined): string | undefined => (typeof value === 'string' ? value : undefined);

/**
 * A warning made by the replay. Only `code` and `params` are own fields, so a violation still equals the plain
 * `{ code, params }` a test or the UI writes; rule, step and place are read through the registry and the entry.
 */
class Violation implements Warning {
  code: WarningCode;
  params: Record<string, string | number>;
  #step: RuleStep | undefined;
  #entryId = '';

  constructor(code: WarningCode, params: Record<string, string | number>, step?: RuleStep) {
    this.code = code;
    this.params = params;
    this.#step = step;
  }

  get rule(): string { return RULES[this.code].rules[0]; }

  get step(): RuleStep { return this.#step ?? RULES[this.code].step; }

  get place(): ViolationPlace {
    const source = text(this.params.from) ?? text(this.params.systemId);
    const planetId = text(this.params.planetId);
    return { entryId: this.#entryId, ...(source === undefined ? {} : { source }), ...(planetId === undefined ? {} : { planetId }) };
  }

  placeIn(entryId: string): void { this.#entryId = entryId; }
}

/** A violation of the rule behind `code`; `step` only when a shared check runs in another step than its registry one. */
export const violation = (code: WarningCode, params: Record<string, string | number>, step?: RuleStep): Warning =>
  new Violation(code, params, step);

/** Ties the violations of an entry to it. */
export function placeIn(warnings: Warning[], entryId: string): Warning[] {
  for (const warning of warnings) if (warning instanceof Violation) warning.placeIn(entryId);
  return warnings;
}
