<script lang="ts">
	import PagefindSearch from '$lib/components/PagefindSearch.svelte';
	import SeoLinks from '$lib/components/SeoLinks.svelte';
	import { type Locale, type UiCopy } from '$lib/i18n';
	import { toSearchPath } from '$lib/routes';
	import { toAbsoluteUrl } from '$lib/seo';
	import type { SiteConfig } from '$lib/site';

	interface Props {
		locale: Locale;
		site: SiteConfig;
		ui: UiCopy;
	}

	let { locale, site, ui }: Props = $props();

	const canonicalPath = $derived(toSearchPath(locale));
	const canonicalUrl = $derived(toAbsoluteUrl(site, canonicalPath));
</script>

<svelte:head>
	<title>{ui.search.title} | {site.title}</title>
	<meta name="description" content={site.description} />
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<SeoLinks {canonicalUrl} />

<section class="section-stack">
	<div class="section-head">
		<div>
			<p class="eyebrow">{ui.search.eyebrow}</p>
			<h1>{ui.search.title}</h1>
		</div>
		<p class="section-copy">
			{ui.search.description}
		</p>
	</div>

	<PagefindSearch
		{locale}
		placeholder={ui.search.placeholder}
		ariaLabel={ui.search.ariaLabel}
		statusMessages={{
			loading: ui.search.loading,
			missingTitle: ui.search.missingTitle,
			missingHint: ui.search.missingHint
		}}
	/>
</section>
