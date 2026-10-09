<script lang="ts">
	import SeoLinks from '$lib/components/SeoLinks.svelte';
	import { toPostPath } from '$lib/routes';
	import { toAbsoluteUrl, toAlternateLinks, toJsonLdScript, toXDefaultUrl } from '$lib/seo';
	import type { ArticlePageProps } from './contracts';
	let { locale, site, post, availableLocales }: ArticlePageProps = $props();
	const canonicalPath = $derived(toPostPath(locale, post.slug));
	const canonicalUrl = $derived(toAbsoluteUrl(site, canonicalPath));
	const alternateLinks = $derived(
		toAlternateLinks(site, availableLocales, (alternateLocale) =>
			toPostPath(alternateLocale, post.slug)
		)
	);
	const xDefaultUrl = $derived(
		toXDefaultUrl(site, (postLocale) => toPostPath(postLocale, post.slug))
	);
	const coverUrl = $derived(post.cover ? toAbsoluteUrl(site, post.cover) : null);
	const jsonLd = $derived(
		toJsonLdScript({
			'@context': 'https://schema.org',
			'@type': 'BlogPosting',
			headline: post.title,
			description: post.description,
			image: coverUrl ? [coverUrl] : undefined,
			datePublished: post.date,
			dateModified: post.date,
			articleSection: post.category,
			keywords: post.tags,
			inLanguage: site.language,
			url: canonicalUrl,
			mainEntityOfPage: {
				'@type': 'WebPage',
				'@id': canonicalUrl
			},
			author: {
				'@type': 'Person',
				name: site.author
			},
			publisher: {
				'@type': 'Person',
				name: site.author
			}
		})
	);
</script>

<svelte:head>
	<title>{post.title} | {site.title}</title>
	<meta name="description" content={post.description} />
	<meta property="og:type" content="article" />
	<meta property="og:site_name" content={site.title} />
	<meta property="og:title" content={post.title} />
	<meta property="og:description" content={post.description} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="article:published_time" content={post.date} />
	<meta property="article:modified_time" content={post.date} />
	<meta property="article:author" content={site.author} />
	<meta property="article:section" content={post.category} />
	{#each post.tags as tag (tag)}
		<meta property="article:tag" content={tag} />
	{/each}
	{#if coverUrl}
		<meta property="og:image" content={coverUrl} />
	{/if}
	<meta name="twitter:card" content={coverUrl ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={post.title} />
	<meta name="twitter:description" content={post.description} />
	{#if coverUrl}
		<meta name="twitter:image" content={coverUrl} />
	{/if}
	<meta data-pagefind-filter={`Category:${post.category}`} />
	<meta data-pagefind-filter={`Locale:${locale}`} />
	{#each post.tags as tag (tag)}
		<meta data-pagefind-filter={`Tag:${tag}`} />
	{/each}
	<meta data-pagefind-meta={`Category:${post.category}`} />
	<meta data-pagefind-meta={`Locale:${locale}`} />
	{#if post.tags.length > 0}
		<meta data-pagefind-meta={`Tags:${post.tags.join(', ')}`} />
	{/if}
	<meta data-pagefind-meta={`Published:${post.formattedDate}`} />
	<meta data-pagefind-sort={`date:${post.date}`} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLd}
</svelte:head>

<SeoLinks {canonicalUrl} {alternateLinks} {xDefaultUrl} />
