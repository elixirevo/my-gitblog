import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Share public site settings while retaining the current Vite mode and its overrides.
	const publicEnv = {
		...loadEnv('production', process.cwd(), 'PUBLIC_'),
		...loadEnv(mode, process.cwd(), 'PUBLIC_')
	};
	for (const [key, value] of Object.entries(publicEnv)) {
		process.env[key] ??= value;
	}

	return { plugins: [sveltekit()] };
});
