import assert from 'node:assert/strict';
import { analyticsRequest } from '../src/lib/template/analytics';
const config = {
	repository: 'owner/blog',
	siteUrl: 'https://owner.github.io/blog',
	hubUrl: 'https://gitblog.app'
};
const url = 'https://owner.github.io/blog/blog/first/?secret=value#heading';
assert.deepEqual(analyticsRequest(config, url), {
	endpoint: 'https://gitblog.app/v1/analytics/owner/blog',
	body: { url: 'https://owner.github.io/blog/blog/first/', referrer: '' }
});
for (const enabled of ['false', 'off', '0', 'no'])
	assert.equal(analyticsRequest({ ...config, enabled }, url), null);
assert.equal(analyticsRequest({ ...config, hubEnabled: 'false' }, url), null);
assert.equal(analyticsRequest(config, url, '', true), null);
assert.equal(analyticsRequest(config, 'http://localhost:5173/blog/first'), null);
assert.equal(analyticsRequest(config, 'https://owner.github.io/another/blog/first'), null);
assert.equal(analyticsRequest({ ...config, hubUrl: 'http://gitblog.app' }, url), null);
assert.equal(analyticsRequest({ ...config, repository: 'bad/path/extra' }, url), null);
console.log('Analytics configuration and privacy checks passed');

assert.equal(
	analyticsRequest(config, url, 'https://search.example/private?q=secret#token')?.body.referrer,
	'https://search.example'
);
