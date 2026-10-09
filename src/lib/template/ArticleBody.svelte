<script lang="ts">
	let { html, element = $bindable() }: { html: string; element?: HTMLElement } = $props();
</script>

<div bind:this={element} class="article-content" data-pagefind-body>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</div>
