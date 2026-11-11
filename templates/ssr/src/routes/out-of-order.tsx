import { For, Reveal } from 'solid-js';
import { ExampleShell } from '../components/example-shell';
import { OutOfOrderPanel } from '../components/out-of-order-panel';
import { SlowPanel } from '../components/slow-panel';
import { outOfOrderPanels } from '../lib/streaming';
import type { PanelTone } from '../lib/tones';

const tones: PanelTone[] = ['rose', 'emerald', 'amber'];

export default function OutOfOrderPage() {
  return (
    <ExampleShell
      title="Out-of-order reveal"
      description="The first boundary is intentionally slow (2.5s). The second is fast (600ms). The fast panel should stream in before the slow one finishes — HTML completion order follows readiness, not source order."
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <SlowPanel label="Declared first (slow)" delayMs={2500} tone="rose" />
        <SlowPanel
          label="Declared second (fast)"
          delayMs={600}
          tone="emerald"
        />
      </div>

      <section class="border-t border-zinc-200 pt-8">
        <h2 class="text-lg font-bold tracking-tight">
          Sequential vs natural Reveal
        </h2>
        <p class="mt-1 max-w-2xl text-sm text-zinc-600">
          Solid&apos;s <code class="text-sm">&lt;Reveal&gt;</code> can hold the
          fallback → content swap until earlier slots are ready, even when a
          later slot&apos;s HTML already streamed. Hard-refresh to compare.
        </p>

        <div class="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Sequential
            </p>
            <p class="mt-1 mb-3 text-sm text-zinc-600">
              B resolves first but waits to swap until A is ready.
            </p>
            <div class="space-y-3">
              <Reveal order="sequential">
                <For each={outOfOrderPanels}>
                  {(panel, index) => (
                    <OutOfOrderPanel panel={panel} tone={tones[index()]} />
                  )}
                </For>
              </Reveal>
            </div>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Natural
            </p>
            <p class="mt-1 mb-3 text-sm text-zinc-600">
              Each slot swaps as soon as its own data resolves.
            </p>
            <div class="space-y-3">
              <Reveal order="natural">
                <For each={outOfOrderPanels}>
                  {(panel, index) => (
                    <OutOfOrderPanel panel={panel} tone={tones[index()]} />
                  )}
                </For>
              </Reveal>
            </div>
          </div>
        </div>

        <table class="mt-8 w-full border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-zinc-200 text-zinc-500">
              <th class="py-2 pr-3 font-semibold">Time</th>
              <th class="py-2 pr-3 font-semibold">Server stream</th>
              <th class="py-2 pr-3 font-semibold">Sequential UI</th>
              <th class="py-2 font-semibold">Natural UI</th>
            </tr>
          </thead>
          <tbody class="text-zinc-700">
            <tr class="border-b border-zinc-200">
              <td class="py-2 pr-3 font-medium text-zinc-900">0s</td>
              <td class="py-2 pr-3">Shell + all fallbacks flush</td>
              <td class="py-2 pr-3">A, B, C show fallbacks</td>
              <td class="py-2">A, B, C show fallbacks</td>
            </tr>
            <tr class="border-b border-zinc-200">
              <td class="py-2 pr-3 font-medium text-zinc-900">~0.5s</td>
              <td class="py-2 pr-3">B fragment HTML streams</td>
              <td class="py-2 pr-3">B still shows fallback</td>
              <td class="py-2">B swaps to content</td>
            </tr>
            <tr class="border-b border-zinc-200">
              <td class="py-2 pr-3 font-medium text-zinc-900">~1.5s</td>
              <td class="py-2 pr-3">C fragment HTML streams</td>
              <td class="py-2 pr-3">C still shows fallback</td>
              <td class="py-2">C swaps to content</td>
            </tr>
            <tr>
              <td class="py-2 pr-3 font-medium text-zinc-900">~3s</td>
              <td class="py-2 pr-3">A fragment streams; frontier advances</td>
              <td class="py-2 pr-3">A swaps, then B &amp; C swap</td>
              <td class="py-2">A swaps to content</td>
            </tr>
          </tbody>
        </table>
      </section>
    </ExampleShell>
  );
}
