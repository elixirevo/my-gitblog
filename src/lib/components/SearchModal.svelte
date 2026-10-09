<script lang="ts">
	import PagefindSearch from '$lib/components/PagefindSearch.svelte';
	import type { Locale, UiCopy } from '$lib/i18n';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		locale: Locale;
		ui: UiCopy;
	}

	type ModalSearchState = {
		query: string;
		categoryCounts: Record<string, number>;
	};

	let { isOpen, onClose, locale, ui }: Props = $props();

	let dialog: HTMLDialogElement;
	let selectedCategory = $state<string | null>(null);
	const selectedCategories = $derived(selectedCategory ? [selectedCategory] : []);
	let searchState = $state<ModalSearchState>({
		query: '',
		categoryCounts: {}
	});

	const visibleCategories = $derived.by(() => {
		return Array.from(
			new Set([...Object.keys(searchState.categoryCounts), ...selectedCategories])
		).sort((left, right) => {
			const countDiff =
				(searchState.categoryCounts[right] ?? 0) - (searchState.categoryCounts[left] ?? 0);
			return countDiff || left.localeCompare(right);
		});
	});

	$effect(() => {
		if (isOpen) {
			dialog?.showModal();
			document.body.style.overflow = 'hidden';
		} else {
			dialog?.close();
			document.body.style.overflow = '';
		}
	});

	const resetModalState = () => {
		selectedCategory = null;
		searchState = {
			query: '',
			categoryCounts: {}
		};
	};

	const handleClose = () => {
		resetModalState();
		onClose();
	};

	const handleSearchStateChange = (state: ModalSearchState) => {
		searchState = state;
	};

	const toggleCategory = (category: string) => {
		selectedCategory = selectedCategory === category ? null : category;
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			handleClose();
		}
	};

	const handleBackdropClick = (e: MouseEvent) => {
		if (e.target === dialog) {
			handleClose();
		}
	};
</script>

<dialog
	bind:this={dialog}
	onclose={handleClose}
	onkeydown={handleKeydown}
	onclick={handleBackdropClick}
	class="search-modal"
