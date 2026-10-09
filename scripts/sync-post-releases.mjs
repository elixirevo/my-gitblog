import { loadEnvFile } from './lib/env.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const githubApiBaseUrl = 'https://api.github.com';

loadEnvFile(path.join(projectRoot, '.env.production'));

const normalizeLocale = (value, fallback = 'ko') => {
	const normalized = value?.trim().replaceAll('_', '-').toLowerCase() ?? '';

	return normalized === '' ? fallback : normalized;
};

const parseLocaleList = (value) =>
	(value ?? '')
		.split(',')
		.map((locale) => normalizeLocale(locale, ''))
		.filter(Boolean);

const sourceLocale = normalizeLocale(process.env.PUBLIC_SOURCE_LOCALE, 'ko');
const releaseLocale = normalizeLocale(
	process.env.PUBLIC_RELEASE_LOCALE,
	parseLocaleList(
		process.env.PUBLIC_TRANSLATION_LOCALES || process.env.PUBLIC_TRANSLATION_LOCALE
	)[0] ?? 'en'
);
const translationDir = path.join(projectRoot, 'content/translations', releaseLocale, 'posts');

const repoFullName = process.env.GITHUB_REPOSITORY?.trim() ?? '';
const githubToken = process.env.GITHUB_TOKEN?.trim() ?? '';
const targetCommitish = process.env.GITHUB_SHA?.trim() ?? 'main';
// Git -z emits literal UTF-8 paths separated by NUL, without C-style quoting.
const changedPostFiles = process.env.CHANGED_POST_FILES_PATH
	? readFileSync(process.env.CHANGED_POST_FILES_PATH, 'utf8').split('\0').filter(Boolean)
	: [];
const releaseUseTranslations = /^(1|true|yes|on)$/i.test(
	process.env.RELEASE_USE_TRANSLATIONS?.trim() ?? ''
);

if (repoFullName === '' || githubToken === '') {
	throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required to sync post releases.');
}

const siteUrl = process.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') ?? '';
try {
	const url = new URL(siteUrl);
	if (
		!['http:', 'https:'].includes(url.protocol) ||
		url.username ||
		url.password ||
		url.search ||
		url.hash
	) {
		throw new Error('Invalid site URL');
	}
} catch {
	throw new Error('Set PUBLIC_SITE_URL in .env.production to the absolute URL of your blog.');
}

const toAbsolutePath = (filePath) =>
	path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath);

