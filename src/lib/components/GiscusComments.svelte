<script lang="ts">
	import { dev } from '$app/environment';
	import type { UiCopy } from '$lib/i18n';
	import type { SiteConfig } from '$lib/site';
	import { onMount } from 'svelte';

	type GiscusSetConfigMessage = {
		setConfig: {
			theme?: string;
		};
	};

	let { site, ui, term }: { site: SiteConfig; ui: UiCopy; term: string } = $props();

	let container = $state<HTMLDivElement | null>(null);
	let theme = $state('light');

	const getHost = () => {
		try {
			const url = new URL(site.giscusHost);
			if (
				!url.username &&
				!url.password &&
				(url.protocol === 'https:' ||
					(dev && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
			)
				return url.origin;
		} catch {
			/* Use the official host when the configuration is invalid. */
		}
		return site.giscusProvider === 'gitblog' ? null : 'https://giscus.app';
	};

	const getConfig = () => ({
		repo: site.giscusRepo.trim(),
		repoId: site.giscusRepoId.trim(),
		category: site.giscusCategory.trim(),
		categoryId: site.giscusCategoryId.trim(),
		language: site.language.split('-')[0] || 'en'
	});

	const isConfigured = () => {
		const config = getConfig();

		return (
			getHost() !== null &&
			config.repo !== '' &&
			config.repoId !== '' &&
			config.category !== '' &&
			config.categoryId !== ''
		);
	};

	const getTheme = () =>
		document.documentElement.classList.contains('dark') ? 'dark_dimmed' : 'light';

	const sendMessage = (message: GiscusSetConfigMessage) => {
		const iframe = container?.querySelector<HTMLIFrameElement>('iframe.giscus-frame');

		if (!iframe?.contentWindow || !getHost()) {
			return;
		}

		iframe.contentWindow.postMessage({ giscus: message }, getHost()!);
	};

	const mountGiscus = () => {
		if (!container || !isConfigured()) {
			return;
		}

		const config = getConfig();
		const discussionTerm = term.trim();
		const script = document.createElement('script');
		script.src = `${getHost()}/client.js`;
		script.async = true;
		script.crossOrigin = 'anonymous';
		script.setAttribute('data-repo', config.repo);
		script.setAttribute('data-repo-id', config.repoId);
		script.setAttribute('data-category', config.category);
		script.setAttribute('data-category-id', config.categoryId);
		script.setAttribute('data-mapping', 'specific');
		script.setAttribute('data-term', discussionTerm);
		script.setAttribute('data-strict', '0');
		script.setAttribute('data-reactions-enabled', '1');
		script.setAttribute('data-emit-metadata', '0');
		script.setAttribute('data-input-position', 'top');
		script.setAttribute('data-theme', theme);
		script.setAttribute('data-lang', config.language);
		script.setAttribute('data-loading', 'lazy');

		// eslint-disable-next-line svelte/no-dom-manipulating
		container.replaceChildren(script);
	};

	onMount(() => {
		if (!isConfigured()) {
			return;
		}

		theme = getTheme();
		mountGiscus();

		const observer = new MutationObserver(() => {
			const nextTheme = getTheme();

			if (nextTheme === theme) {
				return;
			}

			theme = nextTheme;
			sendMessage({
				setConfig: {
					theme
				}
			});
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		return () => observer.disconnect();
	});
</script>

{#if isConfigured() || site.giscusProvider === 'gitblog' || dev}
	<section class="giscus-section">
		<div class="giscus-wrapper">
			<div class="giscus-header">
				<p class="giscus-label font-label">{ui.comments.label}</p>
				<h2 class="giscus-title font-headline">{ui.comments.title}</h2>
			</div>

			{#if isConfigured()}
				<div class="giscus-container">
					<div bind:this={container}></div>
				</div>
			{:else}
				<div class="giscus-empty font-label">
					{site.giscusProvider === 'gitblog'
						? ui.comments.pendingMessage
						: ui.comments.emptyMessage}
				</div>
			{/if}
		</div>
	</section>
{/if}

<style>
	.giscus-section {
		margin-top: 6rem;
		padding-top: 3rem;
		border-top: 2px solid var(--border-dim);
	}
	.giscus-wrapper {
		max-width: 42rem;
	}
	.giscus-header {
		margin-bottom: 2rem;
	}
	.giscus-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--primary);
		font-weight: 700;
		margin-bottom: 0.5rem;
	}
	.giscus-title {
		font-size: 1.5rem;
		letter-spacing: -0.05em;
		color: var(--text);
	}
	.giscus-container {
		border-radius: 0.75rem;
		border: 1px solid var(--border-light);
		background-color: var(--nav-bg);
		padding: 1rem;
	}
	@media (min-width: 768px) {
		.giscus-container {
			padding: 1.5rem;
		}
	}
	.giscus-empty {
		border-radius: 0.75rem;
		border: 1px dashed var(--border-strong);
		background-color: var(--bg-component);
		padding: 1.25rem 1rem;
		font-size: 0.875rem;
		line-height: 1.75;
		color: var(--text-dim);
	}
</style>
