import { getSiteConfig } from '$lib/site';
import { toAbsoluteUrl } from '$lib/seo';
import { sourceLocale } from '$lib/locales';

export const prerender = true;
export const trailingSlash = 'never';

const siteConfig = getSiteConfig(sourceLocale);

export const GET = () =>
	new Response(
		`User-agent: *
Disallow:

Sitemap: ${toAbsoluteUrl(siteConfig, '/sitemap.xml')}
`,
		{
			headers: {
				'Cache-Control': 'max-age=0, s-maxage=3600',
				'Content-Type': 'text/plain; charset=utf-8'
			}
		}
	);
