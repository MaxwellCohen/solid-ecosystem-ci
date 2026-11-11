// Usage: node scripts/build-variant.mjs <template> <label>
// Copies templates/<template> to .build/<template>-<label>, points every Solid package at the
// URL in solid-urls.json (written by publish-solid.mjs, or hand-write {pkg: url/tarball}), then builds.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [template, name] = process.argv.slice(2);
if (!template || !name) throw new Error('usage: build-variant.mjs <template> <label>');
if (!existsSync(join('templates', template))) throw new Error(`unknown template "${template}"`);
const urls = JSON.parse(readFileSync(process.env.SOLID_URLS_FILE || 'solid-urls.json', 'utf8'));

const root = resolve('.');
const out = join(root, '.build', `${template}-${name}`);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'templates', template), out, { recursive: true });

const slug = `solid-eco-${template}-${name}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
const pkgPath = join(out, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
for (const [p, url] of Object.entries(urls)) {
  for (const f of ['dependencies', 'devDependencies']) if (pkg[f]?.[p]) pkg[f][p] = url;
}
// Force transitive uses (router, meta, vite plugin) onto the same build.
pkg.overrides = { ...pkg.overrides, ...urls };
pkg.name = slug;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

const info = { template, variant: name, packages: urls };
mkdirSync(join(out, 'public'), { recursive: true });
writeFileSync(join(out, 'public/version.json'), JSON.stringify(info, null, 2));

const wr = join(out, 'wrangler.jsonc');
if (existsSync(wr)) writeFileSync(wr, readFileSync(wr, 'utf8').replace('__NAME__', slug));

const run = (cmd, args) => execFileSync(cmd, args, { cwd: out, stdio: 'inherit', env: { ...process.env, SOLID_VARIANT: name } });
run('npm', ['install', '--no-audit', '--no-fund', '--legacy-peer-deps']);
run('npm', ['run', 'build']);
console.log(`\nbuilt ${template}/${name} -> ${out}`);
