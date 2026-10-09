import { existsSync, readFileSync } from 'node:fs';

// Existing process variables (including CI secrets) take precedence.
export const loadEnvFile = (filePath) => {
	if (!existsSync(filePath)) {
		return;
	}

	for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
		const trimmed = line.trim();
		if (trimmed === '' || trimmed.startsWith('#')) {
			continue;
		}

		const separatorIndex = trimmed.indexOf('=');
		if (separatorIndex === -1) {
			continue;
		}

		const key = trimmed.slice(0, separatorIndex).trim();
		const value = trimmed
			.slice(separatorIndex + 1)
			.trim()
			.replace(/^"|"$/g, '')
			.replace(/^'|'$/g, '');

		if (process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
};
