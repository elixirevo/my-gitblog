<script lang="ts">
	import LocalizedHomePage from '$lib/components/LocalizedHomePage.svelte';
	import { getUiCopy, type Locale } from '$lib/i18n';
	import { getSiteConfig } from '$lib/site';
	import type { PostSummary } from '$lib/server/content';

	interface Props {
		data: {
			locale: Locale;
			posts: PostSummary[];
		};
	}

	let { data }: Props = $props();

	const locale = $derived(data.locale);
	const site = $derived(getSiteConfig(locale));
	const ui = $derived(getUiCopy(locale));
</script>

<LocalizedHomePage {locale} {site} {ui} posts={data.posts} />
