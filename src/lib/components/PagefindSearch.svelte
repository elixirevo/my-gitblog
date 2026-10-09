<script lang="ts">
	import { base } from '$app/paths';
	import type { Locale } from '$lib/i18n';
	import { onMount } from 'svelte';

	type SearchStatus = 'loading' | 'ready' | 'missing';
	type SearchState = {
		query: string;
		categoryCounts: Record<string, number>;
	};

	interface Props {
		splitResults?: boolean;
		locale?: Locale;
		selectedCategories?: string[];
		onSearchStateChange?: (state: SearchState) => void;
		onResultNavigate?: () => void;
		panelClass?: string;
		placeholder?: string;
		autofocus?: boolean;
		enableKeyboardNavigation?: boolean;
		ariaLabel?: string;
		statusMessages?: {
			loading: string;
			missingTitle: string;
			missingHint: string;
		};
	}

	type PagefindWindow = Window & {
		PagefindUI?: new (options: Record<string, unknown>) => {
			triggerFilters: (filters: Record<string, string[] | string>) => void;
			destroy: () => void;
		};
	};

	type PagefindApi = {
		search: (
			term: string | null,
			options?: { filters?: Record<string, unknown> }
		) => Promise<{
			filters?: Record<string, Record<string, number>>;
			totalFilters?: Record<string, Record<string, number>>;
			results?: Array<{
				id?: string;
				data: () => Promise<{
					meta?: Record<string, string>;
					url?: string;
					excerpt?: string;
				}>;
			}>;
		}>;
		destroy: () => Promise<void> | void;
	};

	let {
		splitResults = false,
		locale,
		selectedCategories = [],
		onSearchStateChange = () => {},
		onResultNavigate = () => {},
		panelClass = '',
		placeholder = 'Search the archive',
		autofocus = false,
		enableKeyboardNavigation = false,
		ariaLabel = 'Archive search',
		statusMessages = {
			loading: '검색 인덱스를 불러오는 중입니다.',
			missingTitle: 'Pagefind 인덱스를 아직 찾지 못했습니다.',
			missingHint: '로컬에서는 `bun run build` 후 `bun run preview`에서 검색을 확인할 수 있습니다.'
		}
	}: Props = $props();

	const bundlePath = `${base}/pagefind/`;
	const baseUrl = base === '' ? '/' : `${base}/`;

	let status = $state<SearchStatus>('loading');
	let searchMount = $state<HTMLDivElement | undefined>(undefined);
	let resultsHost = $state<HTMLDivElement | undefined>(undefined);
	let pagefindUi = $state<{
		triggerFilters: (filters: Record<string, string[] | string>) => void;
		destroy: () => void;
	} | null>(null);
	let pagefindApi = $state<PagefindApi | null>(null);
	let searchInput = $state<HTMLInputElement | undefined>(undefined);
	let searchQuery = $state('');
	let categoryCounts = $state<Record<string, number>>({});

	const emitSearchState = () => {
		onSearchStateChange({
			query: searchQuery,
			categoryCounts
		});
	};

	const buildLocaleFilter = (): Record<string, string[] | string> => {
		const filters: Record<string, string[] | string> = {};

		if (locale) {
			filters.Locale = [locale];
		}

		return filters;
	};

	const buildResultFilters = (): Record<string, string[] | string> => {
		const filters = buildLocaleFilter();

		if (selectedCategories.length > 0) {
			filters.Category = selectedCategories;
		}

		return filters;
	};

	const moveDrawerToResultsHost = (target: HTMLElement) => {
		if (!splitResults || !resultsHost) {
			return;
		}

		const drawer = target.querySelector<HTMLElement>('.pagefind-ui__drawer');

		if (drawer && drawer.parentElement !== resultsHost) {
			// Pagefind renders its drawer inside its own root, so the modal re-homes it intentionally.
			// eslint-disable-next-line svelte/no-dom-manipulating
			resultsHost.append(drawer);
		}
	};

	const hideBuiltInFilterPanel = (target: HTMLElement) => {
		const filterPanel = target.querySelector<HTMLElement>('.pagefind-ui__filter-panel');

		if (filterPanel) {
			filterPanel.hidden = true;
			filterPanel.setAttribute('aria-hidden', 'true');
			filterPanel.style.setProperty('display', 'none', 'important');
		}

		for (const filterBlock of target.querySelectorAll<HTMLElement>('.pagefind-ui__filter-block')) {
			filterBlock.hidden = true;
			filterBlock.setAttribute('aria-hidden', 'true');
			filterBlock.style.setProperty('display', 'none', 'important');
		}
	};

	const ensurePagefindApi = async () => {
		if (pagefindApi) {
			return pagefindApi;
		}

		const pagefindModule = (await import(/* @vite-ignore */ `${bundlePath}pagefind.js`)) as {
			createInstance: (options: Record<string, unknown>) => PagefindApi;
		};

		pagefindApi = pagefindModule.createInstance({
			basePath: bundlePath
		});

		return pagefindApi;
	};

	let searchStateRequest = 0;
	let searchStateTimer: ReturnType<typeof setTimeout> | undefined;

	const deriveCategoryCountsFromResults = async (
		results: Array<{
			data: () => Promise<{
				meta?: Record<string, string>;
			}>;
		}>
	) => {
		const counts: Record<string, number> = {};
		const fragments = await Promise.all(results.map((result) => result.data()));

		for (const fragment of fragments) {
			const category = fragment.meta?.Category;

			if (!category) {
				continue;
			}

			counts[category] = (counts[category] ?? 0) + 1;
		}

		return counts;
	};

	const refreshSearchData = async () => {
		const trimmedQuery = searchQuery.trim();

		if (searchStateTimer) {
			clearTimeout(searchStateTimer);
		}

		const requestId = ++searchStateRequest;
		searchStateTimer = setTimeout(async () => {
			const api = await ensurePagefindApi();
			const countsResponse = await api.search(trimmedQuery === '' ? null : searchQuery, {
				filters: buildLocaleFilter()
			});

			if (requestId !== searchStateRequest) {
				return;
			}

			const filterCounts = countsResponse.filters?.Category;
			const totalFilterCounts = countsResponse.totalFilters?.Category;

			categoryCounts =
				filterCounts && Object.keys(filterCounts).length > 0
					? filterCounts
					: totalFilterCounts && Object.keys(totalFilterCounts).length > 0
						? totalFilterCounts
						: await deriveCategoryCountsFromResults(countsResponse.results ?? []);

			emitSearchState();
		}, 180);
	};

	const handleSearchInput = (event: Event) => {
		searchQuery = (event.currentTarget as HTMLInputElement).value;
		void refreshSearchData();
	};

	const getResultLinks = () => {
		const roots = [resultsHost, searchMount].filter(
			(root): root is HTMLDivElement => root instanceof HTMLDivElement
		);
		const links: HTMLAnchorElement[] = [];

		for (const root of roots) {
			for (const link of root.querySelectorAll<HTMLAnchorElement>('.pagefind-ui__result-link')) {
				if (links.includes(link)) {
					continue;
				}

				links.push(link);
			}
		}

		return links;
	};

	const focusSearchInput = () => {
		searchInput?.focus();
	};

	const focusResultAtIndex = (index: number) => {
		const links = getResultLinks();
		const link = links[index];

		if (!link) {
			return;
		}

		link.focus();
		link.closest<HTMLElement>('.pagefind-ui__result')?.scrollIntoView({
			block: 'nearest'
		});
	};

	const handleKeyboardNavigation = (event: KeyboardEvent) => {
		if (
			!enableKeyboardNavigation ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey ||
			event.isComposing
		) {
			return;
		}

		const target = event.target;

		if (!(target instanceof Element)) {
			return;
		}

		const resultLink = target.closest<HTMLAnchorElement>('.pagefind-ui__result-link');
		const isSearchInput = target === searchInput || !!target.closest('.pagefind-ui__search-input');

		if (!isSearchInput && !resultLink) {
			return;
		}

		const links = getResultLinks();

		if (links.length === 0) {
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();

			if (!resultLink) {
				focusResultAtIndex(0);
				return;
			}

			const currentIndex = links.indexOf(resultLink);
			focusResultAtIndex(Math.min(currentIndex + 1, links.length - 1));
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();

			if (!resultLink) {
				focusResultAtIndex(links.length - 1);
				return;
			}

			const currentIndex = links.indexOf(resultLink);

			if (currentIndex <= 0) {
				focusSearchInput();
				return;
			}

			focusResultAtIndex(currentIndex - 1);
		}
	};

	const syncSearchInput = (target: HTMLElement) => {
		const nextInput =
			target.querySelector<HTMLInputElement>('.pagefind-ui__search-input') ?? undefined;

		if (searchInput === nextInput) {
			return;
		}

		if (searchInput) {
			searchInput.removeEventListener('input', handleSearchInput);
		}

		searchInput = nextInput;

		if (searchInput) {
			searchInput.addEventListener('input', handleSearchInput);
			searchQuery = searchInput.value;
			void refreshSearchData();
		}
	};

	const applySelectedCategories = () => {
		if (!pagefindUi) {
			return;
		}

		pagefindUi.triggerFilters(buildResultFilters());
	};

	const handleResultClick = (event: Event) => {
		const target = event.target;

		if (!(target instanceof Element)) {
			return;
		}

		if (target.closest('.pagefind-ui__result-link')) {
			onResultNavigate();
			return;
		}

		if (target.closest('a, button, input, textarea, select, summary')) {
			return;
		}

		const result = target.closest<HTMLElement>('.pagefind-ui__result');
		const resultLink = result?.querySelector<HTMLAnchorElement>('.pagefind-ui__result-link');

		resultLink?.click();
	};

	const ensureStylesheet = (href: string) => {
		if (document.querySelector(`link[data-pagefind-ui="true"][href="${href}"]`)) {
			return;
		}

		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = href;
		link.dataset.pagefindUi = 'true';
		document.head.append(link);
	};

	const loadScript = async (src: string) =>
		new Promise<void>((resolve, reject) => {
			const pagefindWindow = window as PagefindWindow;

			if (pagefindWindow.PagefindUI) {
				resolve();
				return;
			}

			const existing = document.querySelector<HTMLScriptElement>(
				`script[data-pagefind-ui="true"][src="${src}"]`
			);

			const handleLoad = () => resolve();
			const handleError = () => reject(new Error(`Failed to load ${src}`));

			if (existing) {
				existing.addEventListener('load', handleLoad, { once: true });
				existing.addEventListener('error', handleError, { once: true });
				return;
			}

			const script = document.createElement('script');
			script.src = src;
			script.async = true;
			script.dataset.pagefindUi = 'true';
			script.addEventListener('load', handleLoad, { once: true });
			script.addEventListener('error', handleError, { once: true });
			document.head.append(script);
		});

	onMount(() => {
		let cancelled = false;
		let drawerObserver: MutationObserver | undefined;
		let resultClickHosts: HTMLElement[] = [];
		let keydownHosts: HTMLElement[] = [];

		const syncResultClickHosts = (target: HTMLElement) => {
			const nextHosts = [target, resultsHost].filter(
				(host): host is HTMLElement => host instanceof HTMLElement
			);

			for (const host of resultClickHosts) {
				if (!nextHosts.includes(host)) {
					host.removeEventListener('click', handleResultClick);
				}
			}

			for (const host of nextHosts) {
				if (!resultClickHosts.includes(host)) {
					host.addEventListener('click', handleResultClick);
				}
			}

			resultClickHosts = nextHosts;
		};

		const syncKeyboardNavigationHosts = (target: HTMLElement) => {
			if (!enableKeyboardNavigation) {
				return;
			}

			const nextHosts = [target, resultsHost].filter(
				(host): host is HTMLElement => host instanceof HTMLElement
			);

			for (const host of keydownHosts) {
				if (!nextHosts.includes(host)) {
					host.removeEventListener('keydown', handleKeyboardNavigation);
				}
			}

			for (const host of nextHosts) {
				if (!keydownHosts.includes(host)) {
					host.addEventListener('keydown', handleKeyboardNavigation);
				}
			}

			keydownHosts = nextHosts;
		};

		const initSearch = async () => {
			try {
				ensureStylesheet(`${bundlePath}pagefind-ui.css`);
				await loadScript(`${bundlePath}pagefind-ui.js`);

				if (cancelled) {
					return;
				}

				const target = searchMount;
				const PagefindUI = (window as PagefindWindow).PagefindUI;

				if (!target || !PagefindUI) {
					throw new Error('Pagefind UI is unavailable');
				}

				target.innerHTML = '';

				pagefindUi = new PagefindUI({
					element: target,
					bundlePath,
					baseUrl,
					showImages: false,
					showSubResults: false,
					showEmptyFilters: false,
					autofocus,
					translations: {
						placeholder
					}
				});

				moveDrawerToResultsHost(target);
				hideBuiltInFilterPanel(target);
				syncSearchInput(target);
				applySelectedCategories();
				syncResultClickHosts(target);
				syncKeyboardNavigationHosts(target);

				drawerObserver = new MutationObserver(() => {
					syncSearchInput(target);
					if (splitResults && resultsHost) {
						moveDrawerToResultsHost(target);
					}
					hideBuiltInFilterPanel(target);
					syncResultClickHosts(target);
					syncKeyboardNavigationHosts(target);
				});
				drawerObserver.observe(target.parentElement ?? target, {
					childList: true,
					subtree: true
				});

				status = 'ready';
			} catch (error) {
				console.error(error);
				if (!cancelled) {
					status = 'missing';
				}
			}
		};

		void initSearch();

		return () => {
			cancelled = true;
			if (searchStateTimer) {
				clearTimeout(searchStateTimer);
			}
			drawerObserver?.disconnect();
			for (const host of resultClickHosts) {
				host.removeEventListener('click', handleResultClick);
			}
			for (const host of keydownHosts) {
				host.removeEventListener('keydown', handleKeyboardNavigation);
			}
			searchInput?.removeEventListener('input', handleSearchInput);
			searchInput = undefined;
			pagefindUi?.destroy();
			pagefindUi = null;
			void pagefindApi?.destroy();
			pagefindApi = null;
		};
	});

	$effect(() => {
		const selectedCategoryKey = selectedCategories.join('\u0000');
		void selectedCategoryKey;
		void locale;
		void refreshSearchData();
		applySelectedCategories();
	});
</script>

<div
	class={`search-panel ${panelClass}`.trim()}
	role="search"
	aria-label={ariaLabel}
	data-split-results={splitResults ? 'true' : 'false'}
>
	<div class="search-shell">
		<div bind:this={searchMount}></div>
		{#if splitResults}
			<div class="search-results-host" bind:this={resultsHost}></div>
		{/if}
	</div>

	{#if status === 'loading'}
		<p class="search-status" data-state="loading">{statusMessages.loading}</p>
	{:else if status === 'missing'}
		<div class="search-status" data-state="missing">
			<p>{statusMessages.missingTitle}</p>
			<p class="search-hint">
				{statusMessages.missingHint}
			</p>
		</div>
	{/if}
</div>
