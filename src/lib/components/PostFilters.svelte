<script lang="ts">
	interface Props {
		categories: string[];
		tags: string[];
		selectedCategory: string;
		activeTag: string | null;
		onCategorySelect: (category: string) => void;
		onTagToggle: (tag: string) => void;
	}

	let { categories, tags, selectedCategory, activeTag, onCategorySelect, onTagToggle }: Props =
		$props();
</script>

<header>
	<div class="filter-group category-filter-group {tags.length > 0 ? 'has-tag-filter' : ''}">
		{#each categories as category (category)}
			<button
				type="button"
				class="filter-btn font-label {category === selectedCategory ? 'active' : ''}"
				onclick={() => onCategorySelect(category)}
			>
				{category}
			</button>
		{/each}
	</div>
	{#if tags.length > 0}
		<div class="filter-group tag-filter-group" aria-label="Tags">
			{#each tags as tag (tag)}
				<button
					type="button"
					class="filter-btn tag-filter-btn font-label {tag === activeTag ? 'active' : ''}"
					onclick={() => onTagToggle(tag)}
				>
					{tag}
				</button>
			{/each}
		</div>
	{/if}
</header>
