import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { getConfiguredLocales, sourceLocale } from '$lib/locales';
import { toRssPath } from '$lib/routes';
import { toAbsoluteUrl } from '$lib/seo';
import { getSiteConfig } from '$lib/site';

const isDisabled = (value: string | undefined) =>
	['0', 'false', 'no', 'off'].includes(value?.trim().toLowerCase() ?? '');

export const getHubManifest = () => {
	const site = getSiteConfig(sourceLocale);
	const repository =
		privateEnv.GITHUB_REPOSITORY?.trim() || publicEnv.PUBLIC_SITE_REPOSITORY?.trim() || '';

	return {
		schemaVersion: 1,
		name: site.title,
		imageUrl: /^https:\/\//i.test(publicEnv.PUBLIC_SITE_IMAGE?.trim() || '')
			? publicEnv.PUBLIC_SITE_IMAGE?.trim() || null
			: null,
		buildCommit: privateEnv.GITBLOG_BUILD_COMMIT || undefined,
		enabled: !isDisabled(publicEnv.PUBLIC_HUB_ENABLED),
		repository,
		siteUrl: toAbsoluteUrl(site, '/'),
		sourceLocale,
		feeds: getConfiguredLocales().map((locale) => ({
			locale,
			url: toAbsoluteUrl(site, toRssPath(locale))
		}))
	};
};
