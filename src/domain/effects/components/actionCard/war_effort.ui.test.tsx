import { test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';

uiBench();

// The interface of a played card with what the player chooses for it does not exist yet; pass 2 builds it with the
// effect (see the report of batch 21) and turns this into a real test over `bench` with the same comment template.
test.todo('actionCard:war_effort the component editor offers a system with my ships (MapPickButton); the cruiser appears there, and the fleet pool warning stands beyond the pool: no control for `choices` and no helper to render the component editor');
