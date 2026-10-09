import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, readlink } from 'node:fs/promises';
import path from 'node:path';

/** Snapshot bytes and symlink targets, without following links outside the blog. */
export async function snapshotPaths(root, paths) {
	const entries = new Map();
	const visit = async (relative) => {
		const absolute = path.resolve(root, relative);
		if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`)) {
			throw new Error(`Preservation path must be inside the blog: ${relative}`);
		}
		let stat;
		try {
			stat = await lstat(absolute);
		} catch (error) {
			if (error.code === 'ENOENT') return;
			throw error;
		}
		if (stat.isSymbolicLink()) {
			entries.set(relative, `link:${await readlink(absolute)}`);
		} else if (stat.isDirectory()) {
			entries.set(relative, 'directory');
			for (const name of (await readdir(absolute)).sort()) {
				await visit(path.posix.join(relative, name));
			}
		} else if (stat.isFile()) {
			entries.set(
				relative,
				createHash('sha256')
					.update(await readFile(absolute))
					.digest('hex')
			);
		}
	};
	for (const relative of paths) await visit(relative);
	return entries;
}

export function changedPaths(before, after) {
	return [...new Set([...before.keys(), ...after.keys()])]
		.filter((key) => before.get(key) !== after.get(key))
		.sort();
}
