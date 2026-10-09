import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const syncScript = path.join(scriptDir, '../scripts/sync-giscus-discussions.mjs');
const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'gitblog-giscus-'));
const sourceDir = path.join(fixtureRoot, 'content/posts');
const createTerm = (value) =>
	`giscus-post-${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
const fixtures = [
	{
		discussionId: 'D_hash_fixture',
		slug: '기존 글 이름 변경',
		postId: '2f4ad174-baba-4aa4-89ad-72760aeb2509'
	},
	{
		discussionId: 'D_post_fixture',
		slug: '새 글 with spaces',
		postId: '744a9970-64f5-4c37-a29d-55d90adf4619'
	}
].map((fixture) => ({
	...fixture,
	currentTerm: createTerm(fixture.postId)
}));
const createdVariables = [];
const discussions = [
	{ id: fixtures[0].discussionId, title: `Original title [${fixtures[0].currentTerm}]` }
];

const assert = (condition, message) => {
	if (!condition) {
		throw new Error(message);
	}
};

const readBody = async (request) => {
	const chunks = [];
	for await (const chunk of request) {
		chunks.push(chunk);
	}

	return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const server = createServer(async (request, response) => {
	const payload = await readBody(request);
	let data;

	if (payload.query.includes('ExistingGiscusDiscussions')) {
		data = {
			repository: {
				discussions: {
					nodes: discussions,
					pageInfo: { hasNextPage: false, endCursor: null }
				}
			}
		};
	} else if (payload.query.includes('CreateGiscusDiscussion')) {
		createdVariables.push(payload.variables);
		discussions.push({ id: 'D_created', title: payload.variables.title });
		data = { createDiscussion: { discussion: { id: 'D_created' } } };
	} else {
		response.writeHead(400, { 'Content-Type': 'application/json' });
		response.end(JSON.stringify({ errors: [{ message: 'Unexpected fixture query' }] }));
		return;
	}

	response.writeHead(200, { 'Content-Type': 'application/json' });
	response.end(JSON.stringify({ data }));
});

try {
	await mkdir(sourceDir, { recursive: true });
	await Promise.all(
		fixtures.map((fixture) =>
			writeFile(
				path.join(sourceDir, `${fixture.slug}.md`),
				`---\nid: ${fixture.postId}\ntitle: Fixture\ndescription: Fixture\npublished: true\n---\nBody\n`
			)
		)
	);

	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	assert(address && typeof address === 'object', 'fixture server did not start');

	const run = () =>
		new Promise((resolve) => {
			const child = spawn(process.execPath, [syncScript], {
				env: {
					...process.env,
					GISCUS_SYNC_ROOT: fixtureRoot,
					GITHUB_GRAPHQL_URL: `http://127.0.0.1:${address.port}/graphql`,
					GITHUB_REPOSITORY: 'owner/repository',
					GITHUB_TOKEN: 'fixture-token',
					PUBLIC_GISCUS_REPO: 'owner/repository',
					PUBLIC_GISCUS_REPO_ID: 'R_fixture',
					PUBLIC_GISCUS_CATEGORY_ID: 'C_fixture',
					PUBLIC_SITE_URL: 'https://example.com',
					PUBLIC_SOURCE_LOCALE: 'ko',
					PUBLIC_TRANSLATION_LOCALES: ''
				},
				stdio: ['ignore', 'pipe', 'pipe']
			});
			let stdout = '';
			let stderr = '';
			child.stdout.on('data', (chunk) => (stdout += chunk));
			child.stderr.on('data', (chunk) => (stderr += chunk));
			child.on('close', (status) => resolve({ status, stdout, stderr }));
		});

	const first = await run();
	assert(first.status === 0, first.stderr || first.stdout);
	assert(createdVariables.length === 1, 'must create only the missing discussion');
	assert(
		createdVariables[0].title.includes(fixtures[1].currentTerm),
		'new discussion must use immutable post ID'
	);
	assert(
		createdVariables[0].body.includes(encodeURIComponent(fixtures[1].slug)),
		'canonical URL must encode the filename'
	);
	const second = await run();
	assert(second.status === 0, second.stderr || second.stdout);
	assert(createdVariables.length === 1, 'repeat sync must not create duplicates');
	discussions.push({ id: 'D_conflict', title: `Duplicate [${fixtures[0].currentTerm}]` });
	const conflict = await run();
	assert(
		conflict.status !== 0 && conflict.stderr.includes('Multiple giscus discussions'),
		'duplicate terms must fail'
	);
	assert(createdVariables.length === 1, 'conflict must not create more discussions');
	console.log(
		'Giscus sync passed: immutable IDs, renamed posts, creation, repeat sync, duplicate detection.'
	);
} finally {
	server.close();
	await rm(fixtureRoot, { recursive: true, force: true });
}
