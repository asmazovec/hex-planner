import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../data/loadPack';
import { setLanguage, type Language } from '../i18n';
import { useGame } from '../state/gameStore';
import { Banner } from './common/Banner';
import { downloadGame } from './common/download';
import { GameScreen } from './screens/GameScreen';
import { OpponentsScreen } from './screens/OpponentsScreen';

const SCREENS = ['game', 'map', 'plan', 'rivals'] as const;
type Screen = (typeof SCREENS)[number];

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
];

export function App() {
  const { t, i18n } = useTranslation();
  const [screen, setScreen] = useState<Screen>('game');
  const game = useGame(s => s.game);
  const saveError = useGame(s => s.saveError);

  const dataMismatch = game !== null && game.dataVersion !== loadPack(game.expansions).version;

  return (
    <div className="app">
      <header>
        <div role="group" aria-label={t('language.label')}>
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              aria-pressed={i18n.language === code}
              onClick={() => setLanguage(code)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      {dataMismatch && <Banner kind="warning" message={t('game.dataVersionWarning')} />}
      {saveError && (
        <Banner
          kind="error"
          message={t('banner.saveError', { error: saveError })}
          action={game ? { label: t('banner.export'), onClick: () => downloadGame(game) } : undefined}
        />
      )}
      <main data-screen={screen}>
        {screen === 'game' && <GameScreen />}
        {screen === 'rivals' && <OpponentsScreen />}
      </main>
      <nav>
        {SCREENS.map((id) => (
          <button
            key={id}
            type="button"
            aria-current={screen === id ? 'page' : undefined}
            onClick={() => setScreen(id)}
          >
            {t(`menu.${id}`)}
          </button>
        ))}
      </nav>
    </div>
  );
}
