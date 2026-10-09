import { appendFileSync } from 'node:fs';
import { loadEnvFile } from './lib/env.mjs';
loadEnvFile('.env.production');
const enabled = !['0', 'false', 'no', 'off'].includes(
	process.env.PUBLIC_HUB_ENABLED?.trim().toLowerCase()
);
const value = process.env.PUBLIC_HUB_URL?.trim() || '';
if (!process.env.GITHUB_OUTPUT) throw new Error('GitHub output file is required');
if (!enabled || !value) appendFileSync(process.env.GITHUB_OUTPUT, 'enabled=false\n');
else {
	const url = new URL(value);
	if (
		url.protocol !== 'https:' ||
		url.username ||
		url.password ||
		url.pathname !== '/' ||
		url.search ||
		url.hash
	)
		throw new Error('PUBLIC_HUB_URL must be an HTTPS origin');
	appendFileSync(process.env.GITHUB_OUTPUT, `enabled=true\nhub_url=${url.origin}\n`);
}
