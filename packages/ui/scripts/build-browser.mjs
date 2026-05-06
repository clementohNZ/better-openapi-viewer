import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import webpack from 'webpack';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await mkdir(path.join(root, 'dist/browser'), { recursive: true });

await new Promise((resolve, reject) => {
  webpack(
    {
      mode: 'production',
      entry: path.join(root, 'browser/index.js'),
      output: {
        filename: 'viewer.js',
        path: path.join(root, 'dist/browser'),
      },
      devtool: 'source-map',
      experiments: {
        outputModule: false,
      },
      resolve: {
        extensions: ['.js'],
      },
    },
    (error, stats) => {
      if (error) {
        reject(error);
        return;
      }

      if (stats?.hasErrors()) {
        reject(new Error(stats.toString({ all: false, errors: true })));
        return;
      }

      resolve(undefined);
    },
  );
});
