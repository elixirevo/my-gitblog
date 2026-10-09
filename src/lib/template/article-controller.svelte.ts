import type { ArticleController } from './contracts';
import { onMount, tick } from 'svelte';

export function createArticleController(getHtml: () => string): ArticleController {
	let headings = $state<{ id: string; text: string; level: number }[]>([]);
	let activeId = $state('post-title');
	let articleContent = $state<HTMLElement>();

	const createHeadingId = (seed: string, index: number, usedIds: Set<string>) => {
		const baseId =
			seed
				.trim()
				.toLocaleLowerCase()
				.normalize('NFKC')
				.replace(/[^\p{Letter}\p{Number}]+/gu, '-')
				.replace(/^-+|-+$/g, '') || `heading-${index + 1}`;
		let id = baseId;
		let suffix = 2;

		while (usedIds.has(id)) {
			id = `${baseId}-${suffix}`;
			suffix += 1;
		}

		usedIds.add(id);
		return id;
	};

	const syncHeadings = () => {
		if (!articleContent) {
			headings = [];
			activeId = 'post-title';
			return;
		}

		// Local deduplication scratch space, not UI state.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const usedIds = new Set<string>();
		const parsedHeadings = Array.from(
			articleContent.querySelectorAll<HTMLHeadingElement>('h2, h3')
		).map((el, index) => {
			const id = createHeadingId(el.id || el.textContent || '', index, usedIds);
			el.id = id;

			return {
				id,
				text: el.textContent || '',
				level: el.tagName === 'H2' ? 2 : 3
			};
		});

		headings = parsedHeadings;

		if (!headings.some((heading) => heading.id === activeId)) {
			activeId = 'post-title';
		}
	};

	$effect(() => {
		const currentArticleHtml = getHtml();
		const currentArticleContent = articleContent;

		if (!currentArticleContent) {
			return;
		}

		void tick().then(() => {
			if (currentArticleHtml === getHtml() && currentArticleContent === articleContent) {
				syncHeadings();
			}
		});
	});

	onMount(() => {
		const handleScroll = () => {
			const scrollPos = window.scrollY + 160;
			const titleEl = document.getElementById('post-title');
			let current = 'post-title';

			if (titleEl && scrollPos >= titleEl.offsetTop) {
				current = 'post-title';
			}

			headings.forEach((heading) => {
				const el = document.getElementById(heading.id);
				if (el && scrollPos >= el.offsetTop) {
					current = heading.id;
				}
			});

			activeId = current;
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		handleScroll();

		return () => window.removeEventListener('scroll', handleScroll);
	});

	const scrollToHeading = (id: string, event: Event) => {
		event.preventDefault();
		const el = document.getElementById(id);
		if (el) {
			const y = el.getBoundingClientRect().top + window.scrollY - 120;
			window.scrollTo({ top: y, behavior: 'smooth' });
			activeId = id;
		}
	};

	return {
		get headings() {
			return headings;
		},
		get activeId() {
			return activeId;
		},
		get element() {
			return articleContent;
		},
		set element(value: HTMLElement | undefined) {
			articleContent = value;
		},
		scrollToHeading
	};
}
