<script lang="ts">
	import type { AlternateLink } from '$lib/seo';

	interface Props {
		canonicalUrl: string;
		alternateLinks?: AlternateLink[];
		xDefaultUrl?: string | null;
	}

	let { canonicalUrl, alternateLinks = [], xDefaultUrl = null }: Props = $props();
</script>

<svelte:head>
	<link rel="canonical" href={canonicalUrl} />
	{#each alternateLinks as alternateLink (alternateLink.hreflang)}
		<link rel="alternate" hreflang={alternateLink.hreflang} href={alternateLink.href} />
	{/each}
	{#if xDefaultUrl}
		<link rel="alternate" hreflang="x-default" href={xDefaultUrl} />
	{/if}
</svelte:head>
