<script lang="ts">
	import type { ExtensionContext, ExtensionPointName } from './contracts';
	import { registeredExtensions } from './extensions';
	let { name, context }: { name: ExtensionPointName; context: ExtensionContext } = $props();
</script>

{#each registeredExtensions as extension (extension.id)}
	{@const View = extension.components?.[name]}
	{#if View}
		<View {context} />
	{/if}
{/each}
