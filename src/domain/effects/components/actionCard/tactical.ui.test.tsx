import { test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';

uiBench();

// The interface of a played card with what the player chooses for it does not exist yet; pass 2 builds it with the
// effect (see the report of batch 21) and turns this into a real test over `bench` with the same comment template.
test.todo('actionCard:tactical the component editor offers the system with my BOMBARDMENT unit; the planets of other players there are shown exhausted: no control for `choices` and no helper to render the component editor');
