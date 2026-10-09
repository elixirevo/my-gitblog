<script lang="ts">
	type HeadingLink = {
		id: string;
		text: string;
		level: number;
	};

	interface Props {
		title: string;
		contentsLabel: string;
		headings: HeadingLink[];
		activeId: string;
		onNavigate: (id: string, event: Event) => void;
	}

	let { title, contentsLabel, headings, activeId, onNavigate }: Props = $props();
</script>

<aside class="article-aside">
	{#if headings.length > 0}
		<div class="toc-container">
			<p class="toc-label font-label">{contentsLabel}</p>

			<nav class="toc-nav">
				<a
					href="#post-title"
					onclick={(event) => onNavigate('post-title', event)}
					class="toc-link toc-link-top {activeId === 'post-title' ? 'active' : ''}"
				>
					<span>{title}</span>
				</a>

				{#each headings as heading (heading.id)}
					<a
						href={`#${heading.id}`}
						onclick={(event) => onNavigate(heading.id, event)}
						class="toc-link {heading.level === 2 ? 'heading-2' : 'heading-3'} {activeId ===
						heading.id
							? 'active'
							: ''}"
					>
						<span>{heading.text}</span>
					</a>
				{/each}
			</nav>
		</div>
	{/if}
</aside>
