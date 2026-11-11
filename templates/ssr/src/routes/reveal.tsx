import { For, Reveal } from 'solid-js';
import { ExampleShell } from '../components/example-shell';
import { SlowPanel } from '../components/slow-panel';

const items = [
  { label: 'Item 1', delayMs: 2000, tone: 'sky' as const },
  { label: 'Item 2', delayMs: 800, tone: 'emerald' as const },
  { label: 'Item 3', delayMs: 1400, tone: 'amber' as const },
];

const modes: {
  order: 'sequential' | 'together' | 'natural';
  collapsed?: boolean;
  label: string;
  note: string;
}[] = [
  {
    order: 'sequential',
    label: 'Sequential (default)',
    note: 'Boundaries reveal in registration order. Item 2 resolves first but waits until Item 1 swaps — Solid’s counterpart to SuspenseList revealOrder="forwards".',
  },
  {
    order: 'sequential',
    collapsed: true,
    label: 'Sequential + collapsed',
    note: 'Only the frontier fallback is visible — tail siblings hide their skeletons until the frontier advances.',
  },
  {
    order: 'together',
    label: 'Together',
    note: 'Every slot holds its fallback until all direct children are ready, then the group releases at once.',
  },
  {
    order: 'natural',
    label: 'Natural',
    note: 'Each boundary swaps as soon as its own data resolves — no ordering constraint.',
  },
];

export default function RevealPage() {
  return (
    <ExampleShell
      title="Reveal"
      description="Solid 2’s <Reveal> (like React’s SuspenseList) coordinates sibling Loading boundaries during SSR streaming. Hard-refresh to compare modes — the server streams resolved HTML into template slots while Reveal controls when each fallback swaps to content."
    >
      <For each={modes}>
        {(mode) => (
          <section class="border-t border-zinc-200 pt-6 first:border-t-0 first:pt-0">
            <h2 class="text-lg font-bold tracking-tight">{mode.label}</h2>
            <p class="mt-1 mb-4 text-sm text-zinc-600">{mode.note}</p>
            <div class="space-y-3">
              <Reveal order={mode.order} collapsed={mode.collapsed}>
                <For each={items}>
                  {(item) => (
                    <SlowPanel
                      label={item.label}
                      delayMs={item.delayMs}
                      tone={item.tone}
                    />
                  )}
                </For>
              </Reveal>
            </div>
          </section>
        )}
      </For>
    </ExampleShell>
  );
}
