<script lang="ts">
	import ArticleRoute from '$lib/components/routes/ArticleRoute.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ArticleRoute {data} />
