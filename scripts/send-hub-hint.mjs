import { loadEnvFile } from './lib/env.mjs';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

loadEnvFile(path.join(projectRoot, '.env.production'));

const isDisabled = (value) =>
	['0', 'false', 'no', 'off'].includes(value?.trim().toLowerCase() ?? '');

const readEvent = () => {
	const eventPath = process.env.GITHUB_EVENT_PATH?.trim() ?? '';

	if (eventPath === '' || !existsSync(eventPath)) {
		return {};
	}

	return JSON.parse(readFileSync(eventPath, 'utf8'));
};

const getRepository = (event) =>
	process.env.GITHUB_REPOSITORY?.trim() || event.repository?.full_name || '';

const getRepositoryId = (event) => {
	const value = process.env.GITHUB_REPOSITORY_ID?.trim() || event.repository?.id;
	const repositoryId = Number(value);

	if (!Number.isSafeInteger(repositoryId) || repositoryId <= 0) {
		throw new Error(`Invalid GitHub repository id: ${String(value)}`);
	}

	return repositoryId;
};

const extractPostTerm = (discussion) => {
	const value = `${discussion?.title ?? ''}\n${discussion?.body ?? ''}`;
	return value.match(/(?:giscus-post-[a-f0-9]{16}|post:\S+)/i)?.[0] ?? '';
};

const createHint = (kind, event) => {
	const repositoryId = getRepositoryId(event);
	const repository = getRepository(event);

	if (repository === '') {
		throw new Error('GitHub repository name is missing');
	}

	if (kind === 'deploy') {
		const commitSha =
			process.env.DEPLOYED_COMMIT_SHA?.trim() ||
			process.env.GITHUB_SHA?.trim() ||
			event.after ||
			'';

		if (!/^[0-9a-f]{40}$/i.test(commitSha)) {
			throw new Error(`Invalid Git commit SHA: ${commitSha}`);
		}

		return {
			endpoint: 'v1/ingestion/deploy-hint',
			payload: { repositoryId, repository, commitSha }
		};
	}

	if (kind === 'discussion-comment') {
		const postTerm = extractPostTerm(event.discussion);
		const discussionId = event.discussion?.node_id ?? String(event.discussion?.id ?? '');
		const commentId = event.comment?.node_id ?? String(event.comment?.id ?? '');

		if (postTerm === '') {
			throw new Error('Discussion does not contain a recognized giscus post term');
		}

		if (!['created', 'deleted'].includes(event.action)) {
			throw new Error(`Unsupported discussion_comment action: ${String(event.action)}`);
		}

		if (discussionId === '' || commentId === '') {
			throw new Error('Discussion or comment identifier is missing');
		}

		return {
			endpoint: 'v1/events/comment-hint',
			payload: {
				repositoryId,
				action: event.action,
				discussionId,
				commentId,
				postTerm
			}
		};
	}

	throw new Error(`Unknown Hub hint kind: ${kind}`);
};

const main = async () => {
	if (isDisabled(process.env.PUBLIC_HUB_ENABLED)) {
		console.log('Blog Hub participation is disabled. Skipping hint.');
		return;
	}

	const hubUrl = process.env.PUBLIC_HUB_URL?.trim() ?? '';
	if (hubUrl === '') {
		console.log('PUBLIC_HUB_URL is empty. Skipping optional Blog Hub hint.');
		return;
	}

	const kind = process.argv[2] ?? '';
	const { endpoint, payload } = createHint(kind, readEvent());
	const url = new URL(endpoint, `${hubUrl.replace(/\/+$/, '')}/`);

	if (!['http:', 'https:'].includes(url.protocol)) {
		throw new Error(`Unsupported Blog Hub URL protocol: ${url.protocol}`);
	}

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			'User-Agent': 'gitblog-hint/1.0'
		},
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(10_000)
	});

	if (!response.ok) {
		throw new Error(`Blog Hub hint failed (${response.status}): ${await response.text()}`);
	}

	console.log(`Sent optional Blog Hub ${kind} hint for ${payload.repository ?? 'repository'}.`);
};

try {
	await main();
} catch (error) {
	console.warn(
		`Blog Hub hint was not delivered: ${error instanceof Error ? error.message : error}`
	);
}
