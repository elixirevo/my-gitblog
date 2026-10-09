import { loadPostPage } from '$lib/server/post-loaders';
import { getSourcePostEntries } from '$lib/server/route-entries';
import { sourceLocale } from '$lib/locales';

export const entries = getSourcePostEntries;
export const load = ({ params }) => loadPostPage(sourceLocale, params.slug);
