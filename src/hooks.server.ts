import type { Handle } from '@sveltejs/kit';
import { base } from '$app/paths';
import { getLocaleFromPathname, stripBasePath } from '$lib/i18n';
import { getSiteConfig } from '$lib/site';

export const handle: Handle = async ({ event, resolve }) => {
	const language = getSiteConfig(
		getLocaleFromPathname(stripBasePath(event.url.pathname, base))
	).language;

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('<html lang="ko-KR">', `<html lang="${language}">`)
	});
};
