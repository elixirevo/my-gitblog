import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const rootDir = path.resolve('build');

const mimeTypes = new Map([
	['.css', 'text/css; charset=utf-8'],
	['.html', 'text/html; charset=utf-8'],
	['.ico', 'image/x-icon'],
	['.js', 'text/javascript; charset=utf-8'],
	['.json', 'application/json; charset=utf-8'],
	['.pf_filter', 'application/octet-stream'],
	['.pf_fragment', 'application/octet-stream'],
	['.pf_index', 'application/octet-stream'],
	['.pf_meta', 'application/octet-stream'],
	['.svg', 'image/svg+xml'],
	['.txt', 'text/plain; charset=utf-8'],
	['.wasm', 'application/wasm'],
	['.xml', 'application/xml; charset=utf-8']
]);

const args = process.argv.slice(2);

const readFlag = (flag, fallback) => {
	const index = args.indexOf(flag);
	return index === -1 ? fallback : (args[index + 1] ?? fallback);
};

const host = readFlag('--host', '127.0.0.1');
const port = Number.parseInt(readFlag('--port', '4173'), 10);

const fileExists = async (targetPath) => {
	try {
		const targetStat = await stat(targetPath);
		return targetStat;
	} catch {
		return null;
	}
};

const send = (response, status, body, headers = {}) => {
	response.writeHead(status, headers);
	response.end(body);
};

const server = createServer(async (request, response) => {
	const requestUrl = new URL(
		request.url ?? '/',
		`http://${request.headers.host ?? `${host}:${port}`}`
	);
	const decodedPath = decodeURIComponent(requestUrl.pathname);
	const relativePath = decodedPath.replace(/^\/+/, '');
	const absolutePath = path.resolve(rootDir, relativePath);

	if (!absolutePath.startsWith(rootDir)) {
		send(response, 403, 'Forbidden');
		return;
	}

	let filePath = absolutePath;
	let fileStat = await fileExists(filePath);

	if (fileStat?.isDirectory()) {
		if (!decodedPath.endsWith('/')) {
			send(response, 307, '', {
				Location: `${decodedPath}/${requestUrl.search}`
			});
			return;
		}

		filePath = path.join(filePath, 'index.html');
		fileStat = await fileExists(filePath);
	} else if (!fileStat) {
		const indexPath = path.join(absolutePath, 'index.html');
		const indexStat = await fileExists(indexPath);

		if (indexStat?.isFile()) {
			send(response, 307, '', {
				Location: `${decodedPath.endsWith('/') ? decodedPath : `${decodedPath}/`}${requestUrl.search}`
			});
			return;
		}
	}

	if (!fileStat?.isFile()) {
		send(response, 404, 'Not found');
		return;
	}

	const extension = path.extname(filePath).toLowerCase();
	const contentType = mimeTypes.get(extension) ?? 'application/octet-stream';

	try {
		const body = request.method === 'HEAD' ? null : await readFile(filePath);
		send(response, 200, body, {
			'Content-Type': contentType,
			'Cache-Control': 'no-cache'
		});
	} catch {
		send(response, 500, 'Internal Server Error');
	}
});

server.listen(port, host, () => {
	console.log(`Serving build/ at http://${host}:${port}/`);
});
