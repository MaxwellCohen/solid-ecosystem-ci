import { createMemo, createProjection, For, Loading } from 'solid-js';
import { ExampleShell } from '../components/example-shell';
import { Skeleton } from '../components/skeleton';
import { StreamStamp } from '../components/stream-stamp';
import { tokenStream } from '../lib/streaming';

const words = ['Solid', 'streams', 'values', 'incrementally'];

export default function AsyncStreamPage() {
  const streamedText = createMemo(async function* () {
    yield* tokenStream(words, 800);
  });

  const projection = createProjection(
    async function* (draft) {
      draft.tokens = [];
      for (const word of words) {
        for await (const chunk of tokenStream([word], 600)) {
          draft.tokens.push(chunk);
          yield;
        }
      }
    },
    { tokens: [] as string[] },
  );

  return (
    <ExampleShell
      title="AsyncIterable streams"
      description="Computations can return AsyncIterable values — each yield updates the read and streams another HTML fragment through SSR. Hard-refresh to watch incremental chunks land in the response; with DPU enabled the browser applies each update without JavaScript."
    >
      <section>
        <h2 class="text-lg font-bold tracking-tight">
          createMemo async generator
        </h2>
        <p class="mt-1 mb-4 text-sm text-zinc-600">
          An async generator yields progressively longer strings.
        </p>
        <Loading fallback={<Skeleton label="memo stream" />}>
          <div class="rounded-md border border-sky-300 bg-sky-50 px-4 py-6 text-sky-950">
            <p class="text-2xl font-bold tracking-tight">{streamedText()}</p>
            <div class="mt-3">
              <StreamStamp label="Memo stream" />
            </div>
          </div>
        </Loading>
      </section>

      <section class="border-t border-zinc-200 pt-6">
        <h2 class="text-lg font-bold tracking-tight">
          createProjection async generator
        </h2>
        <p class="mt-1 mb-4 text-sm text-zinc-600">
          Projections stream draft mutations — each yield commits a store update
          through the stream.
        </p>
        <Loading fallback={<Skeleton label="projection" />}>
          <div class="rounded-md border border-violet-300 bg-violet-50 px-4 py-6 text-violet-950">
            <ul class="list-disc space-y-1 pl-5">
              <For each={projection.tokens}>{(token) => <li>{token}</li>}</For>
            </ul>
            <div class="mt-3">
              <StreamStamp label="Projection" />
            </div>
          </div>
        </Loading>
      </section>
    </ExampleShell>
  );
}
