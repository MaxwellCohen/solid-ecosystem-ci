import { createMemo, createSignal, For, Loading, type JSX } from 'solid-js';
import { delay } from '../lib/streaming';
import { scale } from '../lib/query';

export type Scenario = {
  id: string;
  group: 'basics' | 'edge-cases' | 'special' | 'stress' | 'races';
  title: string;
  expected: string;
  render: () => JSX.Element;
};

const fb = (text = 'Loading…') => <p data-testid="fallback">{text}</p>;
const pulse = () => (
  <span class="rounded bg-zinc-200 p-1.5 text-center" data-testid="fallback">
    …
  </span>
);
const cell = (i: number) => (
  <span data-cell={i} class="rounded bg-emerald-200 p-1.5 text-center">
    {i}
  </span>
);

/** Resolves `ms * scale` after render starts, then swaps `children` in. */
function Later(props: { ms: number; fallback?: JSX.Element; children?: JSX.Element }) {
  const ready = createMemo(() => delay(true, props.ms * scale()));
  return (
    <Loading fallback={props.fallback ?? fb()}>
      {ready() ? props.children : null}
    </Loading>
  );
}

function Panel(props: { name: string; ms: number; children?: JSX.Element }) {
  return (
    <div
      class="my-1 rounded-md border border-sky-200 bg-sky-50 p-2"
      data-testid={`panel-${props.name}`}
    >
      <b>{props.name}</b> resolved after {props.ms}ms {props.children}
    </div>
  );
}

const POPCORN = [420, 1680, 780, 2100, 1100, 540, 1900, 1320, 2260, 860, 1480, 640, 1980, 980, 1200, 1540];
const spread = (n: number) => Array.from({ length: n }, (_, i) => 200 + ((i * 337) % 1800));

function Counter() {
  const [n, setN] = createSignal(0);
  return (
    <button type="button" data-testid="patched-btn" class="rounded border px-2" onClick={() => setN(n() + 1)}>
      patched clicks: <span data-testid="patched-count">{n()}</span>
    </button>
  );
}

function Deep(props: { level: number }) {
  return (
    <div data-level={props.level}>
      level {props.level}
      {props.level < 5 ? (
        <Later ms={250}>
          <Deep level={props.level + 1} />
        </Later>
      ) : null}
    </div>
  );
}

function NestedInnerFirst() {
  const inner = createMemo(() => delay(true, 300 * scale()));
  return (
    <Later ms={1500}>
      <div data-testid="nest-outer">
        outer
        <Loading fallback={fb('inner…')}>{inner() ? <p data-testid="nest-inner">inner</p> : null}</Loading>
      </div>
    </Later>
  );
}

