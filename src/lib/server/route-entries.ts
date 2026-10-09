import { getTranslationLocales, sourceLocale } from '$lib/locales';
import { getAllPosts } from '$lib/server/content';

export const getTranslationLocaleEntries = () =>
	getTranslationLocales().map((locale) => ({ locale }));

export const getSourcePostEntries = () => getAllPosts(sourceLocale).map(({ slug }) => ({ slug }));

export const getTranslatedPostEntries = () =>
	getTranslationLocales().flatMap((locale) =>
		getAllPosts(locale).map(({ slug }) => ({
			locale,
			slug
		}))
	);
