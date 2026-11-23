import { makeGen, inPage, timePage } from './runner.js';

const TARGETS = [
	['stock', 'Solid 2.0.3 (npm `latest`, `<template id>` + `$df` swaps)'],
	['dpu', 'Solid `feat/stream-disarm-pe` (MaxwellCohen/solid#2: `<?start>` ranges + `<template for>`)']
];
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const md = (s) => esc(s).replace(/`([^`]*)`/g, '<code>$1</code>');
const short = (l) => TARGETS.find((t) => t[0] == l)[1].replace(/ \(.*$/, '').replace(/^(Step \d: boundary ranges \+ `<[^>]+>`).*/, '$1');
const label = (l) => TARGETS.find((t) => t[0] == l)[1];
const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '-');
const getJSON = (u) => fetch(u).then((r) => (r.ok ? r.json() : Promise.reject(new Error(u + ' ' + r.status))));

const scenarios = await getJSON('scenarios.json').catch(() => []);
const byName = Object.fromEntries(scenarios.map((s) => [s.name, s]));

// ---- recorded results ----
const results = await getJSON('results.json').catch(() => []);
{
	const order = ['stream', 'nojs', 'doc', 'async'];
	const rows = results.slice().sort((a, b) => {
		const ia = TARGETS.findIndex((t) => t[0] == a.label), ib = TARGETS.findIndex((t) => t[0] == b.label);
		return order.indexOf(a.mode) - order.indexOf(b.mode) || ['chrome', 'firefox', 'webkit'].indexOf(a.browser) - ['chrome', 'firefox', 'webkit'].indexOf(b.browser) || ia - ib;
	});
	$('res-note').textContent = rows.length
		? 'Rows with the same mode, browser and seed ran the same schedules, so compare builds within those groups. The Chrome stream rows all come from one comparison run.'
		: 'No recorded results were included in this build.';
	let h = '<thead><tr><th>Target<th class="l">Mode<th class="l">Browser<th>Schedules per tree<th>Seed<th>Trees passing<th>Failing runs<th>Runs with a glitch<th>Server DOM kept</tr></thead><tbody>';
	for (const r of rows) {
		const sc = Object.values(r.scenarios), pass = sc.filter((s) => !s.fails && !s.ssrFail).length, t = r.totals;
		h += `<tr><td title="${esc(label(r.label))}">${esc(short(r.label).replace(/`/g, ''))}<td class="l">${r.mode}<td class="l">${r.browser}<td>${r.n ?? ''}<td>${r.seed ?? ''}` +
			`<td class="${pass == sc.length ? 'ok' : 'bad'}">${pass}/${sc.length}<td class="${t.fails ? 'bad' : 'ok'}">${t.fails}/${t.runs}` +
			`<td class="${t.glitchRuns ? 'warn' : ''}">${t.glitchRuns}<td>${pct(t.kept, t.total)}</tr>`;
	}
	$('res-table').innerHTML = h + '</tbody>';
}

// ---- form ----
$('targets').innerHTML = TARGETS.map(([k, n]) => `<label><input type="checkbox" name="t" value="${k}" checked> ${md(n)}</label>`).join('');
$('pick').innerHTML = scenarios.map((s) => `<option>${esc(s.name)}</option>`).join('');
for (const r of document.getElementsByName('sel'))
	r.onchange = () => ($('pick').hidden = document.querySelector('[name=sel]:checked').value != 'pick');

// ---- side by side ----
const compare = await getJSON('compare.json').catch(() => []);
const recorded = {}, srcInfo = [];
for (const [k] of TARGETS) {
	const c = compare.find((r) => r.label == k), r = results.find((r) => r.label == k && r.mode == 'stream' && r.browser == 'chrome');
	if (c) (recorded[k] = c.scenarios), srcInfo.push(`${k}: comparison run (n=${c.n}, seed ${c.seed})`);
	else if (r) (recorded[k] = r.scenarios), srcInfo.push(`${k}: recorded run (n=${r.n}, seed ${r.seed})`);
	else srcInfo.push(`${k}: no recorded results`);
}
$('src-note').textContent = 'Sources: ' + srcInfo.join('; ') + '.';
// the JavaScript-off run: the same responses, scripts blocked
const recordedNoJs = {};
for (const [k] of TARGETS) {
	const r = results.find((r) => r.label == k && r.mode == 'nojs');
	if (r) recordedNoJs[k] = r.scenarios;
}
const yours = {};
const exs = [];
const sig = (x) => (!x ? null : x.fails ? 'fail' : x.ssrFail ? 'ssr' : x.glitchRuns ? 'glitch' : 'ok');
// first difference, widened to whole tags (a is marked against b)
function diff(a, b, cls) {
	a = a || '';
	if (b == null || a == b) return esc(a);
	let p = 0;
	while (p < a.length && p < b.length && a[p] == b[p]) p++;
	let t = 0;
	while (t < a.length - p && t < b.length - p && a[a.length - 1 - t] == b[b.length - 1 - t]) t++;
	p = a.lastIndexOf('<', p);
	if (p < 0) p = 0;
	const e = a.indexOf('>', a.length - t - 1);
	const end = e < 0 ? a.length : Math.max(e + 1, p);
	return esc(a.slice(0, p)) + `<mark class="${cls || ''}">` + esc(a.slice(p, end)) + '</mark>' + esc(a.slice(end));
}
const WORDS = { W: 'chunk', H: 'hydrate', U: 're-render', K: 'click every hydrated button', CUT: 'connection drops' };
function chips(schedule, order) {
	const sched = Array.isArray(schedule) ? schedule : String(schedule).split(' ');
	const step = (e) =>
		WORDS[e] ||
		(e.startsWith('Wa:') ? `first half of a chunk (cut at ${Math.round(parseFloat(e.slice(3)) * 100)}%)` : e == 'Wb' ? 'rest of the chunk' :
		e[0] == 'C' ? 'client promise ' + e.slice(2) + ' resolves' : e[0] == 'A' ? 'action: ' + e.slice(2) : e);
	const items = sched.filter((e) => e && e[0] != 'w').map((e) => `<li class="${e == 'H' ? 'h' : ''}">${esc(step(e))}</li>`);
	const o = Array.isArray(order) ? order.join('') : order || '';
	return `<ol class="chips" aria-label="Schedule"><li>first chunk</li>${items.join('')}${o ? `<li class="o">server promises resolve in order ${esc(o.split('').map((c) => (c == '!' ? '(the server aborts)' : c)).join(', '))}</li>` : ''}</ol>`;
}
function lineHTML(k, name, x, tag, noReplay) {
	if (!x) return `<div class="line"><span class="tag">${tag}</span> <span class="mute">no data</span></div>`;
	const bad = x.fails || x.ssrFail;
	let h = `<div class="line"><span class="tag">${tag}</span> <span class="pill ${bad ? 'bad' : 'ok'}" title="failing runs / runs">${x.fails}/${x.runs}</span> <span title="server DOM kept">kept ${pct(x.kept, x.total)}</span>` +
		(x.glitchRuns ? ` <span class="pill warn">glitch ${x.glitchRuns}</span>` : '') +
		(x.recov ? ` <span class="mute">recov ${x.recov}</span>` : '') +
		(x.ssrFail ? `<div class="mute">SSR: ${esc(x.ssrFail)}</div>` : '') +
		(x.rejected ? `<div class="mute">renderToStringAsync rejected, as expected when the server throws (${esc(x.rejected)}), so there's no page to hydrate.</div>` : '');
	for (const e of x.examples || []) {
		exs.push({ k, name, e });
		const [g, w] = e.want ? [diff(e.got, e.want), diff(e.want, e.got, 'ok')] : [esc(e.got), ''];
		h += `<div class="ex"><div>[${esc(e.phase)}] x${e.count}</div>${chips(e.schedule, e.order)}` +
			`<div class="gw${e.want ? '' : ' one'}">${e.want ? `<div><b>Expected</b><pre>${w}</pre></div>` : ''}<div><b>${e.want ? 'This build' : 'error'}</b><pre>${g}</pre></div></div>` +
			(noReplay ? '</div>' : `<button type="button" class="sec rp" data-ex="${exs.length - 1}">Replay</button><pre class="trace" hidden></pre></div>`);
	}
	if (x.glitch) {
		exs.push({ k, name, e: x.glitch });
		h += `<div class="ex g"><div>glitch: ${esc(x.glitch.text)}</div>${chips(x.glitch.schedule, x.glitch.order)}` +
			`<button type="button" class="sec rp" data-ex="${exs.length - 1}">Replay</button><pre class="trace" hidden></pre></div>`;
	}
	return h + '</div>';
}
function renderLine(card, k, which) {
	const name = card.dataset.n, el = card.querySelector(`[data-k="${k}"] .${which}`);
	if (which == 'rec') {
		const sc = byName[name];
		el.innerHTML =
			lineHTML(k, name, (recorded[k] || {})[name], 'JS on') +
			(sc && !sc.nojs
				? '<div class="line"><span class="tag">JS off</span> <span class="mute">not run: the expected page needs a script</span></div>'
				: recordedNoJs[k] ? lineHTML(k, name, recordedNoJs[k][name], 'JS off', true) : '');
	}
	else el.innerHTML = yours[k] && yours[k][name] ? lineHTML(k, name, yours[k][name], 'your run') : '';
}
const flags = {};
function applyFilters() {
	const diff = $('f-diff').checked, failing = $('f-fail').checked, q = $('f-name').value.trim().toLowerCase();
	let shown = 0;
	for (const c of $('cards').children) {
		const n = c.dataset.n;
		const lines = [TARGETS.map(([k]) => sig((recorded[k] || {})[n])), TARGETS.map(([k]) => sig((yours[k] || {})[n]))];
		const differs = lines.some((l) => new Set(l.filter(Boolean)).size > 1);
		const fails = lines.some((l) => l.some((x) => x == 'fail' || x == 'ssr'));
		const ok = (!diff || differs) && (!failing || fails) && (!q || n.toLowerCase().includes(q));
		c.hidden = !ok;
		if (ok) shown++;
	}
	$('f-count').textContent = `Showing ${shown} of ${$('cards').children.length}`;
}
$('cards').innerHTML = scenarios.map((s) =>
	`<section class="card" data-n="${esc(s.name)}"><h3>${esc(s.name)}</h3><div class="gates">server waits on [${esc(s.serverGates)}], client waits on [${esc(s.clientGates)}]${s.seq.length ? ', seq=[' + esc(s.seq) + ']' : ''}</div>` +
	`<p class="about" style="margin:.4em 0">${esc(s.about)}</p>` +
	`<details class="src"><summary>JSX</summary><pre>${esc(s.source)}</pre></details><div class="ctl"><button type="button" class="rb">Run in this browser</button> <span class="mute st"></span></div><div class="live" hidden></div><div class="cols">` +
	TARGETS.map(([k]) => `<div class="col" data-k="${k}"><h4 title="${esc(label(k))}">${esc(short(k).replace(/\`/g, ''))}</h4><div class="rec"></div><div class="you"></div></div>`).join('') +
	'</div></section>').join('');
for (const c of $('cards').children) for (const [k] of TARGETS) renderLine(c, k, 'rec');
$('f-diff').onchange = $('f-fail').onchange = $('f-name').oninput = applyFilters;
$('f-src').onclick = () => {
	const open = $('f-src').textContent.startsWith('Show');
	for (const d of document.querySelectorAll('.card details.src')) d.open = open;
	$('f-src').textContent = open ? 'Hide all JSX' : 'Show all JSX';
};
applyFilters();

// ---- runner ----
const bundles = new Map(), datas = new Map();
const load = async (k) => {
	if (!bundles.has(k)) bundles.set(k, fetch(`${k}.client.js`).then((r) => r.text()));
	if (!datas.has(k)) datas.set(k, getJSON(`data/${k}.json`));
	return [await bundles.get(k), await datas.get(k)];
};
const restore = (d, w) => w.replace(/@@INIT(\d+)@@/g, (_, i) => d.inits[i]);
const num = (id, dflt) => (isFinite(parseFloat($(id).value)) ? parseFloat($(id).value) : dflt);
let stopped = false;

function runJob(k, bundle, sc, j, trace, mount) {
	return inPage({
		name: sc.name, writes: j.writes, schedule: j.schedule, bundle, cs: sc.clientGates, trace,
		settle: k == 'react' ? 4000 : 700,
		canonIds: sc.name == 'useId',
		noMount: /^later/.test(sc.name),
		expectErrors: !!sc.expectErrors,
		dupOk: !!sc.dupOk,
		doc: k == 'react',
		mount,
		reveal: sc.reveal
	});
}

async function runAll() {
	const ks = [...document.querySelectorAll('[name=t]:checked')].map((e) => e.value);
	const pickSel = document.querySelector('[name=sel]:checked').value == 'pick';
	const chosen = pickSel ? [...$('pick').selectedOptions].map((o) => o.value) : null;
	const list = scenarios.filter((s) => !chosen || chosen.includes(s.name));
	if (!ks.length || !list.length) return ($('progress').textContent = 'Pick at least one target and one scenario.');
	const N = Math.max(1, num('n', 10)), split = num('split', 0.35), cut = num('cut', 0.1), seed = num('seed', 1);
	stopped = false;
	$('run').disabled = true;
	$('stop').disabled = false;
	$('out-wrap').hidden = false;
	for (const k in yours) delete yours[k];
	for (const c of $('cards').children) for (const [k] of TARGETS) renderLine(c, k, 'you');
	applyFilters();
	$('out').innerHTML = '<thead><tr><th>Scenario<th>Target<th>Fails/runs<th>Kept<th>Glitches<th class="l">Notes</tr></thead><tbody></tbody>';
	const tb = $('out').tBodies[0];
	$('bar').hidden = false;
	$('bar').max = ks.length * list.length;
	$('bar').value = 0;
	const sum = {};
	let done = 0;
	try {
		for (const k of ks) {
			$('progress').textContent = `Loading ${k}...`;
			const [bundle, data] = await load(k);
			const gen = makeGen({ seed, split, cut });
			const t = (sum[k] = { runs: 0, fails: 0, glitch: 0, kept: 0, total: 0, litter: 0, bad: 0 });
			for (const sc of list) {
				if (stopped) break;
				$('progress').textContent = `${short(k).replace(/`/g, '')}: ${sc.name} (${done + 1}/${ks.length * list.length})`;
				const recs = data.scenarios[sc.name];
				const jobs = [], seen = new Set();
				let ssrFail;
				for (let i = 0; i < N; i++) {
					const rec = gen.pick(recs);
					if (!rec.writes) {
						ssrFail = rec.error;
						continue;
					}
					const writes = rec.writes.map((w) => restore(data, w));
					const schedule = gen.genSchedule(sc, writes.length - 1);
					const key = rec.order.join('') + '|' + schedule.join(' ');
					if (seen.has(key)) continue;
					seen.add(key);
					jobs.push({ order: rec.order, writes, schedule });
				}
				const fails = [], passes = [];
				const CONC = k == 'react' ? 8 : 12;
				for (let i = 0; i < jobs.length && !stopped; i += CONC) {
					const rs = await Promise.all(jobs.slice(i, i + CONC).map((j) => runJob(k, bundle, sc, j, false)));
					rs.forEach((r, x) => (r.ok ? passes : fails).push({ ...jobs[i + x], ...r }));
				}
				const all = [...passes, ...fails];
				const glitch = all.filter((r) => r.glitches.length).length;
				const kept = passes.reduce((n, r) => n + r.kept, 0), total = passes.reduce((n, r) => n + r.total, 0);
				const litter = passes.filter((r) => r.litter).length, recov = all.filter((r) => r.recoverable.length).length;
				t.runs += jobs.length; t.fails += fails.length; t.glitch += glitch; t.kept += kept; t.total += total; t.litter += litter;
				if (fails.length || ssrFail) t.bad++;
				const bad = fails.length || ssrFail || glitch;
				const tr = tb.insertRow();
				tr.innerHTML = `<td>${esc(sc.name)}<td>${esc(k)}<td class="${fails.length || ssrFail ? 'bad' : glitch ? 'warn' : 'ok'}">${fails.length}/${jobs.length}` +
					`<td>${pct(kept, total)}<td class="${glitch ? 'warn' : ''}">${glitch || ''}` +
					`<td class="l">${esc((recov ? 'recov ' + recov + ' ' : '') + (ssrFail ? 'SSR: ' + ssrFail : ''))}</tr>`;
				const groups = {};
				for (const f of fails) (groups[f.phase + '|' + f.got + '|' + f.want] ||= []).push(f);
				const g0 = all.find((r) => r.glitches.length);
				(yours[k] ||= {})[sc.name] = {
					runs: jobs.length, fails: fails.length, glitchRuns: glitch, kept, total, litter, recov, ssrFail,
					examples: Object.values(groups).slice(0, 3).map((g) => ({ phase: g[0].phase, count: g.length, order: g[0].order.join(''), schedule: g[0].schedule.join(' '), got: g[0].got, want: g[0].want })),
					glitch: g0 ? { text: g0.glitches[0], order: g0.order.join(''), schedule: g0.schedule.join(' ') } : undefined
				};
				renderLine(document.querySelector(`.card[data-n="${sc.name}"]`), k, 'you');
				applyFilters();
				done++;
				$('bar').value = done;
				await new Promise((r) => setTimeout(r));
			}
			if (stopped) break;
		}
		const tr = tb.insertRow();
		tr.innerHTML = '<td colspan="6" class="l"><b>Totals</b></td>';
		for (const k of ks) {
			const t = sum[k];
			if (!t) continue;
			const r = tb.insertRow();
			r.innerHTML = `<td><b>total</b><td>${esc(k)}<td class="${t.fails ? 'bad' : 'ok'}">${t.fails}/${t.runs}<td>${pct(t.kept, t.total)}<td>${t.glitch || ''}<td class="l">${t.bad}/${list.length} scenarios fail</tr>`;
		}
		$('progress').textContent = stopped ? 'Stopped.' : 'Done.';
	} catch (e) {
		$('progress').textContent = 'Error: ' + (e && e.message || e);
	}
	$('bar').hidden = true;
	$('run').disabled = false;
	$('stop').disabled = true;
}

// What the user sees in a frame: elements and text, like the harness's ser().
const shown = (n) =>
	n.nodeType == 3 || (n.nodeType == 1 && !/^(script|template|link|style)$/.test(n.localName) && !n.hidden);
const attrs = (e) =>
	e.namespaceURI + ' ' + e.localName + ' ' + [...e.attributes].filter((a) => a.name != 'style' || a.value).map((a) => a.name + '=' + a.value).sort().join(' ');
// The first node of the live page that differs from the expected render, as
// the element to outline. An element in the wrong namespace inside svg/math
// isn't drawn, so its drawing root gets the outline.
function firstDiff(got, want) {
	const a = [...got.childNodes].filter(shown), b = [...want.childNodes].filter(shown);
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		const x = a[i], y = b[i];
		if (!x) return got;
		if (!y || x.nodeType != y.nodeType) return x.nodeType == 1 ? x : got;
		if (x.nodeType == 3) {
			if (x.data != y.data) return got;
			continue;
		}
		if (attrs(x) != attrs(y)) return x.namespaceURI != y.namespaceURI ? x.closest('svg,math') || x : x;
		const inner = firstDiff(x, y);
		if (inner) return inner;
	}
	return null;
}
function markFrame(frame, ok) {
	const box = frame.closest('.frame');
	box.classList.add(ok ? 'ok' : 'bad');
	if (ok) return;
	try {
		const d = frame.contentDocument, root = d.getElementById('root'), ref = d.querySelector('[data-expected]');
		const el = root && ref && firstDiff(root, ref);
		if (el && el.style) {
			el.style.outline = '3px solid #e5484d';
			el.style.outlineOffset = '2px';
		}
	} catch {}
}
// A static copy of the expected render, from a frame's reference render
function expectedFrame(live) {
	for (const f of live.querySelectorAll('.frames iframe')) {
		try {
			const ref = f.contentDocument.querySelector('[data-expected]');
			if (!ref || !ref.childNodes.length) continue;
			const box = document.createElement('div');
			box.className = 'frame exp';
			box.innerHTML = '<h4>Expected <span class="pill">a fresh client render</span></h4>';
			const e = document.createElement('iframe');
			box.append(e);
			live.querySelector('.frames').prepend(box);
			const d = e.contentDocument;
			d.open();
			d.write('<!doctype html><body>' + ref.innerHTML + '</body>');
			d.close();
			e.style.height = f.style.height;
			return;
		} catch {}
	}
}

// one order + schedule against every build, frames kept on the page
async function runLive(card, name, order, schedule, tracePre, tracek) {
	const sc = byName[name], live = card.querySelector('.live'), st = card.querySelector('.st');
	card.querySelector('.rb').disabled = true;
	live.hidden = false;
	live.innerHTML = `<div class="mute">Schedule used:</div>${chips(schedule, order)}<div class="frames">` +
		TARGETS.map(([k]) => `<div class="frame"><h4 title="${esc(label(k))}">${esc(short(k).replace(/`/g, ''))} <span class="pill warn" data-pill="${k}">running</span></h4><div data-slot="${k}"></div><pre class="got" data-got="${k}" hidden></pre></div>`).join('') + '</div>';
	st.textContent = 'Running...';
	const sch = Array.isArray(schedule) ? schedule : schedule.split(' ');
	const rs = await Promise.all(TARGETS.map(async ([k]) => {
		try {
			const [bundle, data] = await load(k);
			const rec = data.scenarios[name].find((r) => r.writes && r.order.join('') == order);
			if (!rec) return { missing: true };
			return await runJob(k, bundle, sc, { writes: rec.writes.map((w) => restore(data, w)), schedule: sch }, true, live.querySelector(`[data-slot="${k}"]`));
		} catch (err) {
			return { ok: false, phase: 'exception', got: String(err && err.message || err) };
		}
	}));
	const want = (rs.find((r) => r.ok === false && r.want) || {}).want ?? (rs.find((r) => r.ok) || {}).got;
	TARGETS.forEach(([k], i) => {
		const r = rs[i], pill = live.querySelector(`[data-pill="${k}"]`), got = live.querySelector(`[data-got="${k}"]`);
		pill.className = 'pill ' + (r.missing ? 'warn' : r.ok ? 'ok' : 'bad');
		pill.textContent = r.missing ? 'no recorded response for this order' : r.ok ? 'matches the client render' : `differs at the "${r.phase}" check`;
		got.hidden = !!r.missing;
		got.innerHTML = '<code>' + (r.ok ? esc(r.got) : diff(r.got, r.want || want)) + '</code>';
		if (tracePre && k == tracek) tracePre.textContent = (r.ok ? 'Passed this time.\n' : `[${r.phase}] failed\n`) + (r.log || []).join('\n');
		const f = live.querySelector(`[data-slot="${k}"] iframe`);
		if (f && !r.missing) markFrame(f, r.ok);
	});
	expectedFrame(live);
	const ex = document.createElement('div');
	ex.innerHTML = want ? `<div class="mute">Expected (the same tree rendered from scratch):</div><pre class="got"><code>${esc(want)}</code></pre>` : '';
	live.querySelector('.frames').before(ex);
	st.textContent = 'The frames are the live pages. The check clicks the same buttons in each page and in the expected render, so a passing page shows the same counts as the Expected frame. A red frame failed: the red outline marks the first element that differs from the expected render.';
	card.querySelector('.rb').disabled = false;
}
$('cards').addEventListener('click', async (ev) => {
	const b = ev.target.closest('button');
	if (!b) return;
	const card = b.closest('.card');
	if (b.classList.contains('rp')) {
		const { k, name, e } = exs[b.dataset.ex], out = b.nextElementSibling;
		b.disabled = true;
		out.hidden = false;
		out.textContent = 'Replaying...';
		try {
			await runLive(card, name, e.order || '', e.schedule, out, k);
		} catch (err) {
			out.textContent = 'Replay failed: ' + (err && err.message || err);
		}
		b.disabled = false;
	} else if (b.classList.contains('rb')) {
		await runCard(card);
	}
});

// "Run in this browser" for one card: the first recorded failure's order and
// schedule, or a random schedule when no build failed this tree
async function runCard(card) {
	const name = card.dataset.n, sc = byName[name];
	const first = TARGETS.map(([k]) => ((recorded[k] || {})[name] || {}).examples).find((e) => e && e.length);
	try {
		if (first) return await runLive(card, name, first[0].order || '', first[0].schedule);
		const [, data] = await load(TARGETS[0][0]);
		const rec = data.scenarios[name].find((r) => r.writes) || data.scenarios[name][0];
		const g = makeGen({ seed: (Date.now() % 100000) + 1, split: 0.35, cut: 0.1 });
		await runLive(card, name, rec.order.join(''), g.genSchedule(sc, (rec.writes || [1]).length - 1));
	} catch (err) {
		card.querySelector('.st').textContent = 'Failed: ' + (err && err.message || err);
		card.querySelector('.rb').disabled = false;
	}
}

// "Run all in this browser": every card the filters show, two at a time
let runningAll = false, stopAll = false;
$('f-runall').onclick = async () => {
	const btn = $('f-runall'), st = $('f-runst');
	if (runningAll) {
		stopAll = true;
		btn.textContent = 'Stopping...';
		return;
	}
	runningAll = true;
	stopAll = false;
	btn.textContent = 'Stop';
	const queue = [...$('cards').children].filter((c) => !c.hidden);
	const total = queue.length, matched = {};
	let done = 0;
	const report = () => {
		st.textContent = `${done} of ${total} trees run. Trees that matched the client render: ` +
			TARGETS.map(([k]) => `${short(k).replace(/`/g, '')} ${matched[k] || 0}`).join(', ') + '.';
	};
	report();
	const worker = async () => {
		while (!stopAll && queue.length) {
			const card = queue.shift();
			await runCard(card);
			for (const [k] of TARGETS) {
				const pill = card.querySelector(`[data-pill="${k}"]`);
				if (pill && pill.classList.contains('ok')) matched[k] = (matched[k] || 0) + 1;
			}
			done++;
			report();
		}
	};
	await Promise.all([worker(), worker()]);
	if (stopAll) st.textContent = 'Stopped. ' + st.textContent;
	runningAll = false;
	btn.textContent = 'Run all in this browser';
};

$('run').onclick = runAll;
$('stop').onclick = () => (stopped = true);

// ---- timing ----
const timing = await getJSON('timing.json').catch(() => ({}));
const TCOLS = [
	['settleMs', 'settle ms', (x) => x.toFixed(1)],
	['flushes', 'flushes', (x) => x],
	['flushMs', 'flush ms', (x) => x.toFixed(1)],
	['runs', 'runs', (x) => x],
	['fallbacks', 'fallbacks', (x) => x],
	['fallbackMs', 'fallback ms', (x) => x.toFixed(0)]
];
function timingTable(src, note) {
	const ks = TARGETS.map(([k]) => k).filter((k) => src[k]);
	if (!ks.length) {
		$('tim-table').innerHTML = '';
		$('tim-note').textContent = 'No recorded timing was included in this build.';
		return;
	}
	$('tim-note').textContent = note;
	let h = '<thead><tr><th>Scenario' + TCOLS.map(([, n]) => ks.map((k) => `<th class="h" title="${esc(label(k))}">${n}<br>${esc(short(k).replace(/`/g, ''))}`).join('')).join('') + '</tr></thead><tbody>';
	const sum = {};
	for (const s of scenarios) {
		h += `<tr><td>${esc(s.name)}`;
		for (const [c, , fmt] of TCOLS) {
			const vals = ks.map((k) => (src[k].scenarios[s.name] || {})[c]);
			const nums = vals.filter((v) => v != null);
			const best = nums.length > 1 ? Math.min(...nums) : null, worst = nums.length > 1 ? Math.max(...nums) : null;
			vals.forEach((v, i) => {
				((sum[c] ||= {})[ks[i]] ||= 0), v != null && (sum[c][ks[i]] += v);
				// only differences worth reading are marked: 20% and more than noise
				const mark = v != null && best != worst && worst - best > (c.endsWith('Ms') ? 2 : 0.5) && worst > best * 1.2 ? (v == best ? 'ok' : v == worst ? 'warn' : '') : '';
				h += `<td class="${mark}">${v == null ? '-' : fmt(v)}`;
			});
		}
		h += '</tr>';
	}
	h += '<tr><td><b>total</b>' + TCOLS.map(([c, , fmt]) => ks.map((k) => `<td><b>${fmt(sum[c][k])}</b>`).join('')).join('') + '</tr>';
	$('tim-table').innerHTML = h + '</tbody>';
}
timingTable(timing, Object.keys(timing).length ? 'Recorded in headless Chrome: ' + Object.entries(timing).map(([k, t]) => `${k} ${t.k} loads per tree`).join(', ') + '. Green: the lower value where the builds differ by more than 20% and the noise floor; amber: the higher.' : '');
const obsBundles = new Map();
$('tim-run').onclick = async () => {
	const btn = $('tim-run'), st = $('tim-st');
	btn.disabled = true;
	const K = 3, mine = {};
	try {
		for (const [k] of TARGETS) {
			if (!obsBundles.has(k)) obsBundles.set(k, fetch(`${k}.client.observe.js`).then((r) => r.text()));
			const [, data] = await load(k);
			const bundle = await obsBundles.get(k);
			const t = (mine[k] = { k: K, scenarios: {} });
			let i = 0;
			for (const sc of scenarios) {
				st.textContent = `${short(k).replace(/`/g, '')}: ${sc.name} (${++i}/${scenarios.length})`;
				const rec = data.scenarios[sc.name].find((r) => r.writes);
				if (!rec) continue;
				const writes = rec.writes.map((w) => restore(data, w));
				const rs = [];
				for (let j = 0; j < K; j++) rs.push(await timePage({ name: sc.name, writes, bundle, cs: sc.clientGates }));
				const m = {};
				for (const [c] of TCOLS) {
					const xs = rs.map((r) => r[c]).filter((x) => x != null).sort((a, b) => a - b);
					m[c] = xs.length ? xs[Math.floor(xs.length / 2)] : null;
				}
				t.scenarios[sc.name] = m;
			}
		}
		timingTable(mine, `Timed in this browser: ${K} loads per tree, medians. Green: the lower value where the builds differ by more than 20% and the noise floor; amber: the higher.`);
		st.textContent = 'Done.';
	} catch (e) {
		st.textContent = 'Failed: ' + ((e && e.message) || e);
	}
	btn.disabled = false;
};
