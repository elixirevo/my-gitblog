import {
	getConfiguredLocales,
	isTranslationLocale,
	normalizeLocale,
	sourceLocale,
	type Locale
} from '$lib/locales';

export type { Locale } from '$lib/locales';

export type UiCopy = {
	nav: {
		searchButton: string;
		searchAriaLabel: string;
		localeSwitch: string;
	};
	home: {
		allCategory: string;
		emptyState: string;
		viewAll: string;
	};
	article: {
		backToArchive: string;
		continueReading: string;
		relatedTitle: string;
		contents: string;
	};
	comments: {
		label: string;
		title: string;
		emptyMessage: string;
		pendingMessage: string;
	};
	search: {
		eyebrow: string;
		title: string;
		description: string;
		placeholder: string;
		ariaLabel: string;
		loading: string;
		missingTitle: string;
		missingHint: string;
	};
	modal: {
		close: string;
		categories: string;
		select: string;
		navigate: string;
	};
	footer: {
		rss: string;
	};
};

const englishUiCopy: UiCopy = {
	nav: {
		searchButton: 'Search',
		searchAriaLabel: 'Open search',
		localeSwitch: 'Language'
	},
	home: {
		allCategory: 'All',
		emptyState: 'No entries in this section yet.',
		viewAll: 'View all'
	},
	article: {
		backToArchive: 'Back to archive',
		continueReading: 'Continue reading',
		relatedTitle: 'More posts',
		contents: 'Contents'
	},
	comments: {
		label: 'Conversation',
		title: 'Join the discussion',
		pendingMessage: 'Comments are being prepared. Please check back soon.',
		emptyMessage:
			'Fill in `PUBLIC_GISCUS_REPO`, `PUBLIC_GISCUS_REPO_ID`, `PUBLIC_GISCUS_CATEGORY`, and `PUBLIC_GISCUS_CATEGORY_ID` in `.env.production` to enable comments.'
	},
	search: {
		eyebrow: 'Search',
		title: 'Search the archive',
		description:
			'Search across translated titles, descriptions, and article bodies. Category filters are computed directly from the Pagefind index.',
		placeholder: 'Search the archive',
		ariaLabel: 'Archive search',
		loading: 'Loading the search index.',
		missingTitle: 'Pagefind index not found yet.',
		missingHint: 'For local verification, run `bun run build` and then `bun run preview`.'
	},
	modal: {
		close: 'Close search',
		categories: 'Categories',
		select: 'Select',
		navigate: 'Navigate'
	},
	footer: {
		rss: 'RSS'
	}
};

