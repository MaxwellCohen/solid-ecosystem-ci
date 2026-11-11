import { createMemo, Loading } from 'solid-js';
import { delay } from '../lib/streaming';
import { CounterForm } from './counter-form';

function StreamProbeFallback() {
  return (
    <div
      class="animate-pulse rounded-md border border-dashed border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950"
      role="status"
      aria-busy="true"
    >
      Checking DPU support… If this text never changes, streamed content could
      not replace this fallback (JavaScript is off and DPU is not supported).
    </div>
  );
}

function StreamProbeResult() {
  return (
    <div class="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-950">
      <span class="font-bold">DPU works here</span> — this message streamed in
      and replaced the loading text.
      <p class="mt-2 opacity-80">
        Try the counter below: each click needs JavaScript. Use “Turn JS off”
        to confirm Solid still streams and swaps fallbacks without a script.
      </p>
      <div class="mt-2">
        <CounterForm />
      </div>
    </div>
  );
}

/**
 * Live probe for DPU (declarative pending UI) support. The result streams in
 * after the shell, so the swap from fallback to content is the test itself:
 * with JavaScript disabled, only DPU can perform the swap.
 */
export function DpuSupportBanner() {
  // 25ms is enough for the app shell to flush before this boundary resolves;
  // shorter delays get inlined and skip visible streaming on full-page SSR.
  const ready = createMemo(() => delay(true, 25));

  return (
    <Loading fallback={<StreamProbeFallback />}>
      {ready() && <StreamProbeResult />}
    </Loading>
  );
}
