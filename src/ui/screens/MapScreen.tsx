import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { project } from '../../domain/project';
import { useGame } from '../../state/gameStore';
import { HexMap } from '../map/HexMap';
import { TileSheet } from '../map/TileSheet';

/** Read-only map for now: a tap on a tile opens its details. */
export function MapScreen() {
  const { t } = useTranslation();
  const game = useGame(s => s.game);
  const [selected, setSelected] = useState<string | null>(null);
  const pack = useMemo(() => loadPack(game?.expansions ?? []), [game?.expansions]);
  const state = useMemo(() => {
    const plan = game?.plans.find(p => p.id === game.activePlanId);
    return game && plan ? project(game, plan, 'forecast', pack).state : null;
  }, [game, pack]);

  if (!game || !state) return <section className="screen"><p className="muted">{t('map.noGame')}</p></section>;

  return (
    <section className="map-screen">
      <HexMap game={game} state={state} pack={pack} selectedId={selected} onTileTap={setSelected} />
      {selected !== null && (
        <TileSheet slotKey={selected} pack={pack} game={game} state={state} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
