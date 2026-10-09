<script lang="ts">
	import { resolve } from '$app/paths';
	import { toPostPath } from '$lib/routes';
	import PostFilters from '$lib/components/PostFilters.svelte';
	import type { HomeViewProps } from '$lib/template/contracts';
	let {
		locale,
		ui,
		categories,
		tags,
		selectedCategory,
		activeTag,
		filteredPosts,
		onCategorySelect,
		onTagToggle,
		onReset
	}: HomeViewProps = $props();
</script>

<div class="container-small">
	<PostFilters
		{categories}
		{tags}
		{selectedCategory}
		{activeTag}
		{onCategorySelect}
		{onTagToggle}
	/>

	<section class="post-list" aria-label="Recent posts">
		{#if filteredPosts.length > 0}
			{#each filteredPosts as post (post.slug)}
				<article class="post-item">
					<time class="post-date font-label" datetime={post.date}>
						{post.formattedDate}
					</time>
					<h2 class="post-title font-body">
						<a href={resolve(toPostPath(locale, post.slug) as `/blog/${string}`)}>{post.title}</a>
					</h2>
				</article>
			{/each}
		{:else}
			<div class="empty-state">
				<p class="font-label">{ui.home.emptyState}</p>
				<button type="button" class="font-label" onclick={onReset}>
					{ui.home.viewAll}
				</button>
			</div>
		{/if}
	</section>
</div>
