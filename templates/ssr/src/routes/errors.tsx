import { createMemo, Errored, Loading } from 'solid-js';
import { ExampleShell } from '../components/example-shell';
import { Skeleton } from '../components/skeleton';
import { fetchMessage } from '../lib/streaming';

export default function ErrorsPage() {
  const success = createMemo(() => fetchMessage(false));
  const failure = createMemo(() => fetchMessage(true));

  return (
    <ExampleShell
      title="Errored boundaries"
      description="Async rejections inside a streamed branch resolve on the server and stream an <Errored> fallback into the DPU template slot — the browser applies the swap without JavaScript, same as a successful boundary."
    >
      <section>
        <h2 class="text-lg font-bold tracking-tight">Successful stream</h2>
        <p class="mt-1 mb-4 text-sm text-zinc-600">
          Promise resolves — streamed content replaces the Loading fallback.
        </p>
        <Loading fallback={<Skeleton label="message" />}>
          <div class="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-6 text-emerald-950">
            <h3 class="text-lg font-bold tracking-tight">OK</h3>
            <p class="mt-1 text-sm opacity-80">{success().message}</p>
          </div>
        </Loading>
      </section>

      <section class="border-t border-zinc-200 pt-6">
        <h2 class="text-lg font-bold tracking-tight">Failed stream</h2>
        <p class="mt-1 mb-4 text-sm text-zinc-600">
          Promise rejects — the Errored fallback streams in place of content.
        </p>
        <Errored
          fallback={(err) => (
            <div
              class="rounded-md border border-rose-300 bg-rose-50 px-4 py-6 text-rose-950"
              role="alert"
            >
              <h3 class="text-lg font-bold tracking-tight">
                Streamed branch errored
              </h3>
              <p class="mt-1 text-sm opacity-80">{String(err())}</p>
            </div>
          )}
        >
          <Loading fallback={<Skeleton label="message" />}>
            <div class="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-6 text-emerald-950">
              <p>{failure().message}</p>
            </div>
          </Loading>
        </Errored>
      </section>
    </ExampleShell>
  );
}
