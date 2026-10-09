import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, copyFile, symlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = await mkdtemp(path.join(os.tmpdir(), 'gitblog-post-releases-'));
const git = (...args) =>
	execFileSync('git', args, { cwd: fixture, encoding: 'utf8', stdio: 'pipe' });
const post = (title) =>
	`---\ntitle: ${JSON.stringify(title)}\ndescription: Regression test\ndate: 2026-10-06\npublished: true\n---\nPost body\n`;
const filenames = [
	'2026-10-06-첫-글-작성.md',
	'한글 공백.md',
	'quote"name.md',
	'back\\slash.md',
	'line\nbreak.md'
];
const workflow = await readFile(path.join(root, '.github/workflows/deploy.yml'), 'utf8');
const step = workflow
	.split('      - name: Detect changed source posts\n')[1]
	.split('\n      - name:')[0];
const detect = step
	.split('        run: |\n')[1]
	.split('\n')
	.map((line) => line.replace(/^ {10}/, ''))
	.join('\n');
const listFile = path.join(fixture, 'changed-posts.nul');
const outputFile = path.join(fixture, 'output');
const payloadFile = path.join(fixture, 'payloads.jsonl');
const runDetection = async (before, event = 'push', forced = false) => {
	await writeFile(outputFile, '');
	execFileSync('bash', ['-e', '-o', 'pipefail', '-c', detect], {
		cwd: fixture,
		env: {
			...process.env,
			BEFORE_SHA: before,
			FORCED_PUSH: String(forced),
			GITHUB_SHA: git('rev-parse', 'HEAD').trim(),
			GITHUB_EVENT_NAME: event,
			RUNNER_TEMP: fixture,
			GITHUB_OUTPUT: outputFile
		}
	});
	return (await readFile(listFile, 'utf8')).split('\0').filter(Boolean);
};
try {
	await mkdir(path.join(fixture, 'content/posts'), { recursive: true });
	await mkdir(path.join(fixture, 'scripts/lib'), { recursive: true });
	await copyFile(path.join(root, 'scripts/lib/env.mjs'), path.join(fixture, 'scripts/lib/env.mjs'));
	await copyFile(
		path.join(root, 'scripts/sync-post-releases.mjs'),
		path.join(fixture, 'scripts/sync-post-releases.mjs')
	);
	await symlink(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
	await writeFile(
		path.join(fixture, '.env.production'),
		'PUBLIC_SITE_URL=https://example.com/blog\n'
	);
	git('init', '-q');
	git('config', 'user.name', 'Release test');
	git('config', 'user.email', 'test@example.com');
	git('config', 'core.quotePath', 'true');
	for (const name of filenames)
		await writeFile(path.join(fixture, 'content/posts', name), post(name));
	git('add', '.');
	git('commit', '-qm', 'Initial posts');
	const initial = git('rev-parse', 'HEAD').trim();
	const expected = filenames.map((name) => `content/posts/${name}`);
	assert.deepEqual(
		(await runDetection('0'.repeat(40))).sort(),
		expected.toSorted(),
		'initial commit must preserve literal paths'
	);
	assert.equal(await readFile(outputFile, 'utf8'), 'has_changes=true\n');

	await writeFile(
		path.join(fixture, 'mock-github.mjs'),
		`
 import { appendFileSync } from 'node:fs';
 globalThis.fetch = async (url, init) => {
  if (!String(url).startsWith('https://api.github.com/repos/test/blog/releases')) throw new Error('Unexpected URL');
  if (init.method === 'POST') {
   appendFileSync(process.env.TEST_PAYLOAD_FILE, init.body + '\\n');
   return Response.json({ id: 1 });
  }
  return new Response(null, { status: 404 });
 };
 `
	);
	const releaseEnv = {
		...process.env,
		CHANGED_POST_FILES_PATH: listFile,
		GITHUB_REPOSITORY: 'test/blog',
		GITHUB_TOKEN: 'fixture-token',
		GITHUB_SHA: initial,
		RELEASE_USE_TRANSLATIONS: 'false',
		TEST_PAYLOAD_FILE: payloadFile
	};
	delete releaseEnv.PUBLIC_SITE_URL;
	execFileSync(
		process.execPath,
		[
			'--preload',
			path.join(fixture, 'mock-github.mjs'),
			path.join(fixture, 'scripts/sync-post-releases.mjs')
		],
		{ cwd: fixture, env: releaseEnv }
	);
	const payloads = (await readFile(payloadFile, 'utf8')).trim().split('\n').map(JSON.parse);
	assert.deepEqual(
		payloads.map((payload) => payload.name).sort(),
		filenames.toSorted(),
		'release sync must open each literal path'
	);
	assert.ok(payloads[0].body.includes('https://example.com/blog/'));
	assert.ok(
		payloads
			.find((payload) => payload.name === filenames[0])
			.body.includes(encodeURIComponent(filenames[0].slice(0, -3)))
	);

	await writeFile(path.join(fixture, 'content/posts', filenames[0]), post('Modified Korean post'));
	git('mv', `content/posts/${filenames[1]}`, 'content/posts/새 이름.md');
	git('rm', `content/posts/${filenames[2]}`);
	await writeFile(path.join(fixture, 'unrelated.md'), 'Not a source post');
	git('add', '.');
	git('commit', '-qm', 'Modify rename delete');
	const changed = await runDetection(initial);
	assert.deepEqual(
		changed.sort(),
		[`content/posts/${filenames[0]}`, 'content/posts/새 이름.md'].sort()
	);
	assert.deepEqual(await runDetection(git('rev-parse', 'HEAD').trim()), []);
	assert.equal(await readFile(outputFile, 'utf8'), 'has_changes=false\n');
	assert.deepEqual(
		await runDetection(initial, 'workflow_dispatch'),
		[],
		'manual deploy retains existing no-release behavior'
	);
	assert.deepEqual(
		await runDetection(initial, 'push', true),
		[],
		'forced pushes must not publish releases even when the old commit is available'
	);
	assert.equal(await readFile(outputFile, 'utf8'), 'has_changes=false\n');

	const beforeRewrite = git('rev-parse', 'HEAD').trim();
	const rewritten = git(
		'commit-tree',
		git('rev-parse', 'HEAD^{tree}').trim(),
		'-m',
		'Rewritten history'
	).trim();
	git('reset', '--hard', rewritten);
	assert.deepEqual(
		await runDetection(beforeRewrite),
		[],
		'non-ancestor commits left in the object database must not republish surviving posts'
	);
	git('reflog', 'expire', '--expire=now', '--all');
	git('prune', '--expire=now');
	assert.throws(() => git('cat-file', '-e', `${beforeRewrite}^{commit}`));
	assert.deepEqual(
		await runDetection(beforeRewrite),
		[],
		'a removed before SHA must not fail deployment after a history purge'
	);
	assert.equal(await readFile(outputFile, 'utf8'), 'has_changes=false\n');
	assert.deepEqual(await runDetection(''), [], 'missing before SHA must not fail deployment');

	console.log(
		'Post release regression tests passed: literal paths, root commit, modify/rename/delete, empty/manual runs, forced pushes and removed history.'
	);
} finally {
	await rm(fixture, { recursive: true, force: true });
}
