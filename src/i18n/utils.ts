import { ui, defaultLang } from './ui';

export function getLangFromUrl(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  }
}

export function useTranslatedPath(lang: keyof typeof ui) {
  return function translatePath(path: string, l: string = lang) {
    const currentLang = getLangFromUrl(new URL('http://dummy.com' + path));
    const pathWithoutLang = path.startsWith(`/${currentLang}/`) 
      ? path.replace(`/${currentLang}/`, '/') 
      : path.startsWith(`/${currentLang}`) 
        ? path.replace(`/${currentLang}`, '/')
        : path;
    
    const cleanPath = pathWithoutLang.startsWith('/') ? pathWithoutLang.substring(1) : pathWithoutLang;
    const result = `/${l}/${cleanPath}`.replace(/\/+$/, '');
    return result === `/${l}` ? `/${l}/` : `${result}/`;
  }
}
