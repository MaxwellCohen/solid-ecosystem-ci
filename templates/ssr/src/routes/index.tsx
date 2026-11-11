import { Title } from '@solidjs/meta';
import { For } from 'solid-js';
import { paths } from '../router';

const examples = [
  {
    to: paths.basic(),
    title: 'Basic boundary',
    body: 'One Loading boundary around a slow async memo. Shell paints first; content and a hydrated counter stream in.',
  },
  {
    to: paths.parallel(),
    title: 'Parallel boundaries',
    body: 'Sibling Loading boundaries fetch independently and fill in as each promise resolves.',
  },
  {
    to: paths.nested(),
    title: 'Nested boundaries',
    body: 'Outer shell streams, then inner content streams inside the already-revealed parent.',
  },
  {
    to: paths['out-of-order'](),
    title: 'Out-of-order reveal',
    body: 'Fast panel finishes after a slow one starts — HTML can stream completed sections as they ready. Compare natural vs sequential Reveal.',
  },
  {
    to: paths.reveal(),
    title: 'Reveal',
    body: '<Reveal> coordinates sibling Loading boundaries — sequential, collapsed, together, and natural orders.',
  },
  {
    to: paths['async-stream'](),
    title: 'AsyncIterable streams',
    body: 'createMemo and createProjection return AsyncIterables — incremental values stream through SSR.',
  },
  {
    to: paths.errors(),
    title: 'Errored boundaries',
    body: 'Async errors during streaming route to <Errored> and swap in via DPU like successful boundaries.',
  },
  {
    to: '/edge-cases',
    title: 'Edge cases',
    body: 'Popcorning plus HTML, SVG, MathML, and streamed styles — live stream beside the expected result.',
  },
] as const;

export default function Home() {
  return (
    <div class="w-full max-w-3xl">
      <Title>DPU · Solid streaming</Title>
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Solid 2 · DPU
      </p>
      <h1 class="mt-2 text-4xl font-bold tracking-tight">
        Loading streaming examples
      </h1>
      <p class="mt-3 max-w-2xl text-zinc-600">
        Each page uses <code class="text-sm">ssr: true</code> and async
        computations inside <code class="text-sm">&lt;Loading&gt;</code> so
        the HTML stream can flush fallbacks, then swap in resolved UI (DPU
        pending markers).
      </p>

      <ul class="mt-10 divide-y divide-zinc-200 border-y border-zinc-200">
        <For each={examples}>
          {(example) => (
            <li>
              <a
                href={example.to}
                class="block py-5 transition-colors hover:bg-white"
              >
                <span class="text-lg font-bold tracking-tight">
                  {example.title}
                </span>
                <span class="mt-1 block text-sm text-zinc-600">
                  {example.body}
                </span>
              </a>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
