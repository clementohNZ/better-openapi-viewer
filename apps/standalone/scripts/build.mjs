import { spawn } from 'node:child_process';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const serve = process.argv.includes('--serve');
const port = Number(process.env.PORT ?? 4173);
const require = createRequire(import.meta.url);

await mkdir(dist, { recursive: true });

const uiBrowserCss = require.resolve('@clementoh/better-openapi-viewer-ui/browser-style');
await copyFile(uiBrowserCss, path.join(dist, 'viewer.css'));
await copyFile(path.join(root, 'src/index.html'), path.join(dist, 'index.html'));

const compiler = webpack({
  mode: serve ? 'development' : 'production',
  entry: path.join(root, 'src/boot.js'),
  output: {
    filename: 'viewer.js',
    path: dist,
  },
  resolve: { extensions: ['.js'] },
  devtool: 'source-map',
});

await new Promise((resolve, reject) => {
  compiler.run((error, stats) => {
    if (error) return reject(error);
    if (stats?.hasErrors()) return reject(new Error(stats.toString({ all: false, errors: true })));
    resolve(undefined);
  });
});

console.log(`[standalone] built ${dist}`);

if (serve) {
  const server = createServer(async (request, response) => {
    const requested = decodeURIComponent((request.url ?? '/').split('?')[0]);
    const fileRel = requested === '/' ? '/index.html' : requested;
    const filePath = path.join(dist, fileRel);
    try {
      const content = await readFile(filePath);
      const ext = path.extname(filePath);
      const contentType =
        ext === '.html'
          ? 'text/html; charset=utf-8'
          : ext === '.js'
            ? 'application/javascript; charset=utf-8'
            : ext === '.css'
              ? 'text/css; charset=utf-8'
              : ext === '.map'
                ? 'application/json; charset=utf-8'
                : 'application/octet-stream';
      response.writeHead(200, { 'content-type': contentType });
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  server.listen(port, () => {
    console.log(`[standalone] serving at http://localhost:${port}/`);
  });
}
