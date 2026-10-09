<script lang="ts">
	import { base, resolve } from '$app/paths';
	import { toHomePath } from '$lib/routes';
	import ArticleTableOfContents from '$lib/components/ArticleTableOfContents.svelte';
	import GiscusComments from '$lib/components/GiscusComments.svelte';
	import RelatedPosts from '$lib/components/RelatedPosts.svelte';
	import ArticleBody from '$lib/template/ArticleBody.svelte';
	import ExtensionPoint from '$lib/template/ExtensionPoint.svelte';
	import type { ArticleController } from '$lib/template/contracts';
	import type { ArticlePageProps, ExtensionContext } from '$lib/template/contracts';
	let {
		locale,
		site,
		ui,
		post,
		relatedPosts,
		article,
		html,
		context
	}: ArticlePageProps & { article: ArticleController; html: string; context: ExtensionContext } =
		$props();
</script>

<div class="container-large article-grid">
	<div class="article-spacer"></div>

	<article class="article-center">
		<header>
			<a href={resolve(toHomePath(locale) as '/')} class="article-back">
				<span class="material-symbols-outlined" data-icon="arrow_back">arrow_back</span>
				{ui.article.backToArchive}
			</a>

			<div data-pagefind-body>
				<div class="article-meta">
					<span>{post.category}</span>
					<span class="meta-divider"></span>
					<span>{post.formattedDate}</span>
					{#if post.readingTime}
						<span class="meta-divider"></span>
						<span>{post.readingTime}</span>
					{/if}
				</div>

				<h1 id="post-title" class="article-h1 font-headline">
					{post.title}
				</h1>

				<p class="article-desc font-body">
					"{post.description}"
				</p>
				{#if post.tags.length > 0}
					<div class="article-tags font-label">
						{#each post.tags as tag (tag)}
							<span class="article-tag">{tag}</span>
						{/each}
					</div>
				{/if}
			</div>
		</header>

		{#if post.cover}
			<figure class="article-figure" data-pagefind-body>
				<img alt={post.title} src={`${base}${post.cover}`} />
			</figure>
		{/if}

		<ExtensionPoint name="article-before-body" {context} />
		<ArticleBody {html} bind:element={article.element} />
		<ExtensionPoint name="article-after-body" {context} />

		{#key `${locale}:${post.giscusTerm}`}
			<GiscusComments {site} {ui} term={post.giscusTerm} />
		{/key}

		<RelatedPosts {locale} {ui} posts={relatedPosts} />
	</article>

	<ArticleTableOfContents
		title={post.title}
		contentsLabel={ui.article.contents}
		headings={article.headings}
		activeId={article.activeId}
		onNavigate={article.scrollToHeading}
	/>
</div>
