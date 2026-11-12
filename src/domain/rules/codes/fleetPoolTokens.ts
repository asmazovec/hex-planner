import { defineCode } from '../codeDef';

/**
 * More command tokens in the fleet pool than a game effect allows. LRR 37.1 gives the fleet pool no limit of tokens;
 * a law sets one (Fleet Regulations: no more than 4), the `fleetPoolMax` point of the count. Made after a step that
 * adds tokens to the fleet pool (the status phase, a card or a component); params `fleet` (tokens in the pool) and `limit`.
 */
export default defineCode('fleetPoolTokens', {
  rules: ['37.1'],
  step: 'status',
  text: {
    ru: 'В резерве флота {{fleet}} жетонов приказа, а действующий эффект допускает {{limit}}.',
    en: 'The fleet pool holds {{fleet}} command tokens and a game effect allows {{limit}}.',
  },
});
