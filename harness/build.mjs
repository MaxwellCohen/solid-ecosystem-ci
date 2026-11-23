// node build.mjs <target>... : bundles out/<target>/ssr.mjs and client.js
import { build } from 'esbuild';
import { createRequire } from 'module';
import fs from 'fs';

const here = new URL('.', import.meta.url).pathname;
export const TARGETS = {
	stock: 'solid-js 2.0.3 (npm `latest`)',
	dpu: 'solid-js `feat/stream-disarm-pe` (MaxwellCohen/solid#2: ranges + `<template for>`)'
};

function solidPlugin(target, generate) {
	const dir = `${here}targets/${target}`;
	const { transform } = createRequire(`${dir}/package.json`)('@solidjs/compiler');
	return {
		name: 'solid',
		setup(b) {
			// the framework comes from the target's own install
			b.onResolve({ filter: /^(solid-js|@solidjs\/(web|signals))(\/.*)?$/ }, async (args) => {
				if (args.pluginData === 'solid') return;
				const r = await b.resolve(args.path, { resolveDir: dir, kind: args.kind, pluginData: 'solid' });
				return r.errors.length ? { errors: r.errors } : { path: r.path };
			});
			b.onLoad({ filter: /\/src\/.*\.jsx$/ }, async (args) => {
				const src = fs.readFileSync(args.path, 'utf8');
				const out = await transform(src, { filename: args.path, generate, hydratable: true, dev: false, sourceNames: false });
				return { contents: out.code, loader: 'js' };
			});
		}
	};
}

export async function buildTarget(target, outDir = `${here}out/${target}`) {
	const common = { bundle: true, ignoreAnnotations: true, logLevel: 'error', absWorkingDir: here, legalComments: 'none' };
	await build({
		...common,
		entryPoints: ['src/ssr-entry.jsx'],
		platform: 'node',
		format: 'esm',
		outfile: `${outDir}/ssr.mjs`,
		define: { SERVER: 'true', 'process.env.NODE_ENV': '"production"' },
		plugins: [solidPlugin(target, 'ssr')]
	});
	await build({
		...common,
		entryPoints: ['src/client-entry.jsx'],
		platform: 'browser',
		format: 'iife',
		minify: true,
		outfile: `${outDir}/client.js`,
		define: { SERVER: 'false', 'process.env.NODE_ENV': '"production"' },
		plugins: [solidPlugin(target, 'dom')]
	});
	// the same client with Solid's observe tier: attribution records for timing
	await build({
		...common,
		entryPoints: ['src/client-entry.jsx'],
		platform: 'browser',
		format: 'iife',
		minify: true,
		conditions: ['observe'],
		outfile: `${outDir}/client.observe.js`,
		define: { SERVER: 'false', 'process.env.NODE_ENV': '"production"' },
		plugins: [solidPlugin(target, 'dom')]
	});
}

if (import.meta.url == 'file://' + process.argv[1]) {
	for (const l of process.argv.slice(2)) {
		await buildTarget(l);
		console.log('built', l);
	}
}
