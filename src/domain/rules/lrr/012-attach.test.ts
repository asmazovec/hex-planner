/** LRR 12 Attach. Source: tirules2 rules-reference/attach.md. The app does not model attachments. */
import { describe, expect, test } from 'vitest';
import { attachCard } from '../../replay/invasion';
import type { Warning } from '../../types';
import { codesOf, forecast, rulesGame, rulesPack, tactical, TARGET } from '../kit';

describe('LRR 12 Attach', () => {
  test.todo('12.1: an attached card goes partly under the planet card — not modelled: attachments are not');
  test.todo('12.2: the attachment stays with the planet when control changes — not modelled: attachments are not');
  test.todo('12.2.1: it keeps its exhausted or ready state — not modelled: attachments are not');
  test.todo('12.2.2: purging the planet card purges its attachments and their tokens — not modelled: attachments are not');
  test.todo('12.3: the matching token goes on the planet on the board — not modelled: attachments are not');
  test.todo('12 note 1: a planet can have any number of attachments — not modelled: attachments are not');
  test.todo('12 note 2: the custodians token is no attachment — not modelled: attachments are not');
});

describe('LRR 12.1 the target of an attachment (attachTarget)', () => {
  test('12.1: a card attached to a planet the player does not control is warned of, and still joins it', () => {
    const pack = rulesPack();
    const game = rulesGame({ game: { planetControl: { t1: 'me' } } });
    const state = forecast(game, pack).state;
    const warnings: Warning[] = [];
    attachCard(game, state, 't1', 'relic:nanoforge', pack, warnings);
    attachCard(game, state, 't2', 'relic:nanoforge', pack, warnings);
    expect(warnings.map(w => [w.code, w.params.planetId])).toEqual([['attachTarget', 't2']]);
    expect(state.attachments).toEqual({ t1: ['relic:nanoforge'], t2: ['relic:nanoforge'] });
  });
});

describe('LRR 12.1 and 35.8 a card attached that bars units (planetDemilitarized)', () => {
  const land = (infantry: number) => tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry } }] });
  const units = { [TARGET]: { carrier: 1, infantry: 3 } };
  test('35.8: after Demilitarized Zone is attached to a planet, a later landing on it is warned of, and the planet it was attached with is not', () => {
    const pack = rulesPack(undefined, ['pok']);
    const first = { ...land(2), uses: ['exploration:dmz'] };
    const again = land(1);
    const game = rulesGame({ units, expansions: ['pok'], rounds: [[first], [again]] });
    expect(codesOf(game, pack, first)).not.toContain('planetDemilitarized');
    expect(codesOf(game, pack, again)).toContain('planetDemilitarized');
  });
  test('without the card a landing is not warned of', () => {
    const pack = rulesPack(undefined, ['pok']);
    const again = land(1);
    expect(codesOf(rulesGame({ units, expansions: ['pok'], rounds: [[land(2)], [again]] }), pack, again)).not.toContain('planetDemilitarized');
  });
});
