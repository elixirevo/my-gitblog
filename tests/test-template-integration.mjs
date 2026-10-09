import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshotPaths, changedPaths } from '../scripts/lib/preservation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = await mkdtemp(path.join(os.tmpdir(), 'gitblog-theme-integration-'));
const excluded = new Set(['.git', 'node_modules', '.svelte-kit', 'build']);
try {
	await cp(root, fixture, {
		recursive: true,
		filter: (source) =>
			!path
				.relative(root, source)
				.split(path.sep)
				.some((part) => excluded.has(part))
	});
	await symlink(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
	await writeFile(
		path.join(fixture, 'src/lib/extensions/Fixture.svelte'),
		`
<script lang="ts">
 import type { ExtensionContext } from '$lib/template/contracts';
 let { context }: { context: ExtensionContext } = $props();
</script>
<aside data-user-extension="preserved" data-user-post={context.post?.id ?? 'none'}>
 User feature: {context.locale}
</aside>
`
	);
	await writeFile(
		path.join(fixture, 'src/lib/extensions/registry.ts'),
		`
import Fixture from './Fixture.svelte';
import type { BlogExtension } from '$lib/template/contracts';
export const extensions: BlogExtension[] = [{ id: 'fixture', apiVersion: 1, components: {
 'article-before-body': Fixture, 'article-after-body': Fixture, 'site-footer': Fixture
} }];
`
	);
	const css = path.join(fixture, 'src/lib/theme/styles.css');
	await writeFile(
		css,
		`${await readFile(css, 'utf8')}\n:root { --gitblog-user-fixture: preserved; }\n`
	);
	await mkdir(path.join(fixture, 'content/posts'), { recursive: true });
	await mkdir(path.join(fixture, 'static/uploads'), { recursive: true });
	await writeFile(
		path.join(fixture, 'content/posts/preservation-fixture.md'),
		`---
id: 32ac91be-2d4a-4e0a-a83f-a944fbf126d0
title: Preservation fixture
description: Test user extensions and project page assets.
date: 2026-01-01
published: true
cover: /uploads/preservation-fixture.svg
---
## Fixture heading

User content stays unchanged.
`
	);
	await writeFile(
		path.join(fixture, 'static/uploads/preservation-fixture.svg'),
		'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
	);
	const protectedPaths = [
		'content',
		'static',
		'src/lib/theme',
		'src/lib/extensions',
		'.env.production',
		'.pages.yml'
	];
	const before = await snapshotPaths(fixture, protectedPaths);
	const result = spawnSync('bun', ['run', 'build'], {
		cwd: fixture,
		env: {
			...process.env,
			SITE_BASE_PATH: '/preview',
			PUBLIC_SITE_URL: 'https://example.com/preview',
			PUBLIC_SITE_REPOSITORY: 'fixture/blog',
			PUBLIC_GOOGLE_SITE_VERIFICATION: 'preservation-fixture'
		},
		encoding: 'utf8',
		maxBuffer: 10 * 1024 * 1024
	});
	assert.equal(result.status, 0, result.error?.message ?? `${result.stdout}\n${result.stderr}`);
	assert.deepEqual(changedPaths(before, await snapshotPaths(fixture, protectedPaths)), []);
	const home = await readFile(path.join(fixture, 'build/index.html'), 'utf8');
	assert.equal((home.match(/data-user-extension="preserved"/g) ?? []).length, 1);
	assert.match(home, /name="google-site-verification" content="preservation-fixture"/);
	// Linked icons must resolve to emitted files even under a GitHub Pages project path.
	const iconLinks = [...home.matchAll(/<link[^>]+href="([^"]*\/assets\/icons\/[^"]+)"/g)].map(
		(match) => match[1]
	);
	assert.equal(
		iconLinks.length,
		4,
		'all favicon and touch icon links must use the asset directory'
	);
	const manifest = JSON.parse(await readFile(path.join(fixture, 'build/site.webmanifest'), 'utf8'));
	assert.equal(manifest.icons.length, 2);
	for (const url of [...iconLinks, ...manifest.icons.map((icon) => icon.src)]) {
		const pathname = new URL(url, 'https://example.com/preview/').pathname;
		assert.ok(
			pathname.startsWith('/preview/assets/icons/'),
			`icon must include the project base: ${url}`
		);
		const asset = await readFile(path.join(fixture, 'build', pathname.slice('/preview/'.length)));
		assert.ok(asset.length > 0, `icon must be included in the build: ${url}`);
	}
	const article = await readFile(
		path.join(fixture, 'build/blog/preservation-fixture/index.html'),
		'utf8'
	);
	assert.equal((article.match(/data-user-extension="preserved"/g) ?? []).length, 3);
	assert.match(article, /data-user-post="32ac91be-2d4a-4e0a-a83f-a944fbf126d0"/);
	assert.ok(article.indexOf('data-user-extension') < article.indexOf('class="article-content"'));
	assert.ok(
		article.lastIndexOf('data-user-extension') > article.indexOf('class="article-content"')
	);
	const coverPath = article.match(/src="([^"]*uploads\/preservation-fixture\.svg)"/)?.[1];
	assert.ok(coverPath, 'Missing fixture cover image');
	assert.equal(
		new URL(coverPath, 'https://example.com/preview/blog/preservation-fixture/').pathname,
		'/preview/uploads/preservation-fixture.svg'
	);
	const assetDir = path.join(fixture, 'build/_app/immutable/assets');
	const styles = (
		await Promise.all(
			(await readdir(assetDir))
				.filter((name) => name.endsWith('.css'))
				.map((name) => readFile(path.join(assetDir, name), 'utf8'))
		)
	).join('\n');
	assert.match(styles, /--gitblog-user-fixture:\s*preserved/);
	console.log(
		'Template integration passed: user CSS, all extension points, post context, project base path, unchanged source files.'
	);
} finally {
	await rm(fixture, { recursive: true, force: true });
}
