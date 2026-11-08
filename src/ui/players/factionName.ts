// TODO(P2-456) #ws:ui-structure #type:dup #size:s #names — два модуля имён игроков: этот и map/opponentName.ts (там номер index+2, в PlanScreen seat): один players/names.ts с полным и коротким именем
/** Where the rule below would pick the wrong word. */
const SHORT_NAMES: Record<string, string> = {
  bastion: 'Bastion', ralnel: 'Ral Nel', titans: 'Titans', keleresm: 'Keleres', keleresx: 'Keleres', keleresa: 'Keleres',
};

/** A name that fits beside a token: what follows "of", or else the first word after "The". */
export function factionShortName(id: string, name: string): string {
  if (SHORT_NAMES[id]) return SHORT_NAMES[id];
  const plain = name.replace(/^The /, '');
  return plain.split(' of ')[1] ?? plain.split(' ')[0];
}
