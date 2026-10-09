<script lang="ts">
	import LocalizedSearchPage from '$lib/components/LocalizedSearchPage.svelte';
	import { getUiCopy, type Locale } from '$lib/i18n';
	import { getSiteConfig } from '$lib/site';

	interface Props {
		data: {
			locale: Locale;
		};
	}

	let { data }: Props = $props();

	const locale = $derived(data.locale);
	const site = $derived(getSiteConfig(locale));
	const ui = $derived(getUiCopy(locale));
</script>

<LocalizedSearchPage {locale} {site} {ui} />
