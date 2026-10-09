import { error } from '@sveltejs/kit';
import type { Locale } from '$lib/i18n';
import { getAllPosts, getPost, getPostLocales } from '$lib/server/content';

export const loadPostListPage = (locale: Locale) => ({
	locale,
	posts: getAllPosts(locale)
});

export const loadPostPage = (locale: Locale, slug: string) => {
	const post = getPost(slug, locale);

	if (!post) {
		throw error(404, 'Post not found');
	}

	return {
		locale,
		post,
		availableLocales: getPostLocales(slug),
		relatedPosts: getAllPosts(locale)
			.filter((entry) => entry.slug !== slug)
			.slice(0, 3)
	};
};
