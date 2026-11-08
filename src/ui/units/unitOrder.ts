import type { UnitId } from '../../domain/types';

// TODO(P2-470) #ws:ui-logic-to-domain #type:dup #size:s #duplicate-of-domain — порядок юнитов повторяет ORDER из domain/hexLayout.ts: экспортировать из домена и брать оттуда
export const UNIT_ORDER: UnitId[] = [
  'flagship', 'warsun', 'dreadnought', 'carrier', 'cruiser', 'destroyer', 'fighter', 'infantry', 'mech',
];
