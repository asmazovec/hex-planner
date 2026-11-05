import { useTranslation } from 'react-i18next';
import { currentLanguage, setLanguage, type Language } from '../../i18n';

const LANGUAGES: { code: Language; name: string }[] = [
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
];

export function SettingsScreen() {
  const { t } = useTranslation();
  return (
    <section className="screen">
      <div className="panel">
        <h2>{t('menu.settings')}</h2>
        <label className="field">
          {t('settings.language')}
          <select value={currentLanguage()} onChange={e => setLanguage(e.target.value as Language)}>
            {LANGUAGES.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}
