<script lang="ts">
	import SearchRoute from '$lib/components/routes/SearchRoute.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<SearchRoute {data} />
