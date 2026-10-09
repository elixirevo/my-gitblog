import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { snapshotPaths, changedPaths } from '../scripts/lib/preservation.mjs';

const root = await mkdtemp(path.join(os.tmpdir(), 'gitblog-preservation-'));
try {
	await mkdir(path.join(root, 'content'), { recursive: true });
	await mkdir(path.join(root, 'theme'), { recursive: true });
	const original =
		'---\r\nid: keep-me\r\ncustom: [one, two]\r\n---\r\n![image](/uploads/a.png)\r\n';
	await writeFile(path.join(root, 'content/post.md'), original);
	await writeFile(path.join(root, 'theme/styles.css'), '.custom { color: red; }');
	await symlink('post.md', path.join(root, 'content/link'));
	const paths = ['content', 'theme', 'new-route'];
	const before = await snapshotPaths(root, paths);
	assert.deepEqual(changedPaths(before, await snapshotPaths(root, paths)), []);
	assert.equal(await readFile(path.join(root, 'content/post.md'), 'utf8'), original);
	await writeFile(path.join(root, 'content/post.md'), original.replace('keep-me', 'changed'));
	await rm(path.join(root, 'theme/styles.css'));
	await rm(path.join(root, 'content/link'));
	await symlink('missing.md', path.join(root, 'content/link'));
	await writeFile(path.join(root, 'new-route'), 'new user page');
	assert.deepEqual(changedPaths(before, await snapshotPaths(root, paths)), [
		'content/link',
		'content/post.md',
		'new-route',
		'theme/styles.css'
	]);
	await assert.rejects(snapshotPaths(root, ['../outside']), /inside the blog/);
	console.log('Preservation fixtures passed: byte changes, deletions, additions, symlinks.');
} finally {
	await rm(root, { recursive: true, force: true });
}
