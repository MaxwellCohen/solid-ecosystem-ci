import { OBSERVE } from 'solid-js';
import { attribution } from 'solid-js/attribution';
import { hydrate, render } from '@solidjs/web';
import { App, env, gate, scenarios } from './scenarios.jsx';

const SKIP = /^(script|template|link|style)$/;
/** Elements and text only: what the user sees, whatever markers are around it. */
function ser(n) {
	let o = '';
	for (const c of n.childNodes) {
		if (c.nodeType == 3) o += c.data;
		else if (c.nodeType == 1 && !SKIP.test(c.localName) && !c.hidden) {
			const a = [...c.attributes]
				.filter((a) => a.name != '_hk' && (a.name != 'style' || a.value))
				.map((a) => `${a.name}="${a.value}"`)
				.sort()
				.join(' ');
			// an element left in the wrong namespace looks the same in markup
			const ns = c.namespaceURI,
				tag = (ns.endsWith('xhtml') ? '' : ns.endsWith('svg') ? 'svg:' : 'math:') + c.localName;
			o += `<${tag}${a ? ' ' + a : ''}>${ser(c)}</${tag}>`;
		}
	}
	return o;
}
function mk(name, root, hyd) {
	const ctl = { q: [] };
	for (const m of ['act', 'bump']) ctl[m] = (a) => (ctl.impl ? ctl.impl[m](a) : ctl.q.push([m, a]));
	(hyd ? hydrate : render)(() => <App name={name} ctl={ctl} />, root);
	return ctl;
}
/**
 * Timing from Solid's attribution engine (observe builds only): every flush
 * (a drain of the reactive queue), every async flight and every showing of a
 * Loading fallback, from start() until the returned stop().
 */
function timing() {
	if (!OBSERVE || !OBSERVE.records) return null;
	const t = { flushes: 0, flushMs: 0, runs: 0, created: 0, flights: 0, flightMs: 0, fallbacks: 0, fallbackMs: 0 };
	const release = attribution.enable({ log: false, checks: false });
	const offs = [
		OBSERVE.records.subscribe('flush', (e) => {
			t.flushes++;
			t.flushMs += e.durationMs;
			t.runs += e.runs;
			t.created += e.created;
		}),
		OBSERVE.records.subscribe('flight', (e) => {
			t.flights++;
			t.flightMs += e.durationMs;
		}),
		OBSERVE.records.subscribe('fallback', (e) => {
			t.fallbacks++;
			t.fallbackMs += e.shownMs;
		})
	];
	return () => {
		offs.forEach((off) => off && off());
		release();
		return t;
	};
}
window.__H = { ser, mk, gate, env, scenarios, timing, FW: 'solid' };
