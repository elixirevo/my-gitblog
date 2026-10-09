import { loadPostListPage } from '$lib/server/post-loaders';
import { getTranslationLocaleEntries } from '$lib/server/route-entries';

export const entries = getTranslationLocaleEntries;

export const load = ({ params }) => loadPostListPage(params.locale);
