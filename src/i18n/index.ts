import ko from './ko.json';
import en from './en.json';
import ja from './ja.json';

export const languages = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
} as const;

export const defaultLang = 'ko';

export type Lang = keyof typeof languages;

const translations = { ko, en, ja } as const;

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in languages) return lang as Lang;
  return defaultLang;
}

export function useTranslations(lang: Lang) {
  return translations[lang];
}

export function getLocalizedPath(path: string, lang: Lang): string {
  if (lang === defaultLang) {
    return path;
  }
  return `/${lang}${path}`;
}
