import { createRssResponse } from '$lib/server/rss';
import { getTranslationLocaleEntries } from '$lib/server/route-entries';

export const prerender = true;
export const trailingSlash = 'never';

export const entries = getTranslationLocaleEntries;

export const GET = ({ params }) => createRssResponse(params.locale);
