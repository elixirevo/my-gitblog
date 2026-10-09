import { isTranslationLocale } from '$lib/locales';

export const match = (param: string) => isTranslationLocale(param);
