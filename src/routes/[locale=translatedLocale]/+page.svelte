<script lang="ts">
	import HomeRoute from '$lib/components/routes/HomeRoute.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<HomeRoute {data} />