const isTruthy = (value) => value !== false;
const hashFragment = (value) => createHash('sha1').update(value).digest('hex').slice(0, 8);
const parseTagString = (value) => {
	const trimmed = value.trim();

	if (trimmed === '') {
		return [];
	}

	if (trimmed.includes('#')) {
		return trimmed.split(/[\s,]+/).filter(Boolean);
	}

	return trimmed.split(',');
};
const normalizeTag = (value) => {
	if (typeof value !== 'string') {
		return null;
	}

	const tag = value.trim().replace(/^#+/, '').trim();

	return tag === '' ? null : tag;
};
const normalizeTags = (tags) => {
	const values = Array.isArray(tags)
		? tags.flatMap((tag) => (typeof tag === 'string' ? parseTagString(tag) : [tag]))
		: typeof tags === 'string'
			? parseTagString(tags)
			: [];
	const seen = new Set();

	return values.map(normalizeTag).filter((tag) => {
		if (!tag || seen.has(tag.toLowerCase())) {
			return false;
		}

		seen.add(tag.toLowerCase());
		return true;
	});
};

const slugToReleaseTag = (slug) => {
	const normalized = slug.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
	const safeFragment = normalized
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');

	if (safeFragment === '') {
		return `post-untitled-${hashFragment(slug)}`;
	}

	if (safeFragment === slug.toLowerCase()) {
		return `post-${safeFragment}`;
	}

	return `post-${safeFragment}-${hashFragment(slug)}`;
};

const encodeSlugForUrl = (slug) =>
	slug
		.split('/')
		.filter(Boolean)
		.map((segment) => encodeURIComponent(segment))
		.join('/');

const readPostDocument = async (filePath, localeFallback) => {
	const raw = await readFile(filePath, 'utf8');
	const { data, content } = matter(raw);
	const title = typeof data.title === 'string' ? data.title.trim() : '';
	const description = typeof data.description === 'string' ? data.description.trim() : '';
	const date = typeof data.date === 'string' ? data.date.trim() : String(data.date ?? '').trim();
	const category =
		typeof data.category === 'string' && data.category.trim() !== '' ? data.category : 'Notes';
	const locale =
		typeof data.locale === 'string' && data.locale.trim() !== '' ? data.locale : localeFallback;

	if (title === '' || description === '' || date === '') {
		throw new Error(`Missing required frontmatter in ${path.relative(projectRoot, filePath)}`);
	}

	return {
		filePath,
		slug: path.basename(filePath, '.md'),
		title,
		description,
		date,
		category,
		tags: normalizeTags(data.tags),
		content: content.trim(),
		locale,
		published: isTruthy(data.published),
		sourcePath: typeof data.sourcePath === 'string' ? data.sourcePath : null
	};
};

const buildSiteUrl = (pathname) => `${siteUrl}/${pathname.replace(/^\/+/, '')}`;

const buildReleaseBody = (post) => {
	const encodedSlug = encodeSlugForUrl(post.slug);
	const postUrl = buildSiteUrl(
		post.locale === sourceLocale ? `/blog/${encodedSlug}` : `/${post.locale}/blog/${encodedSlug}`
	);
	const originalUrl = buildSiteUrl(`/blog/${encodedSlug}`);
	const translatedUrl = buildSiteUrl(`/${releaseLocale}/blog/${encodedSlug}`);
	const lines = [
		post.description,
		'',
		`- Date: ${post.date}`,
		`- Category: ${post.category}`,
		...(post.tags.length > 0 ? [`- Tags: ${post.tags.join(', ')}`] : []),
		`- Locale: ${post.locale}`
	];

	lines.push(`- Published URL: ${postUrl}`);

	if (post.locale !== sourceLocale) {
		lines.push(`- Original URL: ${originalUrl}`);
	}

	if (post.locale === sourceLocale) {
		lines.push(`- ${releaseLocale.toUpperCase()} URL: ${translatedUrl}`);
	}

	lines.push('', '---');

	if (post.content !== '') {
		lines.push('', post.content);
	}

	return lines.join('\n');
};

const requestGitHub = async (pathname, init = {}) => {
	const response = await fetch(`${githubApiBaseUrl}${pathname}`, {
		...init,
		headers: {
			Accept: 'application/vnd.github+json',
			Authorization: `Bearer ${githubToken}`,
			'Content-Type': 'application/json',
			'User-Agent': 'post-release-sync',
			...init.headers
		}
	});

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		throw new Error(`GitHub API request failed (${response.status}): ${await response.text()}`);
	}

	if (response.status === 204) {
		return null;
	}

	return response.json();
};

const upsertRelease = async (post) => {
	const tagName = slugToReleaseTag(post.slug);
	const releasePayload = {
		tag_name: tagName,
		target_commitish: targetCommitish,
		name: post.title,
		body: buildReleaseBody(post),
		draft: !post.published,
		prerelease: false
	};
	const existingRelease = await requestGitHub(
		`/repos/${repoFullName}/releases/tags/${encodeURIComponent(tagName)}`
	);

	if (!existingRelease) {
		await requestGitHub(`/repos/${repoFullName}/releases`, {
			method: 'POST',
			body: JSON.stringify(releasePayload)
		});
		console.log(`Created release ${tagName} from ${path.relative(projectRoot, post.filePath)}`);
		return;
	}

	await requestGitHub(`/repos/${repoFullName}/releases/${existingRelease.id}`, {
		method: 'PATCH',
		body: JSON.stringify(releasePayload)
	});
	console.log(`Updated release ${tagName} from ${path.relative(projectRoot, post.filePath)}`);
};

if (changedPostFiles.length === 0) {
	console.log('No changed source posts found. Skipping release sync.');
	process.exit(0);
}

const syncedSlugs = new Set();

for (const changedFile of changedPostFiles) {
	const sourceFile = toAbsolutePath(changedFile);
	const slug = path.basename(sourceFile, '.md');

	if (syncedSlugs.has(slug)) {
		continue;
	}

	syncedSlugs.add(slug);

	const translationFile = path.join(translationDir, `${slug}.md`);
	const releaseSourceFile =
		releaseUseTranslations && (await Bun.file(translationFile).exists())
			? translationFile
			: sourceFile;
	const releaseSourceLocale = releaseSourceFile === translationFile ? releaseLocale : sourceLocale;
	const post = await readPostDocument(releaseSourceFile, releaseSourceLocale);

	await upsertRelease(post);
}
