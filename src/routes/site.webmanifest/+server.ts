import { base } from '$app/paths';
import { sourceLocale } from '$lib/locales';
import { getSiteConfig } from '$lib/site';

export const prerender = true;
export const trailingSlash = 'never';

const siteConfig = getSiteConfig(sourceLocale);
const withBasePath = (path: `/${string}`) => `${base}${path}`;

export const GET = () =>
	new Response(
		JSON.stringify(
			{
				name: siteConfig.title,
				short_name: siteConfig.title,
				icons: [
					{
						src: withBasePath('/assets/icons/web-app-manifest-192x192.png'),
						sizes: '192x192',
						type: 'image/png',
						purpose: 'maskable'
					},
					{
						src: withBasePath('/assets/icons/web-app-manifest-512x512.png'),
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				],
				theme_color: '#f9f9f9',
				background_color: '#ffffff',
				display: 'standalone'
			},
			null,
			2
		),
		{
			headers: {
				'Cache-Control': 'max-age=0, s-maxage=3600',
				'Content-Type': 'application/manifest+json; charset=utf-8'
			}
		}
	);