>
	<div class="modal-box">
		<div class="search-content">
			{#if isOpen}
				<div class="search-frame">
					<span class="material-symbols-outlined search-icon" data-icon="search">search</span>
					<PagefindSearch
						splitResults={true}
						{locale}
						panelClass="search-panel--modal"
						{selectedCategories}
						placeholder={ui.search.placeholder}
						ariaLabel={ui.search.ariaLabel}
						autofocus={true}
						enableKeyboardNavigation={true}
						onSearchStateChange={handleSearchStateChange}
						onResultNavigate={handleClose}
						statusMessages={{
							loading: ui.search.loading,
							missingTitle: ui.search.missingTitle,
							missingHint: ui.search.missingHint
						}}
					/>
					<button class="esc-btn" onclick={handleClose} aria-label={ui.modal.close}>ESC</button>
				</div>
			{/if}
		</div>

		{#if isOpen && visibleCategories.length > 0}
			<div class="category-suggestions">
				<h4>{ui.modal.categories}</h4>
				<div class="category-tags">
					{#each visibleCategories as category (category)}
						<button
							type="button"
							class="category-tag"
							data-active={selectedCategory === category ? 'true' : 'false'}
							aria-pressed={selectedCategory === category}
							onclick={() => toggleCategory(category)}
						>
							<span>{category}</span>
							{#if searchState.categoryCounts[category]}
								<span class="category-count">{searchState.categoryCounts[category]}</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<div class="modal-footer">
			<div class="footer-actions">
				<div class="action-item">
					<span class="material-symbols-outlined">keyboard_return</span>
					<span>{ui.modal.select}</span>
				</div>
				<div class="action-item">
					<span class="material-symbols-outlined">swap_vert</span>
					<span>{ui.modal.navigate}</span>
				</div>
			</div>
		</div>
	</div>
</dialog>

<style>
	.search-modal {
		position: fixed;
		inset: 0;
		padding: 0;
		margin: 0;
		max-width: none;
		max-height: none;
		width: 100vw;
		height: 100vh;
		background: transparent;
		border: none;
		padding: 2rem 1rem;
	}

	.search-modal[open] {
		display: flex;
		align-items: flex-start;
		justify-content: center;
	}

	.search-modal::backdrop {
		background: rgba(12, 15, 15, 0.3);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	:global(html.dark) .search-modal::backdrop {
		background: rgba(0, 0, 0, 0.5);
	}

	.modal-box {
		--search-modal-input-height: 4.25rem;
		--search-modal-icon-left: 1.25rem;
		--search-modal-icon-size: 1.25rem;
		--search-modal-input-gap: 1rem;
		--search-modal-esc-right: 1.5rem;
		--search-modal-esc-safe-width: 3rem;
		--search-modal-esc-gap: 1rem;
		--search-modal-height-scale: 0.8;

		position: relative;
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 36rem;
		height: min(
			calc(42rem * var(--search-modal-height-scale)),
			calc((100dvh - 4rem) * var(--search-modal-height-scale))
		);
		background-color: var(--bg);
		border: 1px solid var(--border-strong);
		border-radius: 1rem;
		box-shadow: 0 40px 80px -15px rgba(0, 0, 0, 0.4);
		padding: 0;
		overflow: hidden;
		opacity: 0;
		transform: translateY(16px) scale(0.98);
		animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	.search-frame {
		position: relative;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.search-content {
		display: flex;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.search-frame :global(.search-panel--modal) {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	.search-frame :global(.search-panel--modal .search-shell) {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		height: 100%;
	}

	.search-frame :global(.search-panel--modal .pagefind-ui) {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		height: 100%;
	}

	.search-frame :global(.search-panel--modal .pagefind-ui__form) {
		min-height: var(--search-modal-input-height);
		display: flex;
		align-items: center;
		padding-left: calc(
			var(--search-modal-icon-left) + var(--search-modal-icon-size) + var(--search-modal-input-gap)
		);
		padding-right: calc(
			var(--search-modal-esc-right) + var(--search-modal-esc-safe-width) +
				var(--search-modal-esc-gap)
		);
		background-color: var(--bg);
		border-bottom: 1px solid var(--border-light);
	}

	.search-frame :global(.search-panel--modal .pagefind-ui__search-input) {
		font-family: 'Crimson Pro', serif;
		font-size: 1.05rem;
		line-height: 1.4;
	}

	.search-frame :global(.search-panel--modal .search-results-host) {
		display: flex;
		flex: 1;
		min-height: 0;
		background-color: var(--bg);
	}

	.search-frame :global(.search-panel--modal .search-results-host .pagefind-ui__drawer) {
		flex: 1;
		min-height: 0;
		height: 100%;
		max-height: none;
		padding: 1.25rem 1.5rem;
		overflow-y: auto;
	}

	.search-frame
		:global(.search-panel--modal .search-results-host .pagefind-ui__result:first-child) {
		padding-top: 0;
		border-top: none;
	}

	.search-frame :global(.search-panel--modal .search-status) {
		margin: 0;
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--border-light);
		background-color: var(--bg);
	}

	.search-frame :global(.search-panel--modal .pagefind-ui__message) {
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
	}

	.search-icon {
		position: absolute;
		top: calc(var(--search-modal-input-height) / 2);
		left: var(--search-modal-icon-left);
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--search-modal-icon-size);
		height: var(--search-modal-input-height);
		color: var(--text-dim);
		pointer-events: none;
		z-index: 10;
		font-size: var(--search-modal-icon-size);
		line-height: 1;
		transform: translateY(-50%);
	}

	.esc-btn {
		position: absolute;
		top: calc(var(--search-modal-input-height) / 2);
		right: var(--search-modal-esc-right);
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-component);
		border: 1px solid var(--border-light);
		color: var(--text-dim);
		border-radius: 0.25rem;
		padding: 0.25rem 0.375rem;
		font-family: 'Inter', sans-serif;
		font-size: 0.625rem;
		font-weight: 700;
		line-height: 1;
		cursor: pointer;
		transition: all 0.2s ease;
		transform: translateY(-50%);
		z-index: 10;
	}

	.esc-btn:hover {
		color: var(--text);
		background-color: var(--border-dim);
	}

	@media (min-width: 768px) {
		.search-modal {
			padding: 6rem 1.5rem;
		}

		.modal-box {
			--search-modal-input-height: 4.5rem;
			--search-modal-icon-left: 1.5rem;
			--search-modal-icon-size: 1.375rem;
			--search-modal-input-gap: 1.125rem;
			--search-modal-esc-safe-width: 3.25rem;
			height: min(
				calc(46rem * var(--search-modal-height-scale)),
				calc((100dvh - 12rem) * var(--search-modal-height-scale))
			);
		}
	}

	.category-suggestions {
		padding: 1.5rem 1.5rem;
		border-top: 1px solid var(--border-light);
	}

	.category-suggestions h4 {
		font-family: 'Inter', sans-serif;
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		font-weight: 700;
		color: var(--text-light);
		margin-bottom: 1rem;
	}

	.category-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.category-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background-color: var(--bg-component);
		color: var(--text-dim);
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-family: 'Inter', sans-serif;
		font-size: 0.75rem;
		font-weight: 500;
		border: 1px solid transparent;
		cursor: pointer;
		appearance: none;
		transition:
			background-color 0.2s,
			color 0.2s,
			border-color 0.2s;
	}

	.category-tag:hover {
		border-color: var(--border-light);
		color: var(--text);
	}

	.category-tag[data-active='true'] {
		background-color: var(--text);
		border-color: var(--text);
		color: var(--bg);
	}

	.category-tag:focus-visible {
		outline: 2px solid var(--text);
		outline-offset: 2px;
	}

	.category-count {
		font-size: 0.6875rem;
		opacity: 0.75;
	}

	.modal-footer {
		background-color: var(--bg-component);
		padding: 1rem 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-top: 1px solid var(--border-light);
	}

	.footer-actions {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.action-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-light);
	}

	.action-item .material-symbols-outlined {
		font-size: 0.875rem;
	}

	.action-item span:not(.material-symbols-outlined) {
		font-family: 'Inter', sans-serif;
		font-size: 0.625rem;
	}

	@keyframes modalFadeIn {
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
