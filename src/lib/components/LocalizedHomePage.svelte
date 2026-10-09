<script lang="ts">
	import HomeView from '$lib/theme/HomeView.svelte';
	import SeoLinks from '$lib/components/SeoLinks.svelte';
	import { type Locale, type UiCopy } from '$lib/i18n';
	import { getConfiguredLocales } from '$lib/locales';
	import { toHomePath, toPostPath } from '$lib/routes';
	import { toAbsoluteUrl, toAlternateLinks, toJsonLdScript, toXDefaultUrl } from '$lib/seo';
	import type { SiteConfig } from '$lib/site';
	import type { PostSummary } from '$lib/server/content';

	interface Props {
		locale: Locale;
		site: SiteConfig;
		ui: UiCopy;
		posts: PostSummary[];
	}

	let { locale, site, ui, posts }: Props = $props();

	let activeCategory = $state<string | null>(null);
	let activeTag = $state<string | null>(null);
	const selectedCategory = $derived(activeCategory ?? ui.home.allCategory);
	const canonicalPath = $derived(toHomePath(locale));
	const canonicalUrl = $derived(toAbsoluteUrl(site, canonicalPath));
	const alternateLinks = $derived(
		toAlternateLinks(site, getConfiguredLocales(), (alternateLocale) => toHomePath(alternateLocale))
	);
	const xDefaultUrl = $derived(toXDefaultUrl(site, toHomePath));

	const categories = $derived([
		ui.home.allCategory,
		...new Set(
			posts
				.map((post) => post.category)
				.filter(Boolean)
				.sort()
		)
	]);

	const tags = $derived([
		...new Set(
			posts
				.flatMap((post) => post.tags)
				.filter(Boolean)
				.sort((left, right) => left.localeCompare(right))
		)
	]);

	const filteredPosts = $derived(
		posts.filter(
			(post) =>
				(selectedCategory === ui.home.allCategory || post.category === selectedCategory) &&
				(!activeTag || post.tags.includes(activeTag))
		)
	);

	const jsonLd = $derived(
		toJsonLdScript({
			'@context': 'https://schema.org',
			'@type': 'Blog',
			name: site.title,
			description: site.description,
			url: canonicalUrl,
			inLanguage: site.language,
			publisher: {
				'@type': 'Person',
				name: site.author
			},
			blogPost: posts.slice(0, 10).map((post) => ({
				'@type': 'BlogPosting',
				headline: post.title,
				description: post.description,
				datePublished: post.date,
				url: toAbsoluteUrl(site, toPostPath(locale, post.slug))
			}))
		})
	);
</script>

<svelte:head>
	<title>{site.title}</title>
	<meta name="description" content={site.description} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={site.title} />
	<meta property="og:title" content={site.title} />
	<meta property="og:description" content={site.description} />
	<meta property="og:url" content={canonicalUrl} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={site.title} />
	<meta name="twitter:description" content={site.description} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLd}
</svelte:head>

<SeoLinks {canonicalUrl} {alternateLinks} {xDefaultUrl} />

<HomeView
	{locale}
	{ui}
	{categories}
	{tags}
	{selectedCategory}
	{activeTag}
	{filteredPosts}
	onCategorySelect={(category) => {
		activeCategory = category;
	}}
	onTagToggle={(tag) => {
		activeTag = activeTag === tag ? null : tag;
	}}
	onReset={() => {
		activeCategory = null;
		activeTag = null;
	}}
/>
