import { renderToStream, generateHydrationScript } from '@solidjs/web';
import { App, resetEnv, gate, scenarios } from './scenarios.jsx';
export { scenarios };

const tick = () => new Promise((r) => setTimeout(r, 10));
const head = (h) =>
	'<!DOCTYPE html><html><head><title>t</title>' +
	generateHydrationScript() +
	(h || '') +
	'</head><body><div id="root">';
const TAIL = '</div></body></html>';

/**
 * Render a scenario and cut the response where the server waited: writes[0]
 * is the shell, and every gate in `order` ('!' aborts) adds one more.
 */
export async function ssr(name, order) {
	resetEnv();
	const errors = [];
	const out = [''];
	let headHtml = '';
	const ac = new AbortController();
	const dec = new TextDecoder();
	let stream;
	try {
		stream = renderToStream(() => <App name={name} />, {
			signal: ac.signal,
			onHead: (h) => (headHtml += h),
			onError(e, ctx) {
				if (ctx && ctx.handling && ctx.handling != 'failed') return;
				errors.push(String((e && e.message) || e));
			},
		});
	} catch (e) {
		// no <Errored> above a synchronous throw: the render itself fails
		return { writes: null, errors: [String((e && e.message) || e)] };
	}
	const done = stream
		.pipeTo(
			new WritableStream({
				write(chunk) {
					out[out.length - 1] += typeof chunk == 'string' ? chunk : dec.decode(chunk, { stream: true });
				},
			}),
		)
		.catch((e) => errors.push('stream: ' + String((e && e.message) || e)));
	await tick();
	await tick();
	for (const k of order) {
		out.push('');
		if (k == '!') ac.abort(new Error('aborted'));
		else gate('s:' + k).open();
		await tick();
		await tick();
	}
	out.push('');
	await Promise.race([done, new Promise((r) => setTimeout(r, 2000))]);
	out[0] = head(headHtml) + out[0];
	out[out.length - 1] += TAIL;
	// a stream that never ended would hang the page on a pending boundary
	return { writes: out, errors };
}
