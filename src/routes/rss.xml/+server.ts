import { sourceLocale } from '$lib/locales';
import { createRssResponse } from '$lib/server/rss';

export const prerender = true;
export const trailingSlash = 'never';

export const GET = () => createRssResponse(sourceLocale);
