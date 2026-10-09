<script lang="ts">
	import type { Snippet } from 'svelte';
	import { resolve } from '$app/paths';
	import { getLocaleLabel } from '$lib/locales';
	import type { SiteController } from '$lib/template/contracts';
	import type { ExtensionContext } from '$lib/template/contracts';
	import ExtensionPoint from '$lib/template/ExtensionPoint.svelte';
	let {
		state,
		context,
		children
	}: { state: SiteController; context: ExtensionContext; children: Snippet } = $props();
</script>

<svelte:head><meta name="theme-color" content="#f9f9f9" /></svelte:head>
<div class="app-shell">
	<div class="bg-decorator"></div>

	<nav class="navbar">
		<div class="container">
			<a class="nav-brand" href={resolve(state.homePath as '/')}>
				{state.site.title}
			</a>
			<div class="nav-actions">
				<button
					class="search-box"
					onclick={() => (state.isSearchOpen = true)}
					aria-label={state.ui.nav.searchAriaLabel}
				>
					<span class="material-symbols-outlined" data-icon="search">search</span>
					<span class="ui-font">{state.ui.nav.searchButton}</span>
				</button>
				{#if state.hasLocaleSwitcher}
					<div class="locale-switcher" bind:this={state.localeMenuEl}>
						{#if state.shouldShowLocaleMenu}
							<button
								type="button"
								class="locale-trigger ui-font"
								aria-label={state.ui.nav.localeSwitch}
								aria-haspopup="listbox"
								aria-expanded={state.isLocaleMenuOpen}
								onclick={() => {
									state.isLocaleMenuOpen = !state.isLocaleMenuOpen;
								}}
							>
								<span class="locale-current">{state.currentLocaleLabel}</span>
								<span class="material-symbols-outlined locale-chevron" data-icon="expand_more">
									expand_more
								</span>
							</button>

							{#if state.isLocaleMenuOpen}
								<div class="locale-menu" role="listbox" aria-label={state.ui.nav.localeSwitch}>
									{#each state.localeOptions as localeOption (localeOption)}
										<button
											type="button"
											class="locale-option ui-font"
											role="option"
											aria-selected={localeOption === state.routeLocale}
											data-active={localeOption === state.routeLocale ? 'true' : 'false'}
											onclick={() => state.switchLocale(localeOption)}
										>
											<span>{getLocaleLabel(localeOption)}</span>
										</button>
									{/each}
								</div>
							{/if}
						{:else if state.pairedLocale}
							<button
								type="button"
								class="locale-trigger locale-trigger-single ui-font"
								aria-label={state.ui.nav.localeSwitch}
								onclick={() => {
									if (state.pairedLocale) state.switchLocale(state.pairedLocale);
								}}
							>
								<span class="locale-current">{getLocaleLabel(state.pairedLocale)}</span>
							</button>
						{/if}
					</div>
				{/if}
				<button onclick={state.toggleTheme} aria-label="Toggle theme" class="theme-toggle">
					<span
						class="material-symbols-outlined"
						data-icon={state.isDarkMode ? 'light_mode' : 'dark_mode'}
						>{state.isDarkMode ? 'light_mode' : 'dark_mode'}</span
					>
				</button>
			</div>
		</div>
	</nav>

	<main class="main-content">
		{@render children()}
	</main>

	<footer class="footer">
		<div class="container">
			<span class="footer-copy font-label">
				© {state.currentYear}
				{state.site.title}. {state.site.footer}
			</span>
			<div class="footer-links font-label">
				<a href={resolve(state.currentRssPath as '/rss.xml')}>{state.ui.footer.rss}</a>
				{#each state.site.socialLinks as socialLink (socialLink.href)}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={socialLink.href} target="_blank" rel="noreferrer">{socialLink.label}</a>
				{/each}
			</div>
		</div>
	</footer>
	<ExtensionPoint name="site-footer" {context} />
</div>
