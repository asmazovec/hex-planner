import { test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';

uiBench();

// The interface of a played card with what the player chooses for it does not exist yet; pass 2 builds it with the
// effect (see the report of batch 21) and turns this into a real test over `bench` with the same comment template.
test.todo('actionCard:jamming the component editor offers the system and the other player of the card, and the token appears on the map in that player\'s colour: no control for a played component\'s choices (`choices`) and no helper to render the component editor in src/ui/testing/effects.tsx');
