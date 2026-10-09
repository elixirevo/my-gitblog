import type { BlogExtension, ExtensionContext, ExtensionPointName } from './contracts';

const points: ExtensionPointName[] = ['article-before-body', 'article-after-body', 'site-footer'];

export function validateExtensions(extensions: BlogExtension[]) {
	const ids = new Set<string>();
	for (const extension of extensions) {
		if (!extension.id.trim() || ids.has(extension.id)) {
			throw new Error(`Extension ID must be nonempty and unique: ${extension.id}`);
		}
		ids.add(extension.id);
		if (extension.apiVersion !== 1) {
			throw new Error(`Unsupported extension API version: ${extension.id}`);
		}
		for (const point of Object.keys(extension.components ?? {})) {
			if (!points.includes(point as ExtensionPointName)) {
				throw new Error(`Unknown extension point ${point}: ${extension.id}`);
			}
		}
	}
	return extensions;
}

export function mountPageExtensions(extensions: BlogExtension[], context: ExtensionContext) {
	const disposers: (() => void)[] = [];
	const cleanup = () => {
		const errors: unknown[] = [];
		for (const dispose of disposers.splice(0).reverse()) {
			try {
				dispose();
			} catch (error) {
				errors.push(error);
			}
		}
		if (errors.length) throw new AggregateError(errors, 'Extension cleanup failed');
	};
	try {
		for (const extension of extensions) {
			const dispose = extension.onPage?.(context);
			if (dispose) disposers.push(dispose);
		}
	} catch (error) {
		try {
			cleanup();
		} catch (cleanupError) {
			throw new AggregateError([error, cleanupError], 'Extension initialization failed', {
				cause: cleanupError
			});
		}
		throw error;
	}
	return cleanup;
}
