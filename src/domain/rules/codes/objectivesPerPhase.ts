import { defineCode } from '../codeDef';

/** More than one public or more than one secret objective in one status phase (LRR 61.6, 81.1); `kind` is public or secret. */
export default defineCode('objectivesPerPhase', {
  rules: ['61.6', '81.1'],
  step: 'status',
  text: {
    ru: 'За фазу статуса можно выполнить не больше одной цели каждого вида, а здесь {{count}} ({{kind}}).',
    en: 'At most one objective of each kind can be scored in a status phase, and here are {{count}} ({{kind}}).',
  },
});
