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

function Section(props: { label: string; note: string; children: any }) {
  return (
    <section class="border-t border-zinc-200 pt-6 first:border-t-0 first:pt-0">
      <h2 class="text-lg font-bold tracking-tight">{props.label}</h2>
      <p class="mt-1 mb-4 text-sm text-zinc-600">{props.note}</p>
      <div class="space-y-3">{props.children}</div>
    </section>
  );
}

export default function RevealPage() {
  return (
    <ExampleShell
      title="Reveal"
      description="Solid 2’s <Reveal> (like React’s SuspenseList) coordinates sibling Loading boundaries during SSR streaming. Hard-refresh to compare modes — panels flash as they reveal."
    >
      <div class="rounded-md border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
        <p class="font-semibold">Works with JavaScript off</p>
        <p class="mt-1">
          Each resolved panel streams as a <code>&lt;template for&gt;</code>{' '}
          patch. The server holds a panel’s patch until its{' '}
          <code>&lt;Reveal&gt;</code> releases it, so a browser with
          declarative partial updates applies the patches in Reveal order
          without running any script. Turn JS off (header) and hard-refresh to
          compare. With JS on, Solid’s runtime takes over the same patches and
          hydrates them.
        </p>
      </div>
      <For each={modes}>
        {(mode) => (
          <Section label={mode.label} note={mode.note}>
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
          </Section>
        )}
      </For>
      <Section
        label="Collapsed, frontier advancing"
        note="Item 1 lands at 0.8s; the frontier moves to Item 2, whose skeleton appears only then (Item 3 stays hidden). Item 3 is ready at 1.4s but waits for Item 2 at 2s. With JS off, the skeleton arrives as its own patch."
      >
        <Reveal collapsed>
          <SlowPanel label="Item 1" delayMs={800} tone="sky" />
          <SlowPanel label="Item 2" delayMs={2000} tone="emerald" />
          <SlowPanel label="Item 3" delayMs={1400} tone="amber" />
        </Reveal>
      </Section>
      <Section
        label="Nested Reveal"
        note="A together group nested in a sequential one. The inner group is ready at 1.4s but holds until the outer frontier (Item 1, 2s) passes it, then Items 2 and 3 land together."
      >
        <Reveal>
          <SlowPanel label="Item 1" delayMs={2000} tone="sky" />
          <Reveal order="together">
            <SlowPanel label="Item 2" delayMs={800} tone="emerald" />
            <SlowPanel label="Item 3" delayMs={1400} tone="amber" />
          </Reveal>
        </Reveal>
      </Section>
      <Section
        label="Boundary inside a held panel"
        note="Item 2’s nested details resolve at about 1.2s, while Item 2 is still held behind Item 1. Their patch waits for Item 2’s, so both land at 2s, details included."
      >
        <Reveal>
          <SlowPanel label="Item 1" delayMs={2000} tone="sky" />
          <SlowPanel label="Item 2" delayMs={800} tone="emerald">
            <SlowPanel label="Item 2 details" delayMs={400} tone="violet" />
          </SlowPanel>
        </Reveal>
      </Section>
    </ExampleShell>
  );
}
