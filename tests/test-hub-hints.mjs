import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const hintScript = path.join(scriptDir, '../scripts/send-hub-hint.mjs');
const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), 'gitblog-hints-'));
const eventFile = path.join(fixtureRoot, 'event.json');
const requests = [];
const repositoryId = 123456;
const repository = 'owner/repository';
const commitSha = '0123456789abcdef0123456789abcdef01234567';
const postTerm = 'giscus-post-0123456789abcdef';

const assert = (condition, message) => {
	if (!condition) {
		throw new Error(message);
	}
};

const server = createServer(async (request, response) => {
	const chunks = [];
	for await (const chunk of request) {
		chunks.push(chunk);
	}

	requests.push({
		path: request.url,
		payload: JSON.parse(Buffer.concat(chunks).toString('utf8'))
	});
	response.writeHead(202, { 'Content-Type': 'application/json' });
	response.end('{}');
});

const run = (kind, env) =>
	new Promise((resolve) => {
		const child = spawn(process.execPath, [hintScript, kind], {
			env: { ...process.env, ...env },
			stdio: ['ignore', 'pipe', 'pipe']
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (chunk) => (stdout += chunk));
		child.stderr.on('data', (chunk) => (stderr += chunk));
		child.on('close', (status) => resolve({ status, stdout, stderr }));
	});

try {
	await writeFile(
		eventFile,
		JSON.stringify({
			action: 'created',
			repository: { id: repositoryId, full_name: repository },
			discussion: {
				id: 1,
				node_id: 'D_fixture',
				title: `Fixture [${postTerm}]`,
				body: `giscus term: ${postTerm}`
			},
			comment: { id: 2, node_id: 'DC_fixture' }
		})
	);
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	assert(address && typeof address === 'object', 'fixture server did not start');

	const baseEnv = {
		GITHUB_EVENT_PATH: eventFile,
		GITHUB_REPOSITORY: repository,
		GITHUB_REPOSITORY_ID: String(repositoryId),
		PUBLIC_HUB_ENABLED: 'true',
		PUBLIC_HUB_URL: `http://127.0.0.1:${address.port}`
	};
	const deployResult = await run('deploy', { ...baseEnv, DEPLOYED_COMMIT_SHA: commitSha });
	const commentResult = await run('discussion-comment', baseEnv);

	assert(deployResult.status === 0, deployResult.stderr || deployResult.stdout);
	assert(commentResult.status === 0, commentResult.stderr || commentResult.stdout);
	assert(requests.length === 2, `expected 2 hints, received ${requests.length}`);
	assert(requests[0].path === '/v1/ingestion/deploy-hint', 'deploy hint used the wrong endpoint');
	assert(
		JSON.stringify(requests[0].payload) === JSON.stringify({ repositoryId, repository, commitSha }),
		'deploy hint payload changed'
	);
	assert(requests[1].path === '/v1/events/comment-hint', 'comment hint used the wrong endpoint');
	assert(
		JSON.stringify(requests[1].payload) ===
			JSON.stringify({
				repositoryId,
				action: 'created',
				discussionId: 'D_fixture',
				commentId: 'DC_fixture',
				postTerm
			}),
		'comment hint payload changed'
	);

	const disabledResult = await run('deploy', {
		...baseEnv,
		DEPLOYED_COMMIT_SHA: commitSha,
		PUBLIC_HUB_ENABLED: 'false'
	});
	assert(disabledResult.status === 0, disabledResult.stderr || disabledResult.stdout);
	assert(requests.length === 2, 'opt-out still sent a hint');

	console.log('Blog Hub hint endpoint, payload, and opt-out fixtures passed.');
} finally {
	server.close();
	await rm(fixtureRoot, { recursive: true, force: true });
}
