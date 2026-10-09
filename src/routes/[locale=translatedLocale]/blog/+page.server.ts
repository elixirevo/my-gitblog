import { getTranslationLocaleEntries } from '$lib/server/route-entries';
import { redirectToHome } from '$lib/server/redirects';

export const entries = getTranslationLocaleEntries;

export const load = ({ params }) => {
	redirectToHome(params.locale);
};
