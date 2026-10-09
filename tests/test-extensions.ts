import assert from 'node:assert/strict';
import { mountPageExtensions, validateExtensions } from '../src/lib/template/extension-runtime';
import type { BlogExtension, ExtensionContext } from '../src/lib/template/contracts';

const calls: string[] = [];
const context = { pathname: '/blog/first/', locale: 'en' } as ExtensionContext;
const extension = (id: string): BlogExtension => ({
	id,
	apiVersion: 1,
	onPage: ({ pathname }) => {
		calls.push(`enter:${id}:${pathname}`);
		return () => {
			calls.push(`leave:${id}`);
		};
	}
});
const extensions = validateExtensions([extension('one'), extension('two')]);
const cleanup = mountPageExtensions(extensions, context);
cleanup();
cleanup(); // Cleanup remains safe when a host tears down twice.
const leaveSecondPage = mountPageExtensions(extensions, { ...context, pathname: '/blog/second/' });
leaveSecondPage();
assert.deepEqual(calls, [
	'enter:one:/blog/first/',
	'enter:two:/blog/first/',
	'leave:two',
	'leave:one',
	'enter:one:/blog/second/',
	'enter:two:/blog/second/',
	'leave:two',
	'leave:one'
]);
assert.throws(() => validateExtensions([extension('same'), extension('same')]), /unique/);
assert.throws(
	() => validateExtensions([{ ...extension('old'), apiVersion: 2 } as unknown as BlogExtension]),
	/version/
);
calls.length = 0;
assert.throws(
	() =>
		mountPageExtensions(
			[
				extension('started'),
				{
					id: 'broken',
					apiVersion: 1,
					onPage: () => {
						throw new Error('fixture failure');
					}
				}
			],
			context
		),
	/fixture failure/
);
assert.deepEqual(calls, ['enter:started:/blog/first/', 'leave:started']);
calls.length = 0;
const cleanupWithError = mountPageExtensions(
	[
		extension('still-cleaned'),
		{
			id: 'broken-cleanup',
			apiVersion: 1,
			onPage: () => () => {
				throw new Error('cleanup');
			}
		}
	],
	context
);
assert.throws(cleanupWithError, /cleanup failed/);
assert.deepEqual(calls, ['enter:still-cleaned:/blog/first/', 'leave:still-cleaned']);
console.log('Extension fixtures passed: navigation cleanup, failures, and compatibility.');
