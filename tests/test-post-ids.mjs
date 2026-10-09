import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const postIdsScript = path.join(scriptDir, '../scripts/post-ids.mjs');
const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'gitblog-post-ids-'));
const sourceDir = path.join(fixtureRoot, 'content/posts');
const translationDir = path.join(fixtureRoot, 'content/translations/en/posts');
const sourceFile = path.join(sourceDir, 'post.md');
const translationFile = path.join(translationDir, 'post.md');
const orphanFile = path.join(translationDir, 'orphan.md');
const fixturePost = `---\ntitle: Fixture\n---\nFixture body\n`;

const run = (mode) =>
	spawnSync(process.execPath, [postIdsScript, mode], {
		encoding: 'utf8',
		env: { ...process.env, POST_IDS_ROOT: fixtureRoot }
	});

const assert = (condition, message) => {
	if (!condition) {
		throw new Error(message);
	}
};

try {
	await mkdir(sourceDir, { recursive: true });
	await mkdir(translationDir, { recursive: true });
	await writeFile(sourceFile, fixturePost);
	await writeFile(translationFile, fixturePost);
	await writeFile(orphanFile, fixturePost);

	const writeResult = run('--write');
	assert(writeResult.status === 0, writeResult.stderr || writeResult.stdout);

	const source = matter(await readFile(sourceFile, 'utf8'));
	const translation = matter(await readFile(translationFile, 'utf8'));
	assert(typeof source.data.id === 'string', 'write mode did not add a source ID');
	assert(translation.data.id === source.data.id, 'translation did not retain the source ID');
	assert(!existsSync(orphanFile), 'write mode did not remove the orphan translation');

	const checkResult = run('--check');
	assert(checkResult.status === 0, checkResult.stderr || checkResult.stdout);

	const mismatched = (await readFile(translationFile, 'utf8')).replace(
		/^id:\s*[^\r\n]+/m,
		`id: ${randomUUID()}`
	);
	await writeFile(translationFile, mismatched);
	const mismatchResult = run('--check');
	assert(
		mismatchResult.status !== 0,
		'check mode accepted an independently changed translation ID'
	);

	console.log('Post ID fixture validation passed.');
} finally {
	await rm(fixtureRoot, { recursive: true, force: true });
}
