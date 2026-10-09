import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const buildDir = path.join(projectRoot, 'build');
const manifestFile = path.join(buildDir, '.well-known', 'blog-hub.json');
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ulidPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/;

const assert = (condition, message) => {
	if (!condition) {
		throw new Error(`Blog Hub contract validation failed: ${message}`);
	}
};

const isPostId = (value) => uuidPattern.test(value) || ulidPattern.test(value);
const getElement = (xml, name) =>
	xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([^<]*)</${name}>`))?.[1] ?? '';
const unescapeXml = (value) =>
	value.replace(/&(amp|lt|gt|quot|apos);/g, (entity) => {
		const entities = {
			'&amp;': '&',
			'&lt;': '<',
			'&gt;': '>',
			'&quot;': '"',
			'&apos;': "'"
		};

		return entities[entity] ?? entity;
	});

const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
assert(manifest.schemaVersion === 1, 'manifest schemaVersion must be 1');
assert(typeof manifest.enabled === 'boolean', 'manifest enabled must be boolean');
assert(typeof manifest.repository === 'string', 'manifest repository must be a string');
assert(
	!manifest.enabled || /^[^/\s]+\/[^/\s]+$/.test(manifest.repository),
	'enabled manifest needs owner/repository'
);
assert(
	typeof manifest.sourceLocale === 'string' && manifest.sourceLocale !== '',
	'sourceLocale is required'
);
assert(Array.isArray(manifest.feeds) && manifest.feeds.length > 0, 'at least one feed is required');

const siteUrl = new URL(manifest.siteUrl);
const feedLocales = new Set();
const feeds = new Map();

for (const feed of manifest.feeds) {
	assert(typeof feed.locale === 'string' && feed.locale !== '', 'feed locale is required');
	assert(!feedLocales.has(feed.locale), `duplicate feed locale ${feed.locale}`);
	feedLocales.add(feed.locale);

	const feedUrl = new URL(feed.url);
	assert(feedUrl.origin === siteUrl.origin, `feed ${feed.locale} must use the site origin`);
	assert(
		feedUrl.pathname.startsWith(siteUrl.pathname),
		`feed ${feed.locale} must be under siteUrl`
	);

	const relativePath = decodeURIComponent(feedUrl.pathname.slice(siteUrl.pathname.length));
	const feedFile = path.join(buildDir, relativePath);
	const xml = await readFile(feedFile, 'utf8');
	assert(
		xml.includes('xmlns:hub="https://gitblog.dev/ns/hub/1.0"'),
		`feed ${feed.locale} is missing the Hub namespace`
	);
	assert(
		getElement(xml, 'hub:schemaVersion') === '1',
		`feed ${feed.locale} schemaVersion must be 1`
	);

	const ids = new Set();
	const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

	for (const item of items) {
		const id = unescapeXml(getElement(item, 'hub:postId'));
		const guid = unescapeXml(getElement(item, 'guid'));
		const locale = unescapeXml(getElement(item, 'hub:locale'));
		const sourceLocale = unescapeXml(getElement(item, 'hub:sourceLocale'));
		const giscusTerm = unescapeXml(getElement(item, 'hub:giscusTerm'));
		const expectedTerm = `giscus-post-${createHash('sha256').update(id).digest('hex').slice(0, 16)}`;

		assert(isPostId(id), `feed ${feed.locale} has invalid post ID ${id}`);
		assert(!ids.has(id), `feed ${feed.locale} repeats post ID ${id}`);
		assert(guid === id, `feed ${feed.locale} guid must match post ID ${id}`);
		assert(
			item.includes(`<guid isPermaLink="false">${id}</guid>`),
			`feed ${feed.locale} guid ${id} must not be a permalink`
		);
		assert(locale === feed.locale, `post ${id} locale must match feed ${feed.locale}`);
		assert(sourceLocale === manifest.sourceLocale, `post ${id} has the wrong source locale`);
		assert(giscusTerm === expectedTerm, `post ${id} has an unstable giscus term`);

		const cover = unescapeXml(getElement(item, 'hub:cover'));
		if (cover !== '') {
			assert(
				['http:', 'https:'].includes(new URL(cover).protocol),
				`post ${id} cover must be absolute`
			);
		}

		const updated = unescapeXml(getElement(item, 'hub:updated'));
		if (updated !== '') {
			assert(!Number.isNaN(Date.parse(updated)), `post ${id} has an invalid updated time`);
		}

		ids.add(id);
	}

	feeds.set(feed.locale, ids);
}

assert(feedLocales.has(manifest.sourceLocale), 'source locale feed is missing');
const sourceIds = feeds.get(manifest.sourceLocale);

for (const [locale, ids] of feeds) {
	if (locale === manifest.sourceLocale) {
		continue;
	}

	for (const id of ids) {
		assert(sourceIds.has(id), `translated feed ${locale} has unknown source post ID ${id}`);
	}
}

console.log(
	`Blog Hub contract valid. enabled=${manifest.enabled} feeds=${feeds.size} source_posts=${sourceIds.size}`
);
