<script lang="ts">
	import { untrack } from 'svelte';
	import type { ExtensionContext } from './contracts';
	import { registeredExtensions } from './extensions';
	import { mountPageExtensions } from './extension-runtime';
	let { context }: { context: ExtensionContext } = $props();
	$effect(() => {
		const currentContext = context;
		return untrack(() => mountPageExtensions(registeredExtensions, currentContext));
	});
</script>
