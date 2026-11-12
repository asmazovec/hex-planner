import { defineCode } from '../codeDef';

/** More units placed than a component allows. Made by its play; params `count` and `limit`. */
export default defineCode('placementOverLimit', {
  rules: ['22.1'],
  step: 'component',
  text: {
    ru: 'Размещено {{count}}, а компонент позволяет не больше {{limit}}.',
    en: 'The component places {{count}} and allows at most {{limit}}.',
  },
});
