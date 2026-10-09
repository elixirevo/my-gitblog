import type { SiteController } from './contracts';
import { afterNavigate, goto } from '$app/navigation';
import { base, resolve } from '$app/paths';
import { page } from '$app/state';
import {
	getLocaleFromPathname,
	getPreferredLocale,
	getUiCopy,
	isLocale,
	stripBasePath,
	toLocalePathname,
	withBasePath
} from '$lib/i18n';
import { getConfiguredLocales, getLocaleLabel, type Locale } from '$lib/locales';
import { toHomePath, toRssPath } from '$lib/routes';
import { getSiteConfig } from '$lib/site';
import { onMount } from 'svelte';

export function createSiteController(): SiteController {
	// Capture once, matching the existing layout; this is not reactive clock state.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const currentYear = new Date().getFullYear();
	let isDarkMode = $state(false);
	let isSearchOpen = $state(false);
	let isLocaleMenuOpen = $state(false);
	let localeMenuEl = $state<HTMLDivElement | null>(null);

	const localeOptions = getConfiguredLocales();
	const routeLocale = $derived(getLocaleFromPathname(stripBasePath(page.url.pathname, base)));
	const site = $derived(getSiteConfig(routeLocale));
	const ui = $derived(getUiCopy(routeLocale));
	const homePath = $derived(toHomePath(routeLocale));
	const currentLocaleLabel = $derived(getLocaleLabel(routeLocale));
	const hasLocaleSwitcher = $derived(localeOptions.length > 1);
	const shouldShowLocaleMenu = $derived(localeOptions.length > 2);
	const pairedLocale = $derived(
		localeOptions.length === 2
			? (localeOptions.find((localeOption) => localeOption !== routeLocale) ?? null)
			: null
	);
	const currentRssPath = $derived(toRssPath(routeLocale));
	const rssLinks = $derived(
		localeOptions.map((localeOption) => {
			const localeSite = getSiteConfig(localeOption);

			return {
				href: resolve(toRssPath(localeOption) as '/rss.xml'),
				locale: localeOption,
				title:
					localeOptions.length > 1
						? `${localeSite.title} (${getLocaleLabel(localeOption)})`
						: localeSite.title
			};
		})
	);

	const syncThemeFromStorage = () => {
		const prefersDark =
			localStorage.theme === 'dark' ||
			(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

		document.documentElement.classList.toggle('dark', prefersDark);
		isDarkMode = prefersDark;
	};

	afterNavigate(() => {
		isSearchOpen = false;
		isLocaleMenuOpen = false;
		if (typeof document !== 'undefined') {
			document.documentElement.lang = site.language;
		}
	});

	onMount(() => {
		document.documentElement.lang = site.language;
		syncThemeFromStorage();

		const handleDocumentPointerDown = (event: PointerEvent) => {
			if (
				!isLocaleMenuOpen ||
				!localeMenuEl ||
				!(event.target instanceof Node) ||
				localeMenuEl.contains(event.target)
			) {
				return;
			}

			isLocaleMenuOpen = false;
		};

		const handleDocumentKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				isLocaleMenuOpen = false;
			}
		};

		document.addEventListener('pointerdown', handleDocumentPointerDown);
		document.addEventListener('keydown', handleDocumentKeydown);

		const pathname = stripBasePath(window.location.pathname, base);
		const shouldRedirectFromRoot = pathname === '/' || pathname === '';

		if (shouldRedirectFromRoot) {
			const storedLocale = localStorage.getItem('preferredLocale');
			const preferredLocale =
				storedLocale && isLocale(storedLocale)
					? storedLocale
					: getPreferredLocale(window.navigator.languages);

			if (preferredLocale !== routeLocale) {
				const nextPath = withBasePath(toLocalePathname(pathname, preferredLocale), base);
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				void goto(`${nextPath}${window.location.search}${window.location.hash}`, {
					replaceState: true,
					noScroll: true,
					keepFocus: true
				});
			}
		}

		return () => {
			document.removeEventListener('pointerdown', handleDocumentPointerDown);
			document.removeEventListener('keydown', handleDocumentKeydown);
		};
	});

	const toggleTheme = () => {
		isDarkMode = !isDarkMode;
		if (isDarkMode) {
			document.documentElement.classList.add('dark');
			localStorage.theme = 'dark';
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.theme = 'light';
		}
	};

	const persistLocale = (locale: Locale) => {
		localStorage.setItem('preferredLocale', locale);
	};

	const switchLocale = (locale: Locale) => {
		if (!isLocale(locale)) {
			return;
		}

		isLocaleMenuOpen = false;
		persistLocale(locale);
		const nextPath = withBasePath(
			toLocalePathname(stripBasePath(page.url.pathname, base), locale),
			base
		);
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(nextPath, {
			replaceState: false,
			noScroll: true,
			keepFocus: true
		});
	};

	return {
		get currentYear() {
			return currentYear;
		},
		get localeOptions() {
			return localeOptions;
		},
		get routeLocale() {
			return routeLocale;
		},
		get site() {
			return site;
		},
		get ui() {
			return ui;
		},
		get homePath() {
			return homePath;
		},
		get currentLocaleLabel() {
			return currentLocaleLabel;
		},
		get hasLocaleSwitcher() {
			return hasLocaleSwitcher;
		},
		get shouldShowLocaleMenu() {
			return shouldShowLocaleMenu;
		},
		get pairedLocale() {
			return pairedLocale;
		},
		get currentRssPath() {
			return currentRssPath;
		},
		get rssLinks() {
			return rssLinks;
		},
		get isDarkMode() {
			return isDarkMode;
		},
		get isSearchOpen() {
			return isSearchOpen;
		},
		set isSearchOpen(value: boolean) {
			isSearchOpen = value;
		},
		get isLocaleMenuOpen() {
			return isLocaleMenuOpen;
		},
		set isLocaleMenuOpen(value: boolean) {
			isLocaleMenuOpen = value;
		},
		get localeMenuEl() {
			return localeMenuEl;
		},
		set localeMenuEl(value: HTMLDivElement | null) {
			localeMenuEl = value;
		},
		toggleTheme,
		switchLocale
	};
}
