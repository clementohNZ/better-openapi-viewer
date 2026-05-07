import { execFile, spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import webpack from 'webpack';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const watch = process.argv.includes('--watch');

await mkdir(path.join(root, 'dist/browser'), { recursive: true });

const tailwindBin = require.resolve('tailwindcss/lib/cli.js');
const tailwindArgs = [
  tailwindBin,
  '-c',
  path.join(root, 'tailwind.config.cjs'),
  '-i',
  path.join(root, 'src/styles.css'),
  '-o',
  path.join(root, 'dist/browser/viewer.css'),
];

if (watch) {
  tailwindArgs.push('--watch');
  spawn(process.execPath, tailwindArgs, { stdio: 'inherit' });
} else {
  tailwindArgs.push('--minify');
  await execFileAsync(process.execPath, tailwindArgs);
}

const compiler = webpack({
  mode: watch ? 'development' : 'production',
  entry: path.join(root, 'browser/index.js'),
  output: {
    filename: 'viewer.js',
    path: path.join(root, 'dist/browser'),
  },
  devtool: 'source-map',
  experiments: { outputModule: false },
  resolve: { extensions: ['.js'] },
});

if (watch) {
  compiler.watch({ aggregateTimeout: 200 }, (error, stats) => {
    if (error) {
      console.error(error);
      return;
    }
    if (stats?.hasErrors()) {
      console.error(stats.toString({ all: false, errors: true }));
      return;
    }
    console.log(`[viewer] rebuilt at ${new Date().toLocaleTimeString()}`);
  });
} else {
  await new Promise((resolve, reject) => {
    compiler.run((error, stats) => {
      if (error) {
        reject(error);
        return;
      }
      if (stats?.hasErrors()) {
        reject(new Error(stats.toString({ all: false, errors: true })));
        return;
      }
      resolve(undefined);
    });
  });
}
