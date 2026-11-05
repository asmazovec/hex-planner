import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './ru.json';
import en from './en.json';

export type Language = 'ru' | 'en';

const STORAGE_KEY = 'ti4.lang';

function readStoredLanguage(): Language {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'ru' || value === 'en') return value;
  } catch {
    // storage unavailable: fall back to the default
  }
  return 'ru';
}

void i18next.use(initReactI18next).init({
  resources: { ru: { translation: ru }, en: { translation: en } },
  lng: readStoredLanguage(),
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // storage unavailable: the choice applies for this session only
  }
  void i18next.changeLanguage(lang);
}

export function currentLanguage(): Language {
  return i18next.language === 'en' ? 'en' : 'ru';
}

export default i18next;
