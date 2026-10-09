import { sourceLocale } from '$lib/locales';
import { redirectToHome } from '$lib/server/redirects';

export const load = () => {
	redirectToHome(sourceLocale);
};
