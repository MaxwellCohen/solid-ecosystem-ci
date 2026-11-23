// node run.mjs target=dpu [n=40] [seed=1] [only=a,b] [split=0.25] [cut=0.1]
//                [tag=name] [order=ab] [sched="W w2 H"] [trace=1] [raw=1] [show=3] [nobuild=1]
// The schedules and the in-page check are site/runner.js, the same code the
// browser page runs.
import fs from 'fs';
import { buildTarget } from './build.mjs';
import { makeGen, inPage, noJsPage } from './site/runner.js';

process.on('unhandledRejection', (e) => console.warn('unhandled rejection in ssr:', (e && e.message) || e));
const args = Object.fromEntries(
	process.argv.slice(2).map((a) => {
		const i = a.indexOf('=');
		return i < 0 ? [a, '1'] : [a.slice(0, i), a.slice(i + 1)];
	})
);
const label = args.target || 'dpu';
const outName = args.out || label;
const mode = args.mode || 'stream';
const N = +(args.n || 40);
const only = args.only && args.only.split(',');
const here = new URL('.', import.meta.url);

if (!args.nobuild) await buildTarget(label);
const { ssr, scenarios } = await import(new URL(`./out/${outName}/ssr.mjs?${Date.now()}`, here));
const bundle = fs.readFileSync(new URL(`./out/${outName}/client.js`, here), 'utf8');
const gen = makeGen({ seed: +(args.seed || 1), split: args.split == null ? 0.25 : +args.split, cut: +(args.cut || 0), wait: args.wait });

const { chromium } = await import(args.pw || '/Users/maxcohen/code/inlay/node_modules/playwright-core/index.mjs');
const browser = await chromium.launch({
	executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	headless: true,
	args: ['--enable-experimental-web-platform-features']
});
const page = await browser.newPage();
await page.goto('about:blank');
const summary = {};
const tot = { runs: 0, fails: 0, glitchRuns: 0, kept: 0, total: 0, recov: 0, litter: 0 };
const cache = new Map();
for (const name of Object.keys(scenarios)) {
	if (only && !only.includes(name)) continue;
	const sc = scenarios[name];
	if (mode == 'nojs' && sc.nojs === false) continue;
	const jobs = [],
		seen = new Set();
	let ssrFail;
	for (let i = 0; i < N; i++) {
		const order = args.order != null ? args.order.split('').filter(Boolean) : gen.shuffle(sc.serverGates);
		const ok = name + '|' + order.join('');
		if (!cache.has(ok)) cache.set(ok, await ssr(name, order));
		const res = cache.get(ok);
		if (!res.writes) {
			ssrFail = res.errors.join(' | ');
			continue;
		}
		const schedule = args.sched
			? args.sched.split(' ')
			: mode == 'nojs'
				? gen.genNoJs(res.writes.length - 1)
				: gen.genSchedule(sc, res.writes.length - 1);
		const key = order.join('') + '|' + schedule.join(' ');
		if (seen.has(key)) continue;
		seen.add(key);
		jobs.push({ name, order, writes: res.writes, schedule });
	}
	const fails = [],
		passes = [];
	const CONC = 12;
	for (let i = 0; i < jobs.length; i += CONC) {
		const rs = await Promise.all(
			jobs.slice(i, i + CONC).map((j) =>
				mode == 'nojs'
					? page.evaluate(noJsPage, { name: j.name, writes: j.writes, schedule: j.schedule, bundle, reveal: sc.reveal, canonIds: name == 'useId' })
					: page.evaluate(inPage, {
					name: j.name,
					writes: j.writes,
					schedule: j.schedule,
					bundle,
					cs: sc.clientGates,
					trace: !!args.trace,
					settle: 700,
					canonIds: name == 'useId',
					noMount: /^later/.test(name),
					expectErrors: !!sc.expectErrors,
					dupOk: !!sc.dupOk,
					doc: false,
					reveal: sc.reveal
				})
			)
		);
		rs.forEach((r, k) => (r.ok ? passes : fails).push({ ...jobs[i + k], ...r }));
	}
	fails.sort((a, b) => a.schedule.length - b.schedule.length);
	const all = [...passes, ...fails];
	for (const r of all) (r.glitches ||= []), (r.recoverable ||= []), (r.kept ||= 0), (r.total ||= 0);
	const glitchRuns = all.filter((r) => r.glitches.length).length;
	const kept = passes.reduce((n, r) => n + r.kept, 0),
		total = passes.reduce((n, r) => n + r.total, 0),
		recov = all.filter((r) => r.recoverable.length).length,
		litter = passes.filter((r) => r.litter).length;
	summary[name] = { runs: jobs.length, fails: fails.length, glitchRuns, kept, total, recov, litter, ssrFail };
	tot.runs += jobs.length;
	tot.fails += fails.length;
	tot.glitchRuns += glitchRuns;
	tot.kept += kept;
	tot.total += total;
	tot.recov += recov;
	tot.litter += litter;
	const bad = fails.length || ssrFail || glitchRuns;
	console.log(
		`${bad ? 'FAIL' : 'ok  '} ${name.padEnd(22)} ${String(fails.length).padStart(3)}/${String(jobs.length).padEnd(3)}` +
			` kept ${total ? Math.round((100 * kept) / total) : '-'}%` +
			(glitchRuns ? ` glitch ${glitchRuns}` : '') +
			(litter ? ` litter ${litter}` : '') +
			(ssrFail ? ` SSR: ${ssrFail}` : '')
	);
	const groups = {};
	for (const f of fails) (groups[f.phase + '|' + f.got + '|' + f.want] ||= []).push(f);
	const glitch = all.find((r) => r.glitches.length);
	summary[name].examples = Object.values(groups)
		.slice(0, 3)
		.map((g) => ({ phase: g[0].phase, count: g.length, order: g[0].order.join(''), schedule: g[0].schedule.join(' '), got: g[0].got, want: g[0].want }));
	if (glitch) summary[name].glitch = { text: glitch.glitches[0], order: glitch.order.join(''), schedule: glitch.schedule.join(' ') };
	for (const g of Object.values(groups).slice(0, +(args.show || 1))) {
		const f = g[0];
		console.log(`   [${f.phase}] x${g.length} order=${f.order.join('')} sched: ${f.schedule.join(' ')}`);
		console.log('     got : ' + String(f.got).slice(0, 600));
		if (f.want != null) console.log('     want: ' + String(f.want).slice(0, 600));
		if (f.errors && f.errors.length) console.log('     errs: ' + [...new Set(f.errors)].join(' | ').slice(0, 400));
		if (args.trace) console.log(f.log.join('\n'));
		if (args.raw) console.log('     raw : ' + f.raw);
	}
	if (args.trace && !fails.length && passes[0]) console.log(passes[0].log.join('\n'));
}
const shapes = Object.values(summary);
console.log(
	`\n${label} (${mode}): ${shapes.filter((s) => !s.fails && !s.ssrFail).length}/${shapes.length} scenarios pass, ` +
		`${tot.fails}/${tot.runs} runs fail, ${tot.glitchRuns} runs glitch, ` +
		`server DOM kept ${tot.total ? Math.round((100 * tot.kept) / tot.total) : '-'}%, ${tot.litter} runs leave litter`
);
fs.mkdirSync(new URL(`./out/${outName}/`, here), { recursive: true });
fs.writeFileSync(
	new URL(`./out/${outName}/summary.${mode}${args.tag ? '.' + args.tag : ''}.json`, here),
	JSON.stringify({ label, mode, n: N, seed: +(args.seed || 1), totals: tot, scenarios: summary }, null, 1)
);
await browser.close();
