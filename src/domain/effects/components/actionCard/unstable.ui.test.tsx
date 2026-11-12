import { test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';

uiBench();

// The interface of a played card with what the player chooses for it does not exist yet; pass 2 builds it with the
// effect (see the report of batch 21) and turns this into a real test over `bench` with the same comment template.
test.todo('actionCard:unstable the component editor offers the hazardous planets (PlanetBadge); the planet is shown exhausted and up to 3 infantry leave it: no control for `choices` and no helper to render the component editor');
