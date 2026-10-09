import { toLocalePathname, type Locale } from '$lib/i18n';

export const toHomePath = (locale: Locale) => toLocalePathname('/', locale);

export const toPostPath = (locale: Locale, slug: string) =>
	toLocalePathname(`/blog/${slug}/`, locale);

export const toRssPath = (locale: Locale) => toLocalePathname('/rss.xml', locale);

export const toSearchPath = (locale: Locale) => toLocalePathname('/search/', locale);
