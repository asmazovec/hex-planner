import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { duplicateTiles } from '../../domain/mapBuilder';
import { project } from '../../domain/project';
import { useGame } from '../../state/gameStore';
import { HexMap } from '../map/HexMap';
import { TileNumberInput } from '../map/TileNumberInput';
import { TileSheet } from '../map/TileSheet';

/** The map: a tap on a hex opens the tile number input and the tile details. */
export function MapBuilderScreen() {
  const { t } = useTranslation();
  const game = useGame(s => s.game);
  const setTile = useGame(s => s.setTile);
  const [selected, setSelected] = useState<string | null>(null);
  const pack = useMemo(() => loadPack(game?.expansions ?? []), [game?.expansions]);
  const state = useMemo(() => {
    const plan = game?.plans.find(p => p.id === game.activePlanId);
    return game && plan ? project(game, plan, 'forecast', pack).state : null;
  }, [game, pack]);

  if (!game || !state) return <section className="screen"><p className="muted">{t('map.noGame')}</p></section>;

  const duplicates = duplicateTiles(game.map);

  return (
    <section className="map-screen">
      <div className="map-main">
        {duplicates.length > 0 && (
          <p role="status" className="banner banner-warning">{t('builder.duplicates', { list: duplicates.join(', ') })}</p>
        )}
        <HexMap game={game} state={state} pack={pack} selectedId={selected} onTileTap={setSelected} />
      </div>
      {selected !== null && (
        <div className="map-side">
          <TileNumberInput
            key={selected} pack={pack} value={game.map[selected]}
            onChange={value => setTile(selected, value)} onClose={() => setSelected(null)}
          />
          <TileSheet slotKey={selected} pack={pack} game={game} state={state} onClose={() => setSelected(null)} />
        </div>
      )}
    </section>
  );
}
