import {
	createContext,
	createMemo,
	createSignal,
	createUniqueId,
	Errored,
	For,
	Loading,
	onSettled,
	Show,
	useContext
} from 'solid-js';

/**
 * Solid port of the Preact/React streaming hydration harness trees. Every
 * scenario is the same tree on the server and on the client. `serverGates`
 * lists the gates the server waits on (one streamed chunk each), `clientGates`
 * the gates the client waits on while hydrating. `seq` lists the actions a
 * schedule may fire, in order.
 *
 * Solid has no `throw promise`: a gate is an async memo. The server's memo
 * waits on gate `s:<name>` (its value streams to the client with the chunk);
 * the client's memo waits on gate `c:<name>`, the way code that isn't loaded
 * yet holds the subtree when hydration reaches it.
 */

export const env = { gates: new Map() };
export function resetEnv() {
	env.gates = new Map();
}
export function gate(key) {
	let g = env.gates.get(key);
	if (!g) {
		let res;
		const p = new Promise((r) => (res = r));
		g = {
			p,
			done: false,
			open() {
				g.done = true;
				res();
			}
		};
		env.gates.set(key, g);
	}
	return g;
}
/** true now when the gate is open, else a promise of true: an async read. */
const wait = (key) => {
	const g = gate(key);
	return g.done ? true : g.p.then(() => true);
};

/**
 * Suspends on the server until gate `server` opens (one streamed chunk), and
 * on the client until gate `client` opens. Both memos exist on both sides,
 * so the trees match.
 */
function Suspends(props) {
	const s = createMemo(() => (SERVER && props.server ? wait('s:' + props.server) : true));
	const c = createMemo(() => (!SERVER && props.client ? wait('c:' + props.client) : true));
	return <>{(s(), c(), props.children)}</>;
}

/**
 * Solid's lazy() needs an asset manifest on the server, so a "real lazy"
 * counter is the same client gate as Suspends around a Counter.
 */
function LazyCounter(props) {
	return (
		<Suspends client={props.client}>
			<Counter id={props.id} />
		</Suspends>
	);
}

/**
 * A button that counts its clicks. Its settle callback marks it once, so one
 * that runs twice or a missing ref shows up.
 */
function Counter(props) {
	const [n, setN] = createSignal(0);
	let ref;
	onSettled(() => {
		if (ref) ref.setAttribute('data-m', (+ref.getAttribute('data-m') || 0) + 1);
		else document.documentElement.setAttribute('data-noref', props.id);
	});
	return (
		<button ref={ref} id={props.id} onClick={() => setN(n() + 1)}>
			{props.id}:{n()}
		</button>
	);
}
/** A Loading boundary, behind a component like most apps have one. */
const Boundary = (props) => <Loading fallback={props.fallback}>{props.children}</Loading>;
const Passthrough = (props) => props.children;
function ThrowsOnServer(props) {
	if (SERVER) throw new Error('server boom');
	return props.children;
}
function ThrowsOnServerLater(props) {
	const v = createMemo(() =>
		SERVER
			? gate('s:' + props.server).p.then(() => {
					throw new Error('server boom late');
				})
			: true
	);
	return <>{(v(), props.children)}</>;
}
function ThrowsOnClient(props) {
	if (!SERVER) throw new Error('client boom');
	return props.children;
}
const ErrorBoundary = (props) => <Errored fallback={<p data-caught="">caught</p>}>{props.children}</Errored>;
/** A component with state and a click handler (a class component in React). */
function ClickableSection(props) {
	const [n, setN] = createSignal(0);
	return (
		<section data-n={n()} onClick={() => setN(n() + 1)}>
			{props.children}
		</section>
	);
}
const TickContext = createContext(() => 0);
function ShowTick() {
	const tick = useContext(TickContext);
	return <em>ctx:{tick()}</em>;
}
function LabelledInput() {
	const id = createUniqueId();
	return (
		<>
			<span id={id}>L</span>
			<input aria-labelledby={id} />
		</>
	);
}
/** No memo() in Solid: components run once. A plain section. */
const MemoSection = (props) => <section>{props.children}</section>;
const fallbackText = (t) => <span data-fb="">{t}</span>;
const purpleSquare =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Crect width='10' height='10' fill='purple'/%3E%3C/svg%3E";
function SuspendsLater(props) {
	const v = createMemo(() => (!SERVER && props.on ? wait('c:late') : true));
	return <>{(v(), <b>later</b>)}</>;
}
const RendersNull = () => null;
/** JSX is DOM in Solid: the "same vnode twice" is the same factory, called twice. */
const sharedBoundary = () => (
	<Boundary fallback={fallbackText('F')}>
		<Suspends server="a" client="x">
			<Counter id="in" />
		</Suspends>
	</Boundary>
);

const reverse = (st) => ({ order: [...st.order].reverse() });

