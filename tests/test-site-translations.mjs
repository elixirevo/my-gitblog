import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, copyFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = await mkdtemp(path.join(os.tmpdir(), 'gitblog-site-translations-'));
const output = path.join(fixture, 'content/translations/en/site.json');
const calls = path.join(fixture, 'requests.jsonl');
const env = Object.fromEntries(
	Object.entries(process.env).filter(
		([key]) => !key.startsWith('PUBLIC_') && !key.startsWith('DEEPL_')
	)
);
const run = () =>
	execFileSync(
		process.execPath,
		['--preload', './mock-deepl.mjs', './scripts/translate-posts.mjs'],
		{ cwd: fixture, env, encoding: 'utf8' }
	);
try {
	await mkdir(path.join(fixture, 'content/posts'), { recursive: true });
	await mkdir(path.join(fixture, 'scripts/lib'), { recursive: true });
	await copyFile(path.join(root, 'scripts/lib/env.mjs'), path.join(fixture, 'scripts/lib/env.mjs'));
	await copyFile(
		path.join(root, 'scripts/translate-posts.mjs'),
		path.join(fixture, 'scripts/translate-posts.mjs')
	);
	await symlink(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
	await writeFile(
		path.join(fixture, 'mock-deepl.mjs'),
		`
import { appendFileSync } from 'node:fs';
globalThis.fetch = async (url, init) => {
 if (!String(url).startsWith('https://api-free.deepl.com/')) throw new Error('Unexpected URL');
 const body = JSON.parse(init.body);
 if (body.text.some(text => text === '')) throw new Error('Empty text sent to DeepL');
 appendFileSync('requests.jsonl', JSON.stringify(body.text) + '\\n');
 return Response.json({ translations: body.text.map(text => ({ text: 'Translated: ' + text })) });
};
`
	);
	await writeFile(
		path.join(fixture, '.env.production'),
		'PUBLIC_SOURCE_LOCALE=ko\nPUBLIC_TRANSLATION_LOCALES=en\nPUBLIC_SITE_TAGLINE="원본 소개"\nPUBLIC_SITE_DESCRIPTION="원본 설명"\nPUBLIC_SITE_FOOTER=\n'
	);
	env.DEEPL_API_KEY = 'fixture:fx';
	run();
	let translated = JSON.parse(await readFile(output, 'utf8'));
	assert.equal(translated.tagline, 'Translated: 원본 소개');
	assert.equal(translated.description, 'Translated: 원본 설명');
	assert.equal(translated.footer, '');
	assert.equal(translated.locale, 'en');
	assert.deepEqual(JSON.parse((await readFile(calls, 'utf8')).trim()), ['원본 소개', '원본 설명']);
	run();
	assert.equal(
		(await readFile(calls, 'utf8')).trim().split('\n').length,
		1,
		'unchanged copy must not be translated again'
	);

	// Clearing optional copy overwrites stale translations without requiring a DeepL key.
	await writeFile(
		path.join(fixture, '.env.production'),
		'PUBLIC_SOURCE_LOCALE=ko\nPUBLIC_TRANSLATION_LOCALES=en\nPUBLIC_SITE_TAGLINE=\nPUBLIC_SITE_DESCRIPTION=\nPUBLIC_SITE_FOOTER=\n'
	);
	delete env.DEEPL_API_KEY;
	run();
	translated = JSON.parse(await readFile(output, 'utf8'));
	for (const field of ['tagline', 'description', 'footer']) assert.equal(translated[field], '');
	assert.equal((await readFile(calls, 'utf8')).trim().split('\n').length, 1);
	console.log(
		'Site translation tests passed without a source site.json: environment copy, empty fields, unchanged copy, clearing stale translations.'
	);
} finally {
	await rm(fixture, { recursive: true, force: true });
}
