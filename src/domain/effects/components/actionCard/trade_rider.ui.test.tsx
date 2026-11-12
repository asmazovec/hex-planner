import { test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';

uiBench();

// The interface of a played card with what the player chooses for it does not exist yet; pass 2 builds it with the
// effect (see the report of batch 21) and turns this into a real test over `bench` with the same comment template.
test.todo('actionCard:trade_rider a component entry in the agenda phase offers a switch for a correct prediction; the trade goods appear in the totals: no control for `choices` and no non-turn component entry in the agenda phase');
