// node build-site.mjs : records each target's streamed responses into
// <site>/data/, copies its client bundle, the page, scenarios.json and the
// latest out/<target>/summary.stream.json results. <site> defaults to the
// ssr demo's public/harness/, so the demo deploy serves it at /harness/.
import fs from 'fs';
import { buildTarget, TARGETS } from './build.mjs';

const here = new URL('.', import.meta.url).pathname;
const site = process.env.SITE_DIR || `${here}../templates/ssr/public/harness/`;
const MAX_ORDERS = 6;

let seed = 12345;
const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
function orders(s) {
	if (s.length <= 1) return [[...s]];
	const key = (a) => a.join('\u0000');
	const out = [[...s]],
		seen = new Set([key(s)]);
	let total = 1;
	for (let i = 2; i <= s.length; i++) total *= i;
	const want = Math.min(MAX_ORDERS, total);
	while (out.length < want) {
		const a = [...s];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(rnd() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		if (!seen.has(key(a))) (seen.add(key(a)), out.push(a));
	}
	return out;
}

fs.mkdirSync(site + 'data', { recursive: true });
for (const f of ['index.html', 'app.js', 'runner.js']) fs.copyFileSync(`${here}site/${f}`, site + f);
let scenarioMeta;
for (const label of Object.keys(TARGETS)) {
	const dir = `${here}out/${label}`;
	await buildTarget(label, dir);
	const { ssr, scenarios } = await import(`${dir}/ssr.mjs?${Date.now()}`);
	const inits = [];
	const strip = (w) =>
		w.replace(/<script>([^<]|<(?!\/script>)){200,}?<\/script>/g, (m) => {
			const body = m.slice(8, -9);
			let i = inits.indexOf(body);
			if (i < 0) i = inits.push(body) - 1;
			return `<script>@@INIT${i}@@</script>`;
		});
	const data = {};
	for (const name of Object.keys(scenarios)) {
		data[name] = [];
		for (const order of orders(scenarios[name].serverGates)) {
			const res = await ssr(name, order);
			data[name].push(
				res.writes ? { order, writes: res.writes.map(strip) } : { order, error: (res.errors || []).join(' | ') }
			);
		}
	}
	fs.writeFileSync(`${site}data/${label}.json`, JSON.stringify({ label, name: TARGETS[label], inits, scenarios: data }));
	fs.copyFileSync(`${dir}/client.js`, `${site}${label}.client.js`);
	fs.copyFileSync(`${dir}/client.observe.js`, `${site}${label}.client.observe.js`);
	scenarioMeta = scenarios;
	console.log('recorded', label, 'inits', inits.length);
}

// scenarios.json: metadata and each tree's source
{
	const lines = fs.readFileSync(here + 'src/scenarios.jsx', 'utf8').split('\n');
	const start = lines.findIndex((l) => l.startsWith('export const scenarios = {'));
	const src = {};
	for (let i = start + 1; i < lines.length; i++) {
		const m = /^\t(\w+): \{\s*$/.exec(lines[i]);
		if (!m) continue;
		let j = i;
		while (!/^\t\},?\s*$/.test(lines[j])) j++;
		src[m[1]] = lines
			.slice(i, j + 1)
			.map((l) => l.replace(/^\t/, ''))
			.join('\n')
			.replace(/,$/, '');
		i = j;
	}
	const out = Object.keys(scenarioMeta).map((name) => {
		const sc = scenarioMeta[name];
		return {
			name,
			about: sc.about || '',
			serverGates: sc.serverGates,
			clientGates: sc.clientGates,
			seq: sc.seq || [],
			expectErrors: !!sc.expectErrors,
			dupOk: !!sc.dupOk,
			source: src[name] || ''
		};
	});
	const missing = out.filter((o) => !o.source).map((o) => o.name);
	if (missing.length) console.warn('no source for', missing.join(','));
	fs.writeFileSync(site + 'scenarios.json', JSON.stringify(out));
}

// recorded results: every target ran the same seed and schedules
{
	const results = [];
	for (const label of Object.keys(TARGETS)) {
		const p = `${here}out/${label}/summary.stream.json`;
		if (!fs.existsSync(p)) continue;
		const j = JSON.parse(fs.readFileSync(p, 'utf8'));
		results.push({ label, mode: 'stream', browser: 'chrome', n: j.n, seed: j.seed, totals: j.totals, scenarios: j.scenarios });
	}
	fs.writeFileSync(site + 'results.json', JSON.stringify(results));
	fs.writeFileSync(site + 'compare.json', JSON.stringify(results));
	const timing = {};
	for (const label of Object.keys(TARGETS)) {
		const p = `${here}out/${label}/timing.json`;
		if (fs.existsSync(p)) timing[label] = JSON.parse(fs.readFileSync(p, 'utf8'));
	}
	fs.writeFileSync(site + 'timing.json', JSON.stringify(timing));
	console.log('results', results.length);
}
