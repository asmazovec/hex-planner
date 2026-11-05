import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage, type Language } from '../i18n';

const SCREENS = ['game', 'map', 'plan', 'rivals'] as const;
type Screen = (typeof SCREENS)[number];

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
];

export function App() {
  const { t, i18n } = useTranslation();
  const [screen, setScreen] = useState<Screen>('game');

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
      <main data-screen={screen} />
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
