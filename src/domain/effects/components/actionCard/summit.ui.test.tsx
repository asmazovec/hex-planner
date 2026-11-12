import { test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';

uiBench();

// The interface of a played card with what the player chooses for it does not exist yet; pass 2 builds it with the
// effect (see the report of batch 21) and turns this into a real test over `bench` with the same comment template.
test.todo('actionCard:summit a component entry at the start of the strategy phase offers the pools for the two tokens (TokenTiles): no control for `choices` and no non-turn component entry in the strategy phase');
