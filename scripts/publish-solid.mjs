// Usage: node scripts/publish-solid.mjs <solid-src-dir>
// Publishes the built Solid packages to pkg.pr.new (from THIS repo) and writes solid-urls.json ({pkg: url}).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2]);
// package name -> folder under packages/
const wanted = {
  'solid-js': 'solid',
  '@solidjs/signals': 'signals',
  '@solidjs/web': 'web',
  '@solidjs/babel-plugin': 'babel-plugin',
  '@solidjs/html': 'html',
  '@solidjs/h': 'h',
  '@solidjs/universal': 'universal',
};
const dirs = Object.values(wanted)
  .map((d) => join(root, 'packages', d))
  .filter((d) => existsSync(join(d, 'package.json')));
// --no-compact: compact URLs require the package on npm under a matching repo.
execFileSync(
  'npx',
  ['--yes', 'pkg-pr-new@latest', 'publish', '--pnpm', '--no-compact', '--no-template', '--comment=off', '--json', 'output.json', ...dirs],
  { stdio: 'inherit' },
);
const out = JSON.parse(readFileSync('output.json', 'utf8'));
const urls = Object.fromEntries(out.packages.map((p) => [p.name, p.url]));
writeFileSync('solid-urls.json', JSON.stringify(urls, null, 2));
console.log(urls);
