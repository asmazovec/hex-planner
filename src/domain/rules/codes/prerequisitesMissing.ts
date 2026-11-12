import { defineCode } from '../codeDef';

/**
 * A technology researched without its prerequisites. LRR 90.12: a player "must satisfy each of a technology's
 * prerequisites to research it", with one technology of the matching colour per symbol (90.8.1); unit upgrades have no
 * colour and satisfy none (90.12.2). Gaining ignores prerequisites (90.5). Params: `id`, `name` of the technology,
 * `missing` the number of symbols still unmet after every ignored one, `symbols` them by colour ("2 biotic").
 */
export default defineCode('prerequisitesMissing', {
  rules: ['90.12', '90.8.1', '90.12.2'],
  step: 'card',
  text: {
    ru: 'Не хватает требований технологии {{name}}: {{missing}} ({{symbols}}).',
    en: 'The prerequisites of {{name}} are not met: {{missing}} missing ({{symbols}}).',
  },
});
