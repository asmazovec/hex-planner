import { defineCode } from '../codeDef';

/** A unit replaced by one that costs more than the component allows (Letani Ospha). The component's own text is the rule. Made by its play. */
export default defineCode('replacementCost', {
  rules: ['leader:arborecagent'],
  step: 'component',
  text: {
    ru: 'Замена юнита стоит дороже, чем разрешает компонент.',
    en: 'The replacement costs more than the component allows.',
  },
});
