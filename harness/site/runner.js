// Same logic as run.mjs (genSchedule, inPage), made importable. Keep in sync.
export function makeGen({ seed = 1, split = 0.25, cut = 0, wait } = {}) {
	const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
	const pick = (a) => a[Math.floor(rnd() * a.length)];
	const shuffle = (a) => {
		a = [...a];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(rnd() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	};
	function mergeRandom(seqs) {
		seqs = seqs.map((s) => [...s]).filter((s) => s.length);
		const out = [];
		while (seqs.length) {
			const i = Math.floor(rnd() * seqs.length);
			out.push(seqs[i].shift());
			if (!seqs[i].length) seqs.splice(i, 1);
		}
		return out;
	}

	function genSchedule(sc, nWrites) {
		const ws = [];
		for (let i = 0; i < nWrites; i++) {
			if (rnd() < split) ws.push('Wa:' + rnd().toFixed(3), 'Wb');
			else ws.push('W');
		}
		const hPos = Math.floor(rnd() * (ws.length + 1));
		const client = mergeRandom([
			shuffle(sc.clientGates)
				.filter(() => rnd() < 0.85)
				.map((c) => 'C:' + c),
			Array.from({ length: Math.floor(rnd() * 3) }, () => 'U'),
			rnd() < 0.35 ? ['K'] : [],
			(rnd() < 0.8 ? sc.seq || [] : []).map((a) => 'A:' + a)
		]);
		const tail = mergeRandom([ws.slice(hPos), client]);
		const ev = [...ws.slice(0, hPos), 'H', ...tail];
		if (cut && rnd() < cut)
			ev.splice(hPos + 1 + Math.floor(rnd() * (ev.length - hPos)), 0, 'CUT');
		const wmode = wait || pick(['mix', 'mix', 'macro', 'micro']);
		const out = [];
		for (const e of ev) {
			out.push(e);
			out.push(
				wmode == 'mix'
					? pick(['w0', 'w1', 'w2', 'w2'])
					: wmode == 'macro'
						? 'w2'
						: wmode == 'micro'
							? 'w1'
							: 'w0'
			);
		}
		return out;
	}
	return { rnd, pick, shuffle, genSchedule };
}

export const inPage = async ({ name, writes, schedule, bundle, cs, trace, settle, canonIds, noMount, expectErrors, dupOk, doc, mount }) => {
	const f = document.createElement('iframe');
	(mount || document.body).append(f);
	const w = f.contentWindow,
		d = w.document,
		errors = [],
		recoverable = [],
		glitches = [],
		log = [];
	d.open();
	w.onerror = (m) => {
		errors.push('onerror: ' + m);
	};
	w.addEventListener('unhandledrejection', (e) =>
		errors.push('unhandledrejection: ' + ((e.reason && e.reason.message) || e.reason))
	);
	w.console.error = (...a) => errors.push('console.error: ' + a.join(' '));
	// Nodes the client creates are tagged: whatever isn't was parsed from the response.
	for (const m of ['createElement', 'createElementNS']) {
		const orig = d[m];
		d[m] = function () {
			const el = orig.apply(this, arguments);
			el.__cli = true;
			return el;
		};
	}
	w.eval(bundle);
	// with a mount element the frame stays on the page, sized to its content
	const fit = () => {
		if (!mount) return f.remove();
		try {
			f.style.height = Math.min(700, Math.max(60, d.documentElement.scrollHeight + 8)) + 'px';
		} catch {}
	};
	const H = w.__H,
		sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	const wait = async (m) => {
		if (m == 'w1') for (let i = 0; i < 4; i++) await Promise.resolve();
		else if (m == 'w2') await sleep(45);
	};
	const canon = (x) => {
		if (noMount) x = x.replace(/ data-m="\d+"/g, '');
		if (!canonIds) return x;
		const ids = new Map();
		return x.replace(/(id|aria-labelledby)="([^"]*)"/g, (_, k, v) => {
			if (!ids.has(v)) ids.set(v, 'u' + ids.size);
			return `${k}="${ids.get(v)}"`;
		});
	};
	const root = () => d.getElementById('root');
	const dupIds = () => {
		const r = root();
		if (!r || dupOk) return;
		const seen = new Set();
		for (const el of r.querySelectorAll('[id]')) {
			if (el.closest('[hidden],template,preact-island')) continue;
			if (seen.has(el.id)) return el.id;
			seen.add(el.id);
		}
	};
	let wi = 0,
		half = '',
		ctl,
		events = [],
		step = 0;
	const write = (op) => {
		if (op[1] == 'a') {
			if (wi >= writes.length) return;
			// the last part only closes the document: cutting it tests the parser
			const s = writes[wi++];
			let at = wi == writes.length ? s.length : Math.floor(+op.slice(3) * s.length);
			// a response that ends on `<` or `</` leaves that text in the page,
			// whatever rendered it
			while (at && (s[at - 1] == '<' || s.slice(at - 2, at) == '</')) at--;
			d.write(s.slice(0, at));
			half = s.slice(at);
		} else if (half) {
			d.write(half);
			half = '';
		} else if (wi < writes.length) d.write(writes[wi++]);
	};
	try {
		d.write(writes[wi++]);
		for (const e of schedule) {
			if (e[0] == 'w') {
				await wait(e);
				// a wait is when the user could see the page
				const dup = dupIds();
				if (dup != null) glitches.push(`duplicate #${dup} after step ${step}`);
				// the fresh render gets the same pauses between its actions: two
				// actions in one batch are not the same as one after the other
				if (events.length) events.push(['w', e]);
				continue;
			}
			step++;
			if (e == 'CUT') {
				wi = writes.length;
				half = '';
			} else if (e[0] == 'W') write(e);
			else if (e == 'H')
				ctl = H.mk(name, root(), true, (m) => recoverable.push(m), doc);
			else if (e[0] == 'C') H.gate('c:' + e.slice(2)).open();
			else if (e == 'U') ctl.bump(), events.push(['U']);
			else if (e[0] == 'A') ctl.act(e.slice(2)), events.push(['A', e.slice(2)]);
			else if (e == 'K') {
				// data-m is set by an effect: the button is hydrated
				// (the nth button with that id: one scenario renders a button twice)
				const all = [...root().querySelectorAll('button')];
				const ids = all
					.filter((b) => b.hasAttribute('data-m'))
					.map((b) => (b.click(), [b.id, all.filter((o) => o.id == b.id).indexOf(b)]));
				if (ids.length) events.push(['K', ids]);
			}
			if (trace) {
				const r = root();
				log.push(
					e + ' => ' + (r ? r.innerHTML.replace(/<script>[^<]{200,}<\/script>/g, '<INIT>') : '-')
				);
			}
		}
		write('W');
		while (wi < writes.length) d.write(writes[wi++]);
		d.close();
		await sleep(45);
		for (const k of cs) H.gate('c:' + k).open();
		for (const [, g] of H.env.gates) g.open();
		await sleep(30);
		const ref = d.createElement('div');
		// the reference render shares the frame: keep it out of sight
		ref.hidden = true;
		ref.dataset.expected = '';
		d.body.append(ref);
		const rctl = H.mk(name, ref, false);
		// the same actions and clicks, in the same order
		for (const [k, v] of events) {
			if (k == 'w') await wait(v);
			else if (k == 'U') rctl.bump();
			else if (k == 'A') rctl.act(v);
			else {
				await sleep(60);
				for (const [id, nth] of v) {
					const b = [...ref.querySelectorAll('button')].filter((b) => b.id == id)[nth];
					if (b) b.click();
				}
				await sleep(30);
			}
		}
		// Poll: React reveals and hydrates boundaries on its own schedule.
		const same = async (phase) => {
			let got, want;
			for (let t = 0; t < settle; t += 30) {
				await sleep(30);
				got = canon(H.ser(root()));
				want = canon(H.ser(ref));
				if (got == want) {
					// stable, not just passing through
					await sleep(40);
					got = canon(H.ser(root()));
					want = canon(H.ser(ref));
					if (got == want) return;
				}
			}
			throw { phase, got, want };
		};
		await same('settled');
		if (trace) log.push('settled => ' + root().innerHTML.replace(/<script>[^<]{200,}<\/script>/g, '<INIT>'));
		const btns = [...root().querySelectorAll('button')];
		const kept = btns.filter((b) => !b.__cli).length;
		const dup = dupIds();
		if (dup != null) throw { phase: 'duplicate', got: '#' + dup, want: '' };
		btns.forEach((b) => b.click());
		[...ref.querySelectorAll('button')].forEach((b) => b.click());
		await same('clicked');
		ctl.bump();
		rctl.bump();
		await same('bumped');
		if (d.documentElement.hasAttribute('data-noref'))
			throw { phase: 'noref', got: d.documentElement.getAttribute('data-noref'), want: '' };
		if (errors.length && !expectErrors)
			throw { phase: 'errors', got: errors.join(' | '), want: '' };
		// What the stream left behind once everything settled.
		let litter = d.querySelectorAll('template, preact-island').length;
		const it = d.createNodeIterator(root(), 128 | 64);
		for (let n; (n = it.nextNode()); )
			if (n.nodeType == 7 || /^\$s\?|^\?(start|end)/.test(n.data)) litter++;
		fit();
		return { ok: true, got: canon(H.ser(root())), kept, total: btns.length, recoverable, glitches, litter, log, raw: litter ? root().innerHTML.replace(/<script>[^<]{200,}<\/script>/g, '<INIT>') : '' };
	} catch (e) {
		let raw = '';
		try {
			raw = root().innerHTML;
		} catch {}
		fit();
		return {
			ok: false,
			phase: e.phase || 'exception',
			got: e.got || String((e && e.stack) || e),
			want: e.want,
			errors,
			recoverable,
			glitches,
			raw,
			log
		};
	}
};

