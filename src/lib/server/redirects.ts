import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { Locale } from '$lib/i18n';
import { toHomePath } from '$lib/routes';

export const redirectToHome = (locale: Locale) => {
	throw redirect(308, resolve(toHomePath(locale) as '/'));
};
