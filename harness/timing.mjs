// node timing.mjs target=dpu [k=5] [gap=30] [only=a,b] [nobuild=1]
// Times every tree with the observe bundle (site/runner.js timePage): the
// recorded first server order, k loads, medians. Writes out/<target>/timing.json.
import fs from 'fs';
import { buildTarget } from './build.mjs';
import { timePage } from './site/runner.js';

const args = Object.fromEntries(
	process.argv.slice(2).map((a) => {
		const i = a.indexOf('=');
		return i < 0 ? [a, '1'] : [a.slice(0, i), a.slice(i + 1)];
	})
);
const label = args.target || 'dpu';
const outName = args.out || label;
const K = +(args.k || 5);
const gap = +(args.gap || 30);
const only = args.only && args.only.split(',');
const here = new URL('.', import.meta.url);
if (!args.nobuild) await buildTarget(label);
const { ssr, scenarios } = await import(new URL(`./out/${outName}/ssr.mjs?${Date.now()}`, here));
const bundle = fs.readFileSync(new URL(`./out/${outName}/client.observe.js`, here), 'utf8');

const { chromium } = await import(args.pw || '/Users/maxcohen/code/inlay/node_modules/playwright-core/index.mjs');
const browser = await chromium.launch({
	executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	headless: true,
	args: ['--enable-experimental-web-platform-features']
});
const page = await browser.newPage();
await page.goto('about:blank');
const median = (xs) => {
	xs = xs.filter((x) => x != null).sort((a, b) => a - b);
	return xs.length ? xs[Math.floor(xs.length / 2)] : null;
};
const KEYS = ['hydrateMs', 'settleMs', 'totalMs', 'flushes', 'flushMs', 'runs', 'created', 'flights', 'flightMs', 'fallbacks', 'fallbackMs'];
const out = {};
for (const name of Object.keys(scenarios)) {
	if (only && !only.includes(name)) continue;
	const sc = scenarios[name];
	// the first recorded order, the one the page times too
	const res = await ssr(name, sc.serverGates);
	if (!res.writes) {
		out[name] = { error: res.errors.join(' | ') };
		console.log(`skip ${name}: ${out[name].error}`);
		continue;
	}
	const rs = [];
	// one at a time: timings in parallel frames would share the main thread
	for (let i = 0; i < K; i++)
		rs.push(await page.evaluate(timePage, { name, writes: res.writes, bundle, cs: sc.clientGates, gap }));
	const m = { n: K, ok: rs.filter((r) => r.ok).length };
	for (const k of KEYS) m[k] = median(rs.map((r) => r[k]));
	out[name] = m;
	console.log(
		`${name.padEnd(22)} settle ${String(m.settleMs?.toFixed(1)).padStart(6)}ms hydrate ${m.hydrateMs?.toFixed(2)}ms` +
			` flushes ${m.flushes} (${m.flushMs?.toFixed(2)}ms, ${m.runs} runs) fallbacks ${m.fallbacks} (${m.fallbackMs?.toFixed(0)}ms) ok ${m.ok}/${K}`
	);
}
fs.writeFileSync(new URL(`./out/${outName}/timing.json`, here), JSON.stringify({ label, k: K, gap, scenarios: out }, null, 1));
await browser.close();
