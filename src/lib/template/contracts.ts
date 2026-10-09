import type { Component } from 'svelte';
import type { Locale, UiCopy } from '$lib/i18n';
import type { SiteConfig } from '$lib/site';
import type { BlogPost, PostSummary } from '$lib/server/content';

/** Public theme/extension contract. Change incompatibly only with a new API version. */
export type { Locale, UiCopy, SiteConfig, BlogPost, PostSummary };

export interface SiteController {
	readonly currentYear: number;
	readonly localeOptions: Locale[];
	readonly routeLocale: Locale;
	readonly site: SiteConfig;
	readonly ui: UiCopy;
	readonly homePath: string;
	readonly currentLocaleLabel: string;
	readonly hasLocaleSwitcher: boolean;
	readonly shouldShowLocaleMenu: boolean;
	readonly pairedLocale: Locale | null;
	readonly currentRssPath: string;
	readonly rssLinks: { href: string; locale: Locale; title: string }[];
	readonly isDarkMode: boolean;
	isSearchOpen: boolean;
	isLocaleMenuOpen: boolean;
	localeMenuEl: HTMLDivElement | null;
	toggleTheme: () => void;
	switchLocale: (locale: Locale) => void;
}

export interface ArticleController {
	readonly headings: { id: string; text: string; level: number }[];
	readonly activeId: string;
	element: HTMLElement | undefined;
	scrollToHeading: (id: string, event: Event) => void;
}

export interface ArticlePageProps {
	locale: Locale;
	site: SiteConfig;
	ui: UiCopy;
	post: BlogPost;
	availableLocales: Locale[];
	relatedPosts: PostSummary[];
}

export interface HomeViewProps {
	locale: Locale;
	ui: UiCopy;
	categories: string[];
	tags: string[];
	selectedCategory: string;
	activeTag: string | null;
	filteredPosts: PostSummary[];
	onCategorySelect: (category: string) => void;
	onTagToggle: (tag: string) => void;
	onReset: () => void;
}

export interface ExtensionContext {
	site: SiteConfig;
	locale: Locale;
	pathname: string;
	post?: BlogPost;
}

export type ExtensionPointName = 'article-before-body' | 'article-after-body' | 'site-footer';

export interface BlogExtension {
	id: string;
	apiVersion: 1;
	components?: Partial<Record<ExtensionPointName, Component<{ context: ExtensionContext }>>>;
	/** Runs in the browser on page entry; cleanup runs before re-entry and on destruction. */
	onPage?: (context: ExtensionContext) => void | (() => void);
}
