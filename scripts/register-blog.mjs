// Executed only by the pinned official reusable workflow. Never execute blog code here.
export const templateRepository = 'gitblogapp/svelte-gitblog-template';
export async function registerBlog(
	env = process.env,
	request = fetch,
	pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
) {
	const hub = new URL(env.GITBLOG_HUB_URL || 'https://gitblog.app');
	if (
		hub.protocol !== 'https:' ||
		hub.username ||
		hub.password ||
		hub.pathname !== '/' ||
		hub.search ||
		hub.hash
	)
		throw new Error('A public HTTPS GitBlog origin is required');
	const repository = env.GITHUB_REPOSITORY || '';
	if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)) throw new Error('Invalid repository');
	const api = async (path) => {
		const response = await request(`https://api.github.com${path}`, {
			redirect: 'manual',
			signal: AbortSignal.timeout(10000),
			headers: {
				Authorization: `Bearer ${env.GITHUB_TOKEN}`,
				Accept: 'application/vnd.github+json',
				'User-Agent': 'gitblog-registration'
			}
		});
		if (!response.ok) throw new Error(`GitHub verification failed (${response.status})`);
		return response.json();
	};
	const repo = await api(`/repos/${repository}`);
	if (
		String(repo.id) !== env.GITHUB_REPOSITORY_ID ||
		repo.full_name.toLowerCase() !== repository.toLowerCase() ||
		repo.private ||
		repo.archived ||
		repo.is_template ||
		env.GITHUB_REF !== `refs/heads/${repo.default_branch}` ||
		![repo.template_repository, repo.parent, repo.source].some(
			(item) => item?.full_name?.toLowerCase() === templateRepository
		)
	)
		throw new Error('A public blog from the official template on its default branch is required');
	const pages = await api(`/repos/${repository}/pages`);
	const site = new URL(pages.html_url);
	if (site.protocol !== 'https:' || site.username || site.password)
		throw new Error('Invalid Pages address');
	const commit = env.GITBLOG_DEPLOYED_COMMIT || '';
	if (commit && !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid deployed commit');
	const oidcUrl = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
	oidcUrl.searchParams.set('audience', `${hub.origin}/ingestion`);
	for (let attempt = 0; attempt < 4; attempt++) {
		try {
			const identity = await request(oidcUrl, {
				redirect: 'manual',
				signal: AbortSignal.timeout(10000),
				headers: { Authorization: `Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` }
			});
			if (!identity.ok) throw new Error('Could not authenticate this workflow');
			const { value: token } = await identity.json();
			if (typeof token !== 'string' || !token) throw new Error('Missing workflow identity');
			const response = await request(new URL('/v1/ingestion/deploy-hint', hub), {
				method: 'POST',
				redirect: 'manual',
				signal: AbortSignal.timeout(20000),
				headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					repositoryId: repo.id,
					repository: repo.full_name,
					siteUrl: site.href,
					commitSha: commit
				})
			});
			if (response.ok) {
				console.log('GitBlog accepted registration and feed refresh.');
				return;
			}
			if ([400, 401, 403, 422].includes(response.status))
				throw Object.assign(new Error(`GitBlog rejected registration (${response.status})`), {
					permanent: true
				});
			throw new Error(`GitBlog registration unavailable (${response.status})`);
		} catch (cause) {
			if (cause?.permanent || attempt === 3) throw cause;
			await pause([2000, 5000, 10000][attempt]);
		}
	}
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
	try {
		await registerBlog();
	} catch {
		console.error(
			'GitBlog registration failed. Your blog remains deployed. Retry the Sync GitBlog feed workflow from Actions.'
		);
		process.exitCode = 1;
	}
}