export const scenarios = {
	// --- one boundary, different shapes ---------------------------------
	basic: {
		about: 'One boundary streams its counter later, and that counter\'s code also loads late on the client. The page must end up with both counters hydrated once, in order, after the paragraph.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><p>before</p><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><Counter id="in" /></Suspends></Boundary><Counter id="after" /></div>
	},
	sameTag: {
		about: 'A boundary whose fallback and streamed content are both a div with id k, one counter inside the content. After streaming and loading, the page must show the content div (state ok), not the fallback, with counters hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={<div id="k" data-state="fb" aria-busy="true">F</div>}><Suspends server="a" client="x"><div id="k" data-state="ok"><Counter id="in" /></div></Suspends></Boundary><div id="k2"><Counter id="after" /></div></div>
	},
	text: {
		about: 'A boundary holds only text, streamed late and loaded late on the client, between other text in a paragraph. The paragraph must read the same as a client render and the following counter must hydrate once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <p>Hello <Boundary fallback="…"><Suspends server="a" client="x">World</Suspends></Boundary>!<Counter id="b" /></p>
	},
	adjText: {
		about: 'Text nodes sit on both sides of a boundary whose streamed content is two adjacent text strings. The paragraph must end up with all text in order, with no merged or lost nodes, and the counter hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <p>{'a'}<Boundary fallback="f"><Suspends server="a" client="x">{'b'}{'c'}</Suspends></Boundary>{'d'}<Counter id="b" /></p>
	},
	textLazy: {
		about: 'Nothing streams on the server, but a boundary with text content waits on late client code during hydration, between text nodes. The final paragraph must show all the text in order and the counter hydrated once.',
		serverGates: [], clientGates: ['x'],
		render: () => <p>a<Boundary fallback="f"><Suspends client="x">b</Suspends></Boundary>c<Counter id="z" /></p>
	},
	multiRoot: {
		about: 'A boundary streams several roots (counter, text, counter) late, with a two-element fallback, and its client code loads late. All three must replace the fallback in order, before the tail, counters hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={<><i>f1</i><i>f2</i></>}><Suspends server="a" client="x"><Counter id="a" />text<Counter id="b" /></Suspends></Boundary><i>tail</i><Counter id="z" /></div>
	},
	nullFallback: {
		about: 'A boundary with no fallback streams a counter late, with late client code. The page must end with the counter in place before the other counter, both hydrated once, and no leftover fallback.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={null}><Suspends server="a" client="x"><Counter id="in" /></Suspends></Boundary><Counter id="z" /></div>
	},
	nullContent: {
		about: 'A boundary streams nothing visible (null) after a late server gate and a late client gate. The fallback must disappear and leave no content, and the counter after it must hydrate once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x">{null}</Suspends></Boundary><Counter id="z" /></div>
	},
	emptyPair: {
		about: 'Two boundaries with no fallback: the first streams null late, the second streams a counter late and waits on late client code. The page must end with only that counter, then the last counter, hydrated once.',
		serverGates: ['a', 'b'], clientGates: ['x'],
		render: () => <div><Boundary fallback={null}><Suspends server="a">{null}</Suspends></Boundary><Boundary fallback={null}><Suspends server="b" client="x"><Counter id="in" /></Suspends></Boundary><Counter id="z" /></div>
	},
	table: {
		about: 'A boundary inside a table body streams a table row late, with late client code, and has a row as fallback. The row must end up in the right place between the other rows, counters hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <table><tbody><tr><td>head</td></tr><Boundary fallback={<tr><td>f</td></tr>}><Suspends server="a" client="x"><tr><td><Counter id="in" /></td></tr></Suspends></Boundary><tr><td><Counter id="z" /></td></tr></tbody></table>
	},
	select: {
		about: 'A boundary inside a select element streams two options late, with late client code, with one option as fallback. The select must end up with one, two, three in order, and no fallback option.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><select><option>one</option><Boundary fallback={<option>loading</option>}><Suspends server="a" client="x"><option>two</option><option>three</option></Suspends></Boundary></select><Counter id="z" /></div>
	},
	svg: {
		about: 'Two nested boundaries inside an svg stream shapes late (outer on gate a, inner on gate b), each with its own late client code. The svg must end with both circles in the svg namespace, in order.',
		serverGates: ['a', 'b'], clientGates: ['x', 'y'],
		render: () => <div><svg width="120" height="30" viewBox="0 0 120 30"><Boundary fallback={<rect width="30" height="30" fill="#bbb" />}><Suspends server="a" client="x"><g><circle cx="15" cy="15" r="12" fill="teal" /><Boundary fallback={<rect x="40" width="30" height="30" fill="#ddd" />}><Suspends server="b" client="y"><circle cx="55" cy="15" r="12" fill="orange" /></Suspends></Boundary></g></Suspends></Boundary></svg><Counter id="z" /></div>
	},
	html: {
		about: 'A boundary streams a div with raw inner HTML (an element, a comment and another element) plus a counter, with late client code. The raw HTML must come out unchanged and the counter must hydrate once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><div innerHTML={'<b>raw</b><!--c--><i>x</i>'} /><Counter id="in" /></Suspends></Boundary><Counter id="z" /></div>
	},
	memo: {
		about: 'A boundary sits inside a plain wrapper component (memo() in React) and streams its counter late, with late client code. The page must end up with the counter inside the section, hydrated once, followed by the other counter.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><MemoSection><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><Counter id="in" /></Suspends></Boundary></MemoSection><Counter id="z" /></div>
	},
	rootBoundary: {
		about: 'Two boundaries are the root of the tree, with no wrapping element: the first streams on gate a and waits on late client code, the second streams on gate b. Both counters must end up in order, hydrated once.',
		serverGates: ['a', 'b'], clientGates: ['x'],
		render: () => <><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><Counter id="1" /></Suspends></Boundary><Boundary fallback={fallbackText('G')}><Suspends server="b"><Counter id="2" /></Suspends></Boundary></>
	},
	wrapAbove: {
		about: 'A boundary and its suspending child are wrapped in several pass-through components, one streamed gate and one late client gate. The counter must end up inside the boundary position, before the last counter, hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <Passthrough><Passthrough><Boundary fallback={fallbackText('F')}><Passthrough><Suspends server="a" client="x"><Counter id="in" /></Suspends></Passthrough></Boundary></Passthrough><Counter id="z" /></Passthrough>
	},
	sameVNode: {
		about: 'The same boundary factory is rendered twice (one element twice in React), in two sections, so it streams and hydrates twice and duplicate ids are expected. Both copies must end up with their counter, hydrated once each.',
		serverGates: ['a'], clientGates: ['x'], dupOk: true,
		render: () => <div><section>{sharedBoundary()}</section><section>{sharedBoundary()}</section><Counter id="z" /></div>
	},
	useId: {
		about: 'Labelled inputs using createUniqueId sit before, inside (streamed late, late client code) and after a boundary. The check renames ids in order, so it verifies each label points at its own input, not that server and client ids match.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><LabelledInput /><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><LabelledInput /></Suspends></Boundary><LabelledInput /><Counter id="z" /></div>
	},

	svgImage: {
		about: 'A boundary in an svg streams an image (with a data URL) and a circle late, with late client code. Both must end up in the svg namespace with the same attributes as a client render.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><svg width="120" height="30"><Boundary fallback={<rect width="30" height="30" fill="#bbb" />}><Suspends server="a" client="x"><image href={purpleSquare} width="30" height="30" /><circle cx="55" cy="15" r="12" fill="teal" /></Suspends></Boundary></svg><Counter id="z" /></div>
	},
	svgForeign: {
		about: 'A boundary in an svg streams a foreignObject holding an HTML div with a counter, plus a circle, late and with late client code. The div must be HTML again inside the svg, and the counter hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><svg width="200" height="40"><Boundary fallback={<rect width="30" height="30" fill="#bbb" />}><Suspends server="a" client="x"><foreignObject width="120" height="40"><div><Counter id="in" /></div></foreignObject><circle cx="150" cy="20" r="12" fill="teal" /></Suspends></Boundary></svg><Counter id="z" /></div>
	},
	svgTitle: {
		about: 'A boundary in an svg streams a title and a desc whose text has angle brackets and an ampersand, plus a circle. The text must read the same as in a client render, and the circle must be drawn.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><svg width="120" height="30"><Boundary fallback={<rect width="30" height="30" fill="#bbb" />}><Suspends server="a" client="x"><title>{'a < b & c'}</title><desc>{'d > e'}</desc><circle cx="15" cy="15" r="12" fill="teal" /></Suspends></Boundary></svg><Counter id="z" /></div>
	},
	math: {
		about: 'A boundary inside a math element streams two math elements (mi, mn) late, with a mi fallback. They must end up in the MathML namespace, in order, with no fallback left.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><math><Boundary fallback={<mi>f</mi>}><Suspends server="a" client="x"><mi>x</mi><mn>1</mn></Suspends></Boundary></math><Counter id="z" /></div>
	},
	bodyInShell: {
		about: 'A div in the initial response has raw HTML containing a closing body tag, and a boundary after it streams later. The page must still end up like the client render, counter hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><div innerHTML={'pre</body>post'} /><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><Counter id="in" /></Suspends></Boundary><Counter id="z" /></div>
	},
	bodyInChunk: {
		about: 'A streamed boundary chunk has raw HTML containing a closing body tag, followed by a counter. The chunk must still be placed correctly and the page must equal the client render, counter hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><div innerHTML={'pre</body>post'} /><Counter id="in" /></Suspends></Boundary><Counter id="z" /></div>
	},
	formish: {
		about: 'A boundary streams a textarea, a checked checkbox, an input with a default value, a pre with leading spaces and newlines, a br and a counter. The form state and whitespace must equal a client render.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><textarea value={'a&b <c>'} /><input type="checkbox" checked /><input value="v" /><pre>{'  a\nb  '}</pre><br /><Counter id="in" /></Suspends></Boundary><Counter id="z" /></div>
	},
	classBetween: {
		about: 'A component with state and a click handler (a class component in React) sits inside a boundary around a counter and a late streamed counter (late client code). Both counters must hydrate once and the section must still count clicks.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><ClickableSection><Counter id="0" /><Suspends server="a" client="x"><Counter id="in" /></Suspends></ClickableSection></Boundary><Counter id="z" /></div>
	},

	// --- a component between the boundary and what suspends ---------------
	wrapFirstClient: {
		about: 'Nothing streams. Inside a boundary and a pass-through component the first child waits on late client code and the second is a plain counter. Both counters must end up in order, hydrated once.',
		serverGates: [], clientGates: ['x'],
		render: () => <div><Boundary fallback={<i>f</i>}><Passthrough><Suspends client="x"><Counter id="1" /></Suspends><Counter id="2" /></Passthrough></Boundary><Counter id="z" /></div>
	},
	wrapMidClient: {
		about: 'Inside a boundary and a pass-through, three children: one streamed late (gate a), one that waits on late client code, one plain counter. All three counters must end up in order, hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={<i>f</i>}><Passthrough><Suspends server="a"><Counter id="0" /></Suspends><Suspends client="x"><Counter id="1" /></Suspends><Counter id="2" /></Passthrough></Boundary><Counter id="z" /></div>
	},
	wrapFirstServer: {
		about: 'Inside a boundary, a pass-through holds a child streamed late (gate a) then a child waiting on late client code, followed by a plain counter. All three must end up in order, hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={<i>f</i>}><Passthrough><Suspends server="a"><Counter id="1" /></Suspends><Suspends client="x"><Counter id="2" /></Suspends></Passthrough><Counter id="3" /></Boundary><Counter id="z" /></div>
	},
	twoChildrenFirstClient: {
		about: 'Nothing streams. A boundary has two pass-through children: the first waits on late client code, the second is a plain counter. Both counters must end up in order, hydrated once.',
		serverGates: [], clientGates: ['x'],
		render: () => <div><Boundary fallback={<i>f</i>}><Passthrough><Suspends client="x"><Counter id="1" /></Suspends></Passthrough><Passthrough><Counter id="2" /></Passthrough></Boundary><Counter id="z" /></div>
	},

	// --- several boundaries ---------------------------------------------
	siblings: {
		about: 'Three sibling boundaries stream on gates a, b and c; only the middle one also waits on late client code. All three counters must end up in order, hydrated once, whatever order the chunks arrive in.',
		serverGates: ['a', 'b', 'c'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText(1)}><Suspends server="a"><Counter id="1" /></Suspends></Boundary><Boundary fallback={fallbackText(2)}><Suspends server="b" client="x"><Counter id="2" /></Suspends></Boundary><Boundary fallback={fallbackText(3)}><Suspends server="c"><Counter id="3" /></Suspends></Boundary></div>
	},
	nested: {
		about: 'An outer boundary (gate a, late client code) streams a counter and an inner boundary (gate b, other late client code). Both counters must end up in the right place, hydrated once, before the last counter.',
		serverGates: ['a', 'b'], clientGates: ['x', 'y'],
		render: () => <div><Boundary fallback={<i>o</i>}><Suspends server="a" client="x"><div><Counter id="o" /><Boundary fallback={<i>i</i>}><Suspends server="b" client="y"><Counter id="i" /></Suspends></Boundary></div></Suspends></Boundary><Counter id="z" /></div>
	},
	directNest: {
		about: 'An outer boundary whose only child is an inner boundary: outer on gate a with late client code, inner on gate b with other late client code. The inner counter must end up in place, hydrated once.',
		serverGates: ['a', 'b'], clientGates: ['x', 'y'],
		render: () => <div><Boundary fallback={<i>A</i>}><Suspends server="a" client="x"><Boundary fallback={<i>B</i>}><Suspends server="b" client="y"><Counter id="i" /></Suspends></Boundary></Suspends></Boundary><Counter id="z" /></div>
	},
	nest3: {
		about: 'Three boundaries nested inside each other, streamed on gates a, b and c, with late client code on the outermost and innermost. All three counters must end up in order, hydrated once.',
		serverGates: ['a', 'b', 'c'], clientGates: ['x', 'y'],
		render: () => <div><Boundary fallback={<i>A</i>}><Suspends server="a" client="x"><Counter id="1" /><Boundary fallback={<i>B</i>}><Suspends server="b"><Counter id="2" /><Boundary fallback={<i>C</i>}><Suspends server="c" client="y"><Counter id="3" /></Suspends></Boundary></Suspends></Boundary></Suspends></Boundary><Counter id="z" /></div>
	},
	fbBoundary: {
		about: 'The fallback of a boundary (gate a, late client code) holds another boundary that streams on gate b. The fallback counter may show meanwhile, but the final page must show only the real content, hydrated once.',
		serverGates: ['a', 'b'], clientGates: ['x'],
		render: () => <div><Boundary fallback={<div data-fb=""><Boundary fallback={<i>ff</i>}><Suspends server="b"><Counter id="fbin" /></Suspends></Boundary></div>}><Suspends server="a" client="x"><Counter id="in" /></Suspends></Boundary><Counter id="z" /></div>
	},
	outerNoRange: {
		about: 'An outer boundary contains an inner boundary (streamed on gate a) and a plain counter, with no late client code on the outer one. Both counters must end up in order, hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={<i>o</i>}><Boundary fallback={fallbackText('F')}><Suspends server="a"><Counter id="1" /></Suspends></Boundary><Counter id="2" /></Boundary><Counter id="z" /></div>
	},
	outerNoRangeLazy: {
		about: 'An outer boundary holds an inner streamed boundary (gate a) and a child waiting on late client code. The client must wait for that code, then show both counters in order, hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={<i>o</i>}><Boundary fallback={fallbackText('F')}><Suspends server="a"><Counter id="1" /></Suspends></Boundary><Suspends client="x"><Counter id="2" /></Suspends></Boundary><Counter id="z" /></div>
	},
	innerPlain: {
		about: 'A boundary streams on gate a and inside it an inner boundary waits only on late client code (no stream), followed by a plain counter. Both counters must end up in order, hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends server="a"><Boundary fallback={<i>p</i>}><Suspends client="x"><Counter id="1" /></Suspends></Boundary><Counter id="2" /></Suspends></Boundary><Counter id="z" /></div>
	},
	gateAbove: {
		about: 'A boundary waits only on late client code and wraps three inner boundaries streamed on gates a, b and c. After the code loads, all three counters must end up in order, hydrated once.',
		serverGates: ['a', 'b', 'c'], clientGates: ['x'],
		render: () => <div><Boundary fallback={<i>wake</i>}><Suspends client="x"><div>{['a', 'b', 'c'].map((k) => <Boundary fallback={fallbackText(k)}><Suspends server={k}><Counter id={k} /></Suspends></Boundary>)}</div></Suspends></Boundary><Counter id="z" /></div>
	},
	gateAboveNoWrap: {
		about: 'A boundary waits only on late client code, and its children are two inner boundaries streamed on gates a and b, with no wrapping element. Both counters must end up in order, hydrated once.',
		serverGates: ['a', 'b'], clientGates: ['x'],
		render: () => <div><Boundary fallback={<i>wake</i>}><Suspends client="x">{['a', 'b'].map((k) => <Boundary fallback={fallbackText(k)}><Suspends server={k}><Counter id={k} /></Suspends></Boundary>)}</Suspends></Boundary><Counter id="z" /></div>
	},
	serverWaterfall: {
		about: 'Inside one boundary, a child streams on gate a and contains a second child that waits on gate b on the server and on late client code. Both counters must end up in order, hydrated once.',
		serverGates: ['a', 'b'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends server="a"><Counter id="1" /><Suspends server="b" client="x"><Counter id="in" /></Suspends></Suspends></Boundary><Counter id="z" /></div>
	},
	twoInOne: {
		about: 'One boundary holds two children, one on gate a with late client code x, one on gate b with late client code y. Both counters must end up in order, hydrated once, once everything has loaded.',
		serverGates: ['a', 'b'], clientGates: ['x', 'y'],
		render: () => <div><Boundary fallback={<i>f</i>}><Suspends server="a" client="x"><Counter id="1" /></Suspends><Suspends server="b" client="y"><Counter id="2" /></Suspends></Boundary><Counter id="z" /></div>
	},

	// --- the client suspends while hydrating ----------------------------
	twoInOneNoStream: {
		about: 'Nothing streams. One boundary holds two children that wait on different late client code (x and y) during hydration. Both counters must end up in order, hydrated once.',
		serverGates: [], clientGates: ['x', 'y'],
		render: () => <div><Boundary fallback={<i>f</i>}><Suspends client="x"><Counter id="1" /></Suspends><Suspends client="y"><Counter id="2" /></Suspends></Boundary><Counter id="z" /></div>
	},
	lazyFirst: {
		about: 'A boundary holds a child waiting on late client code, then a child streamed on gate a. Both counters must end up in order, hydrated once, after the code loads.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={<i>f</i>}><Suspends client="x"><Counter id="1" /></Suspends><Suspends server="a"><Counter id="2" /></Suspends></Boundary><Counter id="z" /></div>
	},
	lazySecond: {
		about: 'A boundary holds a child streamed on gate a, then a child waiting on late client code. Both counters must end up in order, hydrated once, after the code loads.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={<i>f</i>}><Suspends server="a"><Counter id="1" /></Suspends><Suspends client="x"><Counter id="2" /></Suspends></Boundary><Counter id="z" /></div>
	},
	multiRootClient: {
		about: 'Nothing streams. A boundary holds one child waiting on late client code that renders two counters. Both must end up in order, hydrated once, before the last counter.',
		serverGates: [], clientGates: ['x'],
		render: () => <div><Boundary fallback={<i>f</i>}><Suspends client="x"><Counter id="a" /><Counter id="b" /></Suspends></Boundary><Counter id="z" /></div>
	},
	lazyInDiv: {
		about: 'A boundary streams on gate a with a div whose only child waits on late client code, then a counter. Both counters must end up in order, hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends server="a"><div><Suspends client="x"><Counter id="1" /></Suspends></div><Counter id="2" /></Suspends></Boundary><Counter id="z" /></div>
	},
	lazyMulti: {
		about: 'A boundary streams on gate a with a counter, then a group waiting on late client code (two counters), then another counter. All four counters must end up in order, hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends server="a"><Counter id="0" /><Suspends client="x"><Counter id="1" /><Counter id="2" /></Suspends><Counter id="3" /></Suspends></Boundary><Counter id="z" /></div>
	},
	lazyRef: {
		about: 'A boundary streams on gate a with a b element, a counter and a child waiting on late client code. The b element must be kept, and both counters must end up in order, hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={<b data-fb="">F</b>}><Suspends server="a"><b>keep</b><Counter id="1" /><Suspends client="x"><Counter id="2" /></Suspends></Suspends></Boundary><Counter id="z" /></div>
	},
	lazyNull: {
		about: 'A boundary has a child waiting on late client code that renders nothing, plus an inner boundary streamed on gate a and a plain counter. Both counters must end up in order, hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends client="x"><RendersNull /></Suspends><Boundary fallback={fallbackText('G')}><Suspends server="a"><Counter id="1" /></Suspends></Boundary><Counter id="2" /></Boundary><Counter id="z" /></div>
	},
	lazyDeep: {
		about: 'A boundary streams on gate a with a list: a counter, a nested child waiting on late client code x holding a counter and a child waiting on y, then a counter. All counters in order, hydrated once.',
		serverGates: ['a'], clientGates: ['x', 'y'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends server="a"><ul><li><Counter id="0" /></li><li><Passthrough><Suspends client="x"><Counter id="1" /><Suspends client="y"><Counter id="2" /></Suspends></Suspends></Passthrough></li></ul><Counter id="3" /></Suspends></Boundary><Counter id="z" /></div>
	},
	resuspend: {
		about: 'A boundary streams on gate a and waits on late client code x, and inside it a child waits on other late client code y. The counter must end up hydrated once, after both have loaded.',
		serverGates: ['a'], clientGates: ['x', 'y'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><Suspends client="y"><Counter id="in" /></Suspends></Suspends></Boundary><Counter id="z" /></div>
	},
	resuspendNoStream: {
		about: 'Nothing streams. A boundary holds a child waiting on late client code x that contains a child waiting on y. The counter must end up hydrated once, after both have loaded.',
		serverGates: [], clientGates: ['x', 'y'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends client="x"><Suspends client="y"><Counter id="in" /></Suspends></Suspends></Boundary><Counter id="z" /></div>
	},
	realLazy: {
		about: 'A boundary streams on gate a with a counter, a real lazy component whose code loads late on the client, and another counter. All three must end up in order, hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends server="a"><Counter id="0" /><LazyCounter client="x" id="1" /><Counter id="2" /></Suspends></Boundary><Counter id="z" /></div>
	},
	realLazyNoStream: {
		about: 'Nothing streams. A boundary holds a counter and two real lazy components whose code loads late on the client (x and y). All three counters must end up in order, hydrated once.',
		serverGates: [], clientGates: ['x', 'y'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Counter id="0" /><LazyCounter client="x" id="1" /><LazyCounter client="y" id="2" /></Boundary><Counter id="z" /></div>
	},

	// --- errors and cut streams -----------------------------------------
	serverError: {
		about: 'The server render fails inside a boundary (ThrowsOnServer), so the client must render that boundary itself, after late client code. The final page must show its counter, hydrated once.',
		serverGates: [], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><ThrowsOnServer><Suspends client="x"><Counter id="in" /></Suspends></ThrowsOnServer></Boundary><Counter id="z" /></div>
	},
	serverErrorLate: {
		about: 'A boundary fails on the server after waiting on gate a, while a second boundary streams on gate b. The client must render the failed boundary after late client code, and the second must stream.',
		serverGates: ['a', 'b'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><ThrowsOnServerLater server="a"><Suspends client="x"><Counter id="in" /></Suspends></ThrowsOnServerLater></Boundary><Boundary fallback={fallbackText('G')}><Suspends server="b"><Counter id="g" /></Suspends></Boundary><Counter id="z" /></div>
	},
	serverErrorNested: {
		about: 'An outer boundary streams on gate a (late client code), holding a counter and an inner boundary that fails on the server after gate b. The client must render the inner part.',
		serverGates: ['a', 'b'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><div><Counter id="o" /><Boundary fallback={fallbackText('G')}><ThrowsOnServerLater server="b"><Counter id="in" /></ThrowsOnServerLater></Boundary></div></Suspends></Boundary><Counter id="z" /></div>
	},
	abort: {
		about: 'The server render is aborted at some point among gates a and b, so some boundaries may never arrive. The client must render what is missing (outer needs late client code) and end with all counters, hydrated once.',
		serverGates: ['a', 'b', '!'], clientGates: ['x'],
		render: () => <div><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><div><Counter id="o" /><Boundary fallback={fallbackText('G')}><Suspends server="b"><Counter id="i" /></Suspends></Boundary></div></Suspends></Boundary><Counter id="z" /></div>
	},
	clientError: {
		about: 'A boundary streams a b element on gate a, but its content throws on the client, inside an error boundary. The error boundary must show caught, the error is expected, and the other counter must hydrate once.',
		serverGates: ['a'], clientGates: [], expectErrors: true,
		render: () => <div><ErrorBoundary><Boundary fallback={fallbackText('F')}><Suspends server="a"><ThrowsOnClient><b>srv</b></ThrowsOnClient></Suspends></Boundary></ErrorBoundary><Counter id="z" /></div>
	},
	clientErrorSibling: {
		about: 'Two boundaries stream counters (gates a and b) around a child that throws on the client, all inside an error boundary. The error boundary must show caught, the error is expected, and the other counter must hydrate once.',
		serverGates: ['a', 'b'], clientGates: [], expectErrors: true,
		render: () => <div><ErrorBoundary><div><Boundary fallback={fallbackText('F')}><Suspends server="a"><Counter id="in" /></Suspends></Boundary><ThrowsOnClient><b>srv</b></ThrowsOnClient><Boundary fallback={fallbackText('G')}><Suspends server="b"><Counter id="g" /></Suspends></Boundary></div></ErrorBoundary><Counter id="z" /></div>
	},

	// --- the tree changes while the stream is still open -----------------
	keyed: {
		about: 'Three streamed boundaries in a keyed list, two waiting on late client code, are reversed while they may still be waiting. Each counter must end up in the reversed order, hydrated once.',
		serverGates: ['a', 'b', 'c'], clientGates: ['x', 'y'], init: { order: ['a', 'b', 'c'] },
		actions: { reverse }, seq: ['reverse'],
		render: (st) => <ul><For each={st().order}>{(k) => <Boundary fallback={<li data-fb="">f{k}</li>}><Suspends server={k} client={k == 'a' ? 'x' : k == 'b' ? 'y' : null}><li><Counter id={k} /></li></Suspends></Boundary>}</For></ul>
	},
	keyedNoStream: {
		about: 'Nothing streams. Three keyed boundaries, two waiting on late client code, are reversed while they may still be waiting. Each counter must end up in the reversed order, hydrated once.',
		serverGates: [], clientGates: ['x', 'y'], init: { order: ['a', 'b', 'c'] },
		actions: { reverse }, seq: ['reverse'],
		render: (st) => <ul><For each={st().order}>{(k) => <Boundary fallback={<li data-fb="">f{k}</li>}><Suspends client={k == 'a' ? 'x' : k == 'b' ? 'y' : null}><li><Counter id={k} /></li></Suspends></Boundary>}</For></ul>
	},
	keyedComp: {
		about: 'A keyed list has two streamed boundaries (gates a and b, one with late client code) and a plain counter, and is reversed at some point. The counters must end up in reversed order, hydrated once.',
		serverGates: ['a', 'b'], clientGates: ['x'], init: { order: ['a', 'b', 'n'] },
		actions: { reverse }, seq: ['reverse'],
		render: (st) => <div><For each={st().order}>{(k) => k == 'n' ? <Counter id="n" /> : <Boundary fallback={fallbackText(k)}><Suspends server={k} client={k == 'a' ? 'x' : null}><Counter id={k} /></Suspends></Boundary>}</For></div>
	},
	keyedGrow: {
		about: 'A keyed list of two streamed boundaries (gates a and b, one with late client code) gets a counter added at the front at some point. The new counter must be first, others in order, hydrated once.',
		serverGates: ['a', 'b'], clientGates: ['x'], init: { order: ['a', 'b'] },
		actions: { grow: (st) => ({ order: ['n', ...st.order] }) }, seq: ['grow'],
		render: (st) => <div><For each={st().order}>{(k) => k == 'n' ? <Counter id="n" /> : <Boundary fallback={fallbackText(k)}><Suspends server={k} client={k == 'a' ? 'x' : null}><Counter id={k} /></Suspends></Boundary>}</For><Counter id="z" /></div>
	},
	toggle: {
		about: 'A streamed boundary (gate a, late client code) is hidden and then shown again by actions while it may still be loading. Its counter must end up shown once, and the other counter hydrated once.',
		serverGates: ['a'], clientGates: ['x'], init: { show: true },
		actions: { hide: () => ({ show: false }), show: () => ({ show: true }) }, seq: ['hide', 'show'],
		render: (st) => <div><Show when={st().show}><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><Counter id="in" /></Suspends></Boundary></Show><Counter id="z" /></div>
	},
	hideOnly: {
		about: 'A streamed boundary (gate a, late client code) is hidden by an action, while a second boundary streams on gate b. The hidden counter must be gone, and the other counters hydrated once.',
		serverGates: ['a', 'b'], clientGates: ['x'], init: { show: true },
		actions: { hide: () => ({ show: false }) }, seq: ['hide'],
		render: (st) => <div><Show when={st().show}><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><Counter id="in" /></Suspends></Boundary></Show><Boundary fallback={fallbackText('G')}><Suspends server="b"><Counter id="g" /></Suspends></Boundary><Counter id="z" /></div>
	},
	hideNested: {
		about: 'An inner boundary (gate b, late client code) inside a streamed outer boundary (gate a) is hidden by an action. After it, the outer counters must remain in order, hydrated once, and the inner one must be gone.',
		serverGates: ['a', 'b'], clientGates: ['x'], init: { show: true },
		actions: { hide: () => ({ show: false }) }, seq: ['hide'],
		render: (st) => <div><Boundary fallback={fallbackText('F')}><Suspends server="a"><Counter id="o" /><Show when={st().show}><Boundary fallback={fallbackText('G')}><Suspends server="b" client="x"><Counter id="in" /></Suspends></Boundary></Show><Counter id="p" /></Suspends></Boundary><Counter id="z" /></div>
	},
	rekey: {
		about: 'The section wrapping a streamed boundary (gate a, late client code) gets a new key by an action, so its content is remounted. The page must end with one fresh counter in the section, hydrated once.',
		serverGates: ['a'], clientGates: ['x'], init: { k: 1 },
		actions: { rekey: (st) => ({ k: st.k + 1 }) }, seq: ['rekey'],
		render: (st) => <div><Show when={st().k} keyed>{() => <section><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><Counter id="in" /></Suspends></Boundary></section>}</Show><Counter id="z" /></div>
	},
	later: {
		about: 'An action, possibly after hydration, makes a child inside a streamed boundary (gate a, late client code x) suspend on other late client code. The page must settle with the counter shown, hydrated once.',
		serverGates: ['a'], clientGates: ['x', 'late'], init: { on: false },
		actions: { susp: () => ({ on: true }) }, seq: ['susp'],
		render: (st) => <div><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><Counter id="in" /><SuspendsLater on={st().on} /></Suspends></Boundary><Counter id="z" /></div>
	},
	laterNested: {
		about: 'An action makes a child of the streamed outer boundary (gate a) suspend on late client code, at any point, while an inner boundary streams on gate b. All counters must end up in order, hydrated once.',
		serverGates: ['a', 'b'], clientGates: ['late'], init: { on: false },
		actions: { susp: () => ({ on: true }) }, seq: ['susp'],
		render: (st) => <div><Boundary fallback={fallbackText('F')}><Suspends server="a"><Counter id="o" /><SuspendsLater on={st().on} /><Boundary fallback={fallbackText('G')}><Suspends server="b"><Counter id="i" /></Suspends></Boundary></Suspends></Boundary><Counter id="z" /></div>
	},
	context: {
		about: 'A context value changes with each re-render and is read both inside a streamed boundary (gate a, late client code) and outside it. Both readers must show the latest value, and the counter hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: (st, tick) => <TickContext value={tick}><div><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><ShowTick /><Counter id="in" /></Suspends></Boundary><ShowTick /></div></TickContext>
	},
	tickProp: {
		about: 'A prop on the outer div and a text inside a streamed boundary (gate a, late client code) both show the re-render counter. Both must show the latest value, and the counters hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: (st, tick) => <div data-t={tick()}><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><span>t{tick()}</span><Counter id="in" /></Suspends></Boundary><Counter id="z" /></div>
	},
	tickAttr: {
		about: 'An attribute and a title inside a streamed boundary (gate a, late client code) show the re-render counter. Both must show the latest value after re-renders, with the counters hydrated once.',
		serverGates: ['a'], clientGates: ['x'],
		render: (st, tick) => <div><Boundary fallback={fallbackText('F')}><Suspends server="a" client="x"><span data-t={tick()} title={'t' + tick()}>attr</span><Counter id="in" /></Suspends></Boundary><Counter id="z" /></div>
	}
};

export function App(props) {
	const sc = scenarios[props.name];
	const [st, setSt] = createSignal(sc.init || {});
	const [tick, setTick] = createSignal(0);
	const ctl = props.ctl;
	if (ctl) {
		ctl.impl = {
			act: (a) => setSt((s) => ({ ...s, ...sc.actions[a](s) })),
			bump: () => setTick((t) => t + 1)
		};
		for (const [m, a] of ctl.q.splice(0)) ctl.impl[m](a);
	}
	return <>{sc.render(st, tick)}</>;
}
