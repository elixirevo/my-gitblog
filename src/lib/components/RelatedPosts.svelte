<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Locale, UiCopy } from '$lib/i18n';
	import { toPostPath } from '$lib/routes';
	import type { PostSummary } from '$lib/server/content';

	interface Props {
		locale: Locale;
		ui: UiCopy;
		posts: PostSummary[];
	}

	let { locale, ui, posts }: Props = $props();
</script>

{#if posts.length > 0}
	<div class="related-boundary">
		<div>
			<p class="related-label font-label">{ui.article.continueReading}</p>
			<h2 class="related-h2 font-headline">{ui.article.relatedTitle}</h2>
		</div>

		<div class="related-grid">
			{#each posts as relatedPost (relatedPost.slug)}
				<a
					class="related-post"
					href={resolve(toPostPath(locale, relatedPost.slug) as `/blog/${string}`)}
				>
					<div class="related-meta font-label">
						<span>{relatedPost.category}</span>
						<span class="related-meta-div"></span>
						<span>{relatedPost.formattedDate}</span>
					</div>
					<h3 class="related-title font-headline">
						{relatedPost.title}
					</h3>
					<p class="related-desc font-body">
						{relatedPost.description}
					</p>
				</a>
			{/each}
		</div>
	</div>
{/if}