/**
 * One timed load: the shell, hydrate right after it, every later chunk `gap`
 * ms apart, then the client gates open. Settled is the first moment no
 * fallback shows and every button is hydrated (its settle callback ran),
 * held for two polls. Times are the frame's performance.now(); the counts
 * come from Solid's attribution records (observe bundle).
 */
export const timePage = async ({ name, writes, bundle, cs, gap = 30, limit = 4000, mount }) => {
	const f = document.createElement('iframe');
	(mount || document.body).append(f);
	const w = f.contentWindow,
		d = w.document,
		errors = [];
	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	try {
		d.open();
		w.onerror = (m) => {
			errors.push(String(m));
		};
		w.eval(bundle);
		const H = w.__H,
			now = () => w.performance.now();
		const stop = H.timing ? H.timing() : null;
		const t0 = now();
		d.write(writes[0]);
		const shellAt = now() - t0;
		const h0 = now();
		H.mk(name, d.getElementById('root'), true);
		const hydrateMs = now() - h0;
		for (let i = 1; i < writes.length; i++) {
			await sleep(gap);
			d.write(writes[i]);
		}
		d.close();
		const streamEnd = now();
		for (const k of cs) H.gate('c:' + k).open();
		const ready = () => {
			const r = d.getElementById('root');
			if (!r) return false;
			if ([...r.querySelectorAll('[data-fb]')].some((e) => !e.closest('[hidden]'))) return false;
			return [...r.querySelectorAll('button')].every((b) => b.hasAttribute('data-m'));
		};
		let settledAt = null,
			held = 0;
		while (now() - streamEnd < limit) {
			await sleep(5);
			if (ready()) {
				if (++held == 2) {
					settledAt = now() - 5;
					break;
				}
			} else held = 0;
		}
		const stats = stop ? stop() : {};
		f.remove();
		return {
			ok: settledAt != null && !errors.length,
			hydrateMs,
			// from the last byte (and the client code arriving) to everything hydrated
			settleMs: settledAt == null ? null : settledAt - streamEnd,
			totalMs: settledAt == null ? null : settledAt - t0,
			shellMs: shellAt,
			errors,
			...stats
		};
	} catch (e) {
		f.remove();
		return { ok: false, errors: [String((e && e.message) || e)] };
	}
};
