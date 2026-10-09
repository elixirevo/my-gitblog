import { getTranslationLocaleEntries } from '$lib/server/route-entries';

export const entries = getTranslationLocaleEntries;

export const load = ({ params }) => ({
	locale: params.locale
});
