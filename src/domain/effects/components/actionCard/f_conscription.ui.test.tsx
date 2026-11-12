import { test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';

uiBench();

// The interface of a played card with what the player chooses for it does not exist yet; pass 2 builds it with the
// effect (see the report of batch 21) and turns this into a real test over `bench` with the same comment template.
test.todo('actionCard:f_conscription the component action of the card places the fighters at once; the result shows one fighter per system: no helper to render the component editor (TurnEditor) over the bench in src/ui/testing/effects.tsx');
