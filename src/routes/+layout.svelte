<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import SiteShell from '$lib/template/SiteShell.svelte';
	let { children }: { children: Snippet } = $props();
</script>

<SiteShell {children} />
