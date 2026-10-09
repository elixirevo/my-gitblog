import { getHubManifest } from '$lib/server/hub-manifest';

export const prerender = true;
export const trailingSlash = 'never';

export const GET = () =>
	new Response(`${JSON.stringify(getHubManifest(), null, 2)}\n`, {
		headers: {
			'content-type': 'application/json; charset=utf-8'
		}
	});
