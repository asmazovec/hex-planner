import { useTranslation } from 'react-i18next';
import type { TokenKind } from '../../../domain/hexLayout';
import type { PlanetDef } from '../../../domain/types';
import { SectionTitle } from '../../primitives/SectionTitle';
import { UnitTile } from '../../units/UnitTile';
import type { LossPicture } from './useStage';

interface LossStripProps {
  heading: string;
  colour: string;
  pictures: LossPicture[];
  planets: PlanetDef[];
  kindName: (kind: TokenKind) => string;
}

function LossStrip({ heading, colour, pictures, planets, kindName }: LossStripProps) {
  const { t } = useTranslation();
  /** The planet is named only where a type was lost on two of them. */
  const planetNameOf = (kind: TokenKind, planetId: string | null): string | undefined =>
    (new Set(pictures.filter(p => p.kind === kind).map(p => p.planetId)).size > 1 ? planets.find(p => p.id === planetId)?.name : undefined);
  return (
    <div role="group" aria-label={heading}>
      <SectionTitle>{heading}</SectionTitle>
      {pictures.length === 0 && <p className="muted">{t('stage.noLosses')}</p>}
      <div className="stage-losses">
        {pictures.map(({ key, kind, planetId, count, back }) => {
          const planet = planetNameOf(kind, planetId);
          return (
            <UnitTile
              key={key} variant="loss" kind={kind} colour={colour} count={count} caption={planet} onClick={back}
              label={planet ? t('stage.giveBackOn', { unit: kindName(kind), planet }) : t('stage.giveBack', { unit: kindName(kind) })}
            />
          );
        })}
      </div>
    </div>
  );
}

export interface BattlePanelProps {
  /** Each player taking part, with their strip, me first. */
  players: { id: string; heading: string }[];
  colours: Record<string, string>;
  lossesFor: (owner: string) => LossPicture[];
  planets: PlanetDef[];
  kindName: (kind: TokenKind) => string;
}

/** Battle: a tap on a token records a loss, and each player's strip gives it back. */
export function BattlePanel({ players, colours, lossesFor, planets, kindName }: BattlePanelProps) {
  const { t } = useTranslation();
  return (
    <>
      {players.length === 0 && <p className="muted">{t('stage.nobodyHere')}</p>}
      {players.map(({ id, heading }) => (
        <LossStrip key={id} heading={heading} colour={colours[id]} pictures={lossesFor(id)} planets={planets} kindName={kindName} />
      ))}
      <p className="muted">{t('stage.battleNote')}</p>
    </>
  );
}
