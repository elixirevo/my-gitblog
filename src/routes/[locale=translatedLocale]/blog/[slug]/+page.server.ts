import { loadPostPage } from '$lib/server/post-loaders';
import { getTranslatedPostEntries } from '$lib/server/route-entries';

export const entries = getTranslatedPostEntries;
export const load = ({ params }) => loadPostPage(params.locale, params.slug);