export const scenarios: Scenario[] = [
  { id: 'html-baseline', group: 'basics', title: 'HTML baseline', expected: 'Fallback replaced with “Done — declarative DPU worked”.',
    render: () => <Later ms={600}><p data-testid="html-done">Done — declarative DPU worked</p></Later> },
  { id: 'popcorning', group: 'basics', title: 'Popcorning (16 cells)', expected: 'All 16 cells resolve out of order; none stuck on …',
    render: () => (
      <div class="grid grid-cols-4 gap-1.5" data-testid="popcorn">
        <For each={POPCORN}>{(ms, i) => <Later ms={ms} fallback={pulse()}>{cell(i())}</Later>}</For>
      </div>
    ) },
  { id: 'nested', group: 'basics', title: 'Nested suspense', expected: 'Outer then inner panels resolve.',
    render: () => (
      <Later ms={1000} fallback={fb('account shell…')}>
        <Panel name="Account" ms={1000}>
          <Later ms={1500} fallback={fb('details…')}><Panel name="Details" ms={1500} /></Later>
        </Panel>
      </Later>
    ) },
  { id: 'out-of-order', group: 'basics', title: 'Out of order', expected: 'fast-second appears before slow-first.',
    render: () => (
      <>
        <Later ms={2500} fallback={fb('Loading slow-first…')}><Panel name="slow-first" ms={2500} /></Later>
        <Later ms={600} fallback={fb('Loading fast-second…')}><Panel name="fast-second" ms={600} /></Later>
      </>
    ) },
  { id: 'zero-delay', group: 'basics', title: 'Zero delay', expected: 'Instant content, no leftover fallback.',
    render: () => <Later ms={0}><p data-testid="zero-done">instant</p></Later> },

  { id: 'table-rows', group: 'edge-cases', title: 'Table rows', expected: 'Rows A and B land inside the same <tbody>.',
    render: () => (
      <table><tbody>
        <tr><td>static</td></tr>
        <Later ms={700} fallback={<tr data-testid="fallback"><td>…</td></tr>}>
          <tr data-testid="row-a"><td>A</td></tr>
          <tr data-testid="row-b"><td>B</td></tr>
        </Later>
      </tbody></table>
    ) },
  { id: 'select-options', group: 'edge-cases', title: 'Select options', expected: 'Options one/two/three; value stays 2.',
    render: () => (
      <select data-testid="sel">
        <Later ms={700} fallback={<option data-testid="fallback">…</option>}>
          <option value="1">one</option>
          <option value="2" selected>two</option>
          <option value="3">three</option>
        </Later>
      </select>
    ) },
  { id: 'list-items', group: 'edge-cases', title: 'List items', expected: 'Three <li> children.',
    render: () => (
      <ul data-testid="ul">
        <Later ms={700} fallback={<li data-testid="fallback">…</li>}><li>1</li><li>2</li><li>3</li></Later>
      </ul>
    ) },
  { id: 'svg-namespace', group: 'edge-cases', title: 'SVG namespace', expected: 'Circle is in the SVG namespace with a non-zero box.',
    render: () => (
      <svg width="160" height="100" viewBox="0 0 160 100" data-testid="svg-stage">
        <Later ms={800} fallback={<text x="8" y="20" font-size="12" data-testid="fallback">Loading…</text>}>
          <circle cx="80" cy="55" r="24" fill="tomato" stroke="white" stroke-width="2" />
        </Later>
      </svg>
    ) },
  { id: 'mathml-namespace', group: 'edge-cases', title: 'MathML namespace', expected: 'mi/mo/mn in MathML namespace.',
    render: () => (
      <math display="block" data-testid="math-stage">
        <Later ms={800} fallback={<mtext data-testid="fallback">Loading…</mtext>}><mi>x</mi><mo>+</mo><mn>1</mn></Later>
      </math>
    ) },
  { id: 'style-hoist', group: 'edge-cases', title: 'Inline style', expected: 'Text is tomato and bold.',
    render: () => (
      <Later ms={900}>
        <style>{`.dpu-edge-style{color:tomato;font-weight:700}`}</style>
        <p class="dpu-edge-style" data-testid="styled">Styled hello</p>
      </Later>
    ) },
  { id: 'foreign-object', group: 'edge-cases', title: 'foreignObject', expected: 'HTML paragraph inside SVG foreignObject.',
    render: () => (
      <svg width="200" height="60">
        <foreignObject width="200" height="60">
          <Later ms={800}><p data-testid="fo">html in svg</p></Later>
        </foreignObject>
      </svg>
    ) },

  { id: 'inline-script', group: 'special', title: 'Inline script', expected: 'window.__scriptRan increments (script may be blocked by CSP).',
    render: () => (
      <Later ms={700}>
        <script innerHTML="window.__scriptRan=(window.__scriptRan||0)+1" />
        <p data-testid="script-done">done</p>
      </Later>
    ) },
  { id: 'empty', group: 'special', title: 'Empty content', expected: 'Fallback clears; host stays empty.',
    render: () => <div data-testid="empty-host"><Later ms={600}>{null}</Later></div> },
  { id: 'multi-root', group: 'special', title: 'Multi-root', expected: 'b/i/u siblings appear.',
    render: () => <div data-testid="multi-host"><Later ms={600}><b>1</b><i>2</i><u>3</u></Later></div> },
  { id: 'text-only', group: 'special', title: 'Text only', expected: 'Host text becomes “resolved text”.',
    render: () => <p data-testid="text-host"><Later ms={600} fallback="…">resolved text</Later></p> },
  { id: 'nested-template', group: 'special', title: 'Nested <template>', expected: 'Inner template stays inert; “done” shows.',
    render: () => (
      <Later ms={600}>
        <template data-testid="inner-tpl" innerHTML="<p>inert</p>" />
        <p data-testid="ntpl-done">done</p>
      </Later>
    ) },
  { id: 'link-stylesheet', group: 'special', title: 'Stylesheet link', expected: 'Text turns green via data: stylesheet.',
    render: () => (
      <Later ms={600}>
        <link rel="stylesheet" href="data:text/css,.lnk{color:rgb(0,128,0)}" />
        <p class="lnk" data-testid="lnk">linked</p>
      </Later>
    ) },
  { id: 'iframe-srcdoc', group: 'special', title: 'iframe srcDoc', expected: 'iframe has srcdoc content.',
    render: () => <Later ms={600}><iframe data-testid="ifr" srcdoc="<p id=x>inside</p>" /></Later> },

  { id: 'big-boundary', group: 'stress', title: 'Big boundary', expected: '600 paragraphs appear in one patch.',
    render: () => (
      <Later ms={800}>
        <div data-testid="big" class="max-h-40 overflow-auto">
          <For each={Array.from({ length: 600 }, (_, i) => i)}>{(i) => <p data-i={i}>row {i}</p>}</For>
        </div>
      </Later>
    ) },
  { id: 'many-boundaries', group: 'stress', title: 'Many boundaries (60)', expected: 'All 60 cells fill.',
    render: () => (
      <div class="grid grid-cols-10 gap-1" data-testid="many-grid">
        <For each={spread(60)}>{(ms, i) => <Later ms={ms} fallback={pulse()}>{cell(i())}</Later>}</For>
      </div>
    ) },
  { id: 'deep-nesting', group: 'stress', title: 'Deep nesting', expected: 'Levels 1–5 all appear.',
    render: () => <Later ms={250}><Deep level={1} /></Later> },
  { id: 'grid-100', group: 'stress', title: 'Grid 100', expected: '100 cells fill.',
    render: () => (
      <div class="grid grid-cols-10 gap-1" data-testid="grid-100">
        <For each={spread(100)}>{(ms, i) => <Later ms={ms} fallback={pulse()}>{cell(i())}</Later>}</For>
      </div>
    ) },

  { id: 'patch-interactive', group: 'races', title: 'Patch → interactive', expected: 'Button hydrates and increments.',
    render: () => <Later ms={700}><Counter /></Later> },
  { id: 'client-wins', group: 'races', title: 'Client wins', expected: 'Slow content still appears.',
    render: () => <Later ms={3000}><p data-testid="client-wins-content">content</p></Later> },
  { id: 'adjacent-boundaries', group: 'races', title: 'Adjacent boundaries', expected: 'A and B both resolve.',
    render: () => (
      <>
        <Later ms={500}><p data-testid="adj-a">A</p></Later>
        <Later ms={520}><p data-testid="adj-b">B</p></Later>
      </>
    ) },
  { id: 'nested-inner-first', group: 'races', title: 'Nested inner-first', expected: 'Inner resolves before outer finishes.',
    render: () => <NestedInnerFirst /> },
  { id: 'reverse-order', group: 'races', title: 'Reverse order', expected: 'Cells 4→0 resolve (slow first in DOM).',
    render: () => (
      <div class="flex gap-1" data-testid="reverse">
        <For each={[0, 1, 2, 3, 4]}>{(i) => <Later ms={2000 - i * 400} fallback={pulse()}>{cell(i)}</Later>}</For>
      </div>
    ) },
];

export const groups = ['basics', 'edge-cases', 'special', 'stress', 'races'] as const;
