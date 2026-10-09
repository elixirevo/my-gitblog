import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { snapshotPaths, changedPaths } from './lib/preservation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const policy = JSON.parse(
	await readFile(new URL('../.gitblog/update-policy.json', import.meta.url))
);
if (policy.schemaVersion !== 1) throw new Error('Unsupported update policy version');
const protectedPaths = [...policy.preserve, ...policy.mergeOnly];
const before = await snapshotPaths(root, protectedPaths);

const run = (script) =>
	new Promise((resolve, reject) => {
		const child = spawn('bun', ['run', script], { cwd: root, stdio: 'inherit' });
		child.on('error', reject);
		child.on('exit', (code, signal) => {
			if (code === 0) resolve();
			else reject(new Error(`${script} failed (${signal ?? code})`));
		});
	});

try {
	// No ID generation, translation, pruning, GitHub writes, or deployment.
	await run('check');
	await run('build');
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
} finally {
	const changes = changedPaths(before, await snapshotPaths(root, protectedPaths));
	if (changes.length) {
		console.error(`Update validation changed protected files:\n${changes.join('\n')}`);
		process.exitCode = 1;
	} else {
		console.log(
			'Preservation check passed: content, theme, extensions, and configuration unchanged.'
		);
	}
}
