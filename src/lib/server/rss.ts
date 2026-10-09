import { env } from '$env/dynamic/private';
import type { Locale } from '$lib/i18n';
import { sourceLocale } from '$lib/locales';
import { toHomePath, toPostPath, toRssPath } from '$lib/routes';
import { toAbsoluteUrl } from '$lib/seo';
import { getAllPosts } from '$lib/server/content';
import { createXmlResponse, escapeXml } from '$lib/server/xml';
import { getSiteConfig } from '$lib/site';

export const createRssResponse = (locale: Locale) => {
	const siteConfig = getSiteConfig(locale);
	const posts = getAllPosts(locale);
	const channelLink = toAbsoluteUrl(siteConfig, toHomePath(locale));
	const feedLink = toAbsoluteUrl(siteConfig, toRssPath(locale));
	const lastBuildDate = posts.reduce(
		(latest, post) =>
			Date.parse(post.updated ?? post.date) > Date.parse(latest)
				? (post.updated ?? post.date)
				: latest,
		posts[0]?.updated ?? posts[0]?.date ?? new Date().toISOString()
	);

	const items = posts
		.map((post) => {
			const link = toAbsoluteUrl(siteConfig, toPostPath(locale, post.slug));
			const cover = post.cover
				? `\n\t\t<hub:cover>${escapeXml(toAbsoluteUrl(siteConfig, post.cover))}</hub:cover>`
				: '';
			const updated = post.updated
				? `\n\t\t<hub:updated>${escapeXml(new Date(post.updated).toISOString())}</hub:updated>`
				: '';
			const categories = [post.category, ...post.tags]
				.map((category) => `\t\t<category>${escapeXml(category)}</category>`)
				.join('\n');

			return `<item>
		<title>${escapeXml(post.title)}</title>
		<link>${escapeXml(link)}</link>
		<guid isPermaLink="false">${escapeXml(post.id)}</guid>
		<description>${escapeXml(post.excerpt)}</description>
		<pubDate>${new Date(post.date).toUTCString()}</pubDate>
		<hub:postId>${escapeXml(post.id)}</hub:postId>
		<hub:locale>${escapeXml(post.locale)}</hub:locale>
		<hub:sourceLocale>${escapeXml(post.sourceLocale)}</hub:sourceLocale>
		<hub:giscusTerm>${escapeXml(post.giscusTerm)}</hub:giscusTerm>${cover}${updated}
${categories}
	</item>`;
		})
		.join('\n');

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:hub="https://gitblog.dev/ns/hub/1.0">
<channel>
	<title>${escapeXml(siteConfig.title)}</title>
	<link>${escapeXml(channelLink)}</link>
	<description>${escapeXml(siteConfig.description)}</description>
	<language>${escapeXml(siteConfig.language)}</language>
	<hub:schemaVersion>1</hub:schemaVersion>${env.GITBLOG_BUILD_COMMIT ? `\n\t<hub:buildCommit>${escapeXml(env.GITBLOG_BUILD_COMMIT)}</hub:buildCommit>` : ''}
	<hub:sourceLocale>${escapeXml(sourceLocale)}</hub:sourceLocale>
	<lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>
	<atom:link href="${escapeXml(feedLink)}" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`;

	return createXmlResponse(rss, 'application/rss+xml');
};