const uiCopy: Record<string, UiCopy> = {
	ar: {
		...englishUiCopy,
		nav: {
			searchButton: 'بحث',
			searchAriaLabel: 'فتح البحث',
			localeSwitch: 'اللغة'
		},
		home: {
			allCategory: 'الكل',
			emptyState: 'لا توجد مقالات في هذا القسم بعد.',
			viewAll: 'عرض الكل'
		},
		article: {
			backToArchive: 'العودة إلى الأرشيف',
			continueReading: 'متابعة القراءة',
			relatedTitle: 'مقالات أخرى',
			contents: 'المحتويات'
		},
		search: {
			...englishUiCopy.search,
			title: 'البحث في الأرشيف',
			placeholder: 'البحث في الأرشيف',
			ariaLabel: 'البحث في الأرشيف',
			loading: 'يتم تحميل فهرس البحث.'
		}
	},
	en: englishUiCopy,
	ja: {
		...englishUiCopy,
		nav: {
			searchButton: '検索',
			searchAriaLabel: '検索を開く',
			localeSwitch: '言語'
		},
		home: {
			allCategory: 'すべて',
			emptyState: 'このセクションにはまだ記事がありません。',
			viewAll: 'すべて表示'
		},
		article: {
			backToArchive: 'アーカイブへ戻る',
			continueReading: '続きを読む',
			relatedTitle: '他の記事',
			contents: '目次'
		},
		search: {
			...englishUiCopy.search,
			title: 'アーカイブ検索',
			placeholder: 'アーカイブ検索',
			ariaLabel: 'アーカイブ検索',
			loading: '検索インデックスを読み込んでいます。'
		}
	},
	ko: {
		nav: {
			searchButton: '검색',
			searchAriaLabel: '글 검색 열기',
			localeSwitch: '언어'
		},
		home: {
			allCategory: '전체',
			emptyState: '아직 이 섹션에는 글이 없습니다.',
			viewAll: '전체 보기'
		},
		article: {
			backToArchive: '아카이브로 돌아가기',
			continueReading: 'Continue reading',
			relatedTitle: '다음 글도 준비되어 있습니다',
			contents: '목차'
		},
		comments: {
			label: 'Conversation',
			title: '의견을 남겨보세요',
			pendingMessage: '댓글 서비스를 준비 중입니다. 잠시 후 다시 방문해 주세요.',
			emptyMessage:
				'`.env.production`에 `PUBLIC_GISCUS_REPO`, `PUBLIC_GISCUS_REPO_ID`, `PUBLIC_GISCUS_CATEGORY`, `PUBLIC_GISCUS_CATEGORY_ID`를 채우면 댓글이 활성화됩니다.'
		},
		search: {
			eyebrow: 'Search',
			title: '아카이브 검색',
			description:
				'제목, 설명, 본문 전체를 기준으로 검색합니다. 카테고리 필터는 Pagefind 인덱스에서 바로 계산됩니다.',
			placeholder: '아카이브 검색',
			ariaLabel: '아카이브 검색',
			loading: '검색 인덱스를 불러오는 중입니다.',
			missingTitle: 'Pagefind 인덱스를 아직 찾지 못했습니다.',
			missingHint: '로컬에서는 `bun run build` 후 `bun run preview`에서 검색을 확인할 수 있습니다.'
		},
		modal: {
			close: '검색 닫기',
			categories: '카테고리',
			select: '선택',
			navigate: '이동'
		},
		footer: {
			rss: 'RSS'
		}
	},
	zh: {
		...englishUiCopy,
		nav: {
			searchButton: '搜索',
			searchAriaLabel: '打开搜索',
			localeSwitch: '语言'
		},
		home: {
			allCategory: '全部',
			emptyState: '此部分还没有文章。',
			viewAll: '查看全部'
		},
		article: {
			backToArchive: '返回归档',
			continueReading: '继续阅读',
			relatedTitle: '更多文章',
			contents: '目录'
		},
		search: {
			...englishUiCopy.search,
			title: '搜索归档',
			placeholder: '搜索归档',
			ariaLabel: '搜索归档',
			loading: '正在加载搜索索引。'
		}
	}
};

export const getUiCopy = (locale: Locale): UiCopy =>
	uiCopy[normalizeLocale(locale)] ??
	uiCopy[normalizeLocale(locale).split('-')[0] ?? ''] ??
	englishUiCopy;

export const getLocaleFromPathname = (pathname: string): Locale => {
	const segment = pathname.split('/').filter(Boolean)[0];

	return isTranslationLocale(segment) ? normalizeLocale(segment) : sourceLocale;
};

const stripLocalePrefix = (pathname: string): string => {
	const segments = pathname.split('/').filter(Boolean);

	if (isTranslationLocale(segments[0])) {
		const stripped = `/${segments.slice(1).join('/')}`;
		return stripped === '/' ? '/' : stripped;
	}

	return pathname || '/';
};

export const toLocalePathname = (pathname: string, locale: Locale): string => {
	const normalized = stripLocalePrefix(pathname);

	if (normalizeLocale(locale) === sourceLocale) {
		return normalized;
	}

	return normalized === '/' ? `/${locale}/` : `/${locale}${normalized}`;
};

export const stripBasePath = (pathname: string, basePath: string): string => {
	if (basePath !== '' && pathname.startsWith(basePath)) {
		return pathname.slice(basePath.length) || '/';
	}

	return pathname || '/';
};

export const withBasePath = (pathname: string, basePath: string): string =>
	basePath === '' ? pathname : `${basePath}${pathname === '/' ? '/' : pathname}`;

export const getPreferredLocale = (languages: readonly string[]): Locale => {
	const configuredLocales = getConfiguredLocales();

	for (const language of languages) {
		const normalized = normalizeLocale(language, '');
		const base = normalized.split('-')[0] ?? normalized;
		const matchedLocale = configuredLocales.find(
			(locale) => locale === normalized || locale.split('-')[0] === base
		);

		if (matchedLocale) {
			return matchedLocale;
		}
	}

	return sourceLocale;
};

export const isLocale = (value: string): value is Locale =>
	getConfiguredLocales().includes(normalizeLocale(value));
