import { ExampleShell } from '../components/example-shell';
import { SlowPanel } from '../components/slow-panel';

export default function ParallelPage() {
  return (
    <ExampleShell
      title="Parallel boundaries"
      description="Three sibling Loading boundaries start together. Watch them resolve at 800ms, 1600ms, and 2400ms without blocking each other."
    >
      <div class="grid gap-4 sm:grid-cols-3">
        <SlowPanel label="Stats" delayMs={800} tone="emerald" />
        <SlowPanel label="Activity" delayMs={1600} tone="amber" />
        <SlowPanel label="Billing" delayMs={2400} tone="rose" />
      </div>
    </ExampleShell>
  );
}
