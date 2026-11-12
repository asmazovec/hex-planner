import { defineCode } from '../codeDef';

/**
 * Ships produced are placed in a system other than the active one. LRR 68.2: a player who produces ships by using
 * Production must place them in the active system. `systemId` is the active system, `to` the one they were placed in.
 */
export default defineCode('productionShipsAway', {
  rules: ['68.2'],
  step: 'production',
  text: {
    ru: 'Корабли, построенные с помощью производства, ставятся в активную систему {{systemId}}, а они поставлены в {{to}}.',
    en: 'Ships built with Production are placed in the active system {{systemId}}, and they are placed in {{to}}.',
  },
});
