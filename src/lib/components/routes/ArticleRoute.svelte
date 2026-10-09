<script lang="ts">
	import LocalizedArticlePage from '$lib/components/LocalizedArticlePage.svelte';
	import { getUiCopy, type Locale } from '$lib/i18n';
	import { getSiteConfig } from '$lib/site';
	import type { BlogPost, PostSummary } from '$lib/server/content';

	interface Props {
		data: {
			locale: Locale;
			post: BlogPost;
			availableLocales: Locale[];
			relatedPosts: PostSummary[];
		};
	}

	let { data }: Props = $props();

	const locale = $derived(data.locale);
	const site = $derived(getSiteConfig(locale));
	const ui = $derived(getUiCopy(locale));
</script>

<LocalizedArticlePage
	{locale}
	{site}
	{ui}
	post={data.post}
	availableLocales={data.availableLocales}
	relatedPosts={data.relatedPosts}
/>
