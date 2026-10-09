<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import SearchModal from '$lib/components/SearchModal.svelte';
	import SiteLayout from '$lib/theme/SiteLayout.svelte';
	import PageExtensions from './PageExtensions.svelte';
	import { createSiteController } from './site-controller.svelte';
	let { children }: { children: Snippet } = $props();
	const state = createSiteController();
	const context = $derived({
		site: state.site,
		locale: state.routeLocale,
		pathname: page.url.pathname,
		post: page.data.post
	});
</script>

<svelte:head>
	{#if state.site.googleSiteVerification}
		<meta name="google-site-verification" content={state.site.googleSiteVerification} />
	{/if}
	{#each state.rssLinks as rssLink (rssLink.locale)}
		<link rel="alternate" type="application/rss+xml" title={rssLink.title} href={rssLink.href} />
	{/each}
</svelte:head>
<SiteLayout {state} {context} {children} />
<PageExtensions {context} />
<SearchModal
	isOpen={state.isSearchOpen}
	locale={state.routeLocale}
	ui={state.ui}
	onClose={() => {
		state.isSearchOpen = false;
	}}
/>
