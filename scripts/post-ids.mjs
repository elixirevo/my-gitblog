import { randomUUID } from 'node:crypto';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.env.POST_IDS_ROOT
	? path.resolve(process.env.POST_IDS_ROOT)
	: path.resolve(scriptDir, '..');
const sourceDir = path.join(projectRoot, 'content/posts');
const translationsDir = path.join(projectRoot, 'content/translations');
const writeMode = process.argv.includes('--write');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ulidPattern = /^[0-9A-HJKMNP-TV-Z]{26}$/;

const isPostId = (value) =>
	typeof value === 'string' && (uuidPattern.test(value.trim()) || ulidPattern.test(value.trim()));

const toPosixPath = (value) => value.split(path.sep).join('/');
const toProjectPath = (value) => toPosixPath(path.relative(projectRoot, value));

const listMarkdownFiles = async (dir) => {
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
			.map((entry) => path.join(dir, entry.name))
			.sort((left, right) => left.localeCompare(right));
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
			return [];
		}

		throw error;
	}
};

const listTranslationFiles = async () => {
	try {
		const locales = await readdir(translationsDir, { withFileTypes: true });
		const filesByLocale = await Promise.all(
			locales
				.filter((entry) => entry.isDirectory())
				.map((entry) => listMarkdownFiles(path.join(translationsDir, entry.name, 'posts')))
		);

		return filesByLocale.flat().sort((left, right) => left.localeCompare(right));
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
			return [];
		}

		throw error;
	}
};

const readPost = async (filePath) => {
	const raw = await readFile(filePath, 'utf8');
	const { data } = matter(raw);
	const id = typeof data.id === 'string' ? data.id.trim() : '';

	return { data, filePath, id, raw };
};

const addId = (raw, id, filePath) => {
	const opening = raw.match(/^(?:\uFEFF)?---(\r?\n)/);

	if (!opening) {
		throw new Error(`Missing YAML frontmatter in ${toProjectPath(filePath)}`);
	}

	const insertAt = opening[0].length;
	return `${raw.slice(0, insertAt)}id: ${id}${opening[1]}${raw.slice(insertAt)}`;
};

const sourcePosts = await Promise.all((await listMarkdownFiles(sourceDir)).map(readPost));
const sourceIds = new Map();
const sourceByName = new Map();
const pendingWrites = [];
const pendingRemovals = [];
const errors = [];

for (const post of sourcePosts) {
	const fileName = path.basename(post.filePath);
	const id = post.id || (writeMode ? randomUUID() : '');

	if (id === '') {
		errors.push(`${toProjectPath(post.filePath)} is missing required frontmatter id`);
		continue;
	}

	if (!isPostId(id)) {
		errors.push(`${toProjectPath(post.filePath)} has an invalid post id: ${id}`);
		continue;
	}

	const duplicatePath = sourceIds.get(id);
	if (duplicatePath) {
		errors.push(
			`${toProjectPath(post.filePath)} reuses post id ${id} from ${toProjectPath(duplicatePath)}`
		);
		continue;
	}

	sourceIds.set(id, post.filePath);
	sourceByName.set(fileName, { ...post, id });

	if (post.id === '') {
		pendingWrites.push({ ...post, id });
	}
}

const translationPosts = await Promise.all((await listTranslationFiles()).map(readPost));

for (const translation of translationPosts) {
	const source = sourceByName.get(path.basename(translation.filePath));

	if (!source) {
		if (writeMode) {
			pendingRemovals.push(translation.filePath);
		} else {
			errors.push(`${toProjectPath(translation.filePath)} does not have a matching source post`);
		}
		continue;
	}

	if (translation.id === '') {
		if (writeMode) {
			pendingWrites.push({ ...translation, id: source.id });
		} else {
			errors.push(`${toProjectPath(translation.filePath)} is missing source post id ${source.id}`);
		}
		continue;
	}

	if (!isPostId(translation.id)) {
		errors.push(`${toProjectPath(translation.filePath)} has an invalid post id: ${translation.id}`);
		continue;
	}

	if (translation.id !== source.id) {
		errors.push(
			`${toProjectPath(translation.filePath)} changed immutable source post id ${source.id} to ${translation.id}`
		);
	}
}

if (errors.length > 0) {
	throw new Error(`Post ID validation failed:\n- ${errors.join('\n- ')}`);
}

for (const filePath of pendingRemovals) {
	await rm(filePath);
	console.log(`Removed orphan translation: ${toProjectPath(filePath)}`);
}

for (const pending of pendingWrites) {
	await writeFile(pending.filePath, addId(pending.raw, pending.id, pending.filePath), 'utf8');
	console.log(`Added post id ${pending.id}: ${toProjectPath(pending.filePath)}`);
}

console.log(
	`Post IDs valid. source=${sourcePosts.length} translations=${translationPosts.length - pendingRemovals.length} added=${pendingWrites.length} removed=${pendingRemovals.length}`
);
