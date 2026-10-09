import { loadPostListPage } from '$lib/server/post-loaders';
import { sourceLocale } from '$lib/locales';

export const load = () => loadPostListPage(sourceLocale);
