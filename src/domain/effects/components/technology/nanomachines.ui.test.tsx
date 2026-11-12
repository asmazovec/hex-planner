import { test } from 'vitest';
import { uiBench } from '../../../../ui/testing/effects';

uiBench();

// "ACTION: Exhaust this card to place 1 PDS on a planet you control."
// Checks (pass 2): in the editor of the component action that plays Nanomachines I choose a planet I control for the
// PDS; it is written into `choices.pds`, the PDS stands on the planet, and a planet I do not control shows
// `structureNotControlled` standing.
// Why it is not written yet: the editor of a component action (TurnEditor) has no field for `choices`, and the bench
// of the interface (src/ui/testing/effects.tsx) cannot show it: both are shared files of pass 2.
test.todo('technology:nanomachines the PDS is placed on a planet chosen in the editor of the component action: TurnEditor has no choice of a planet yet');
