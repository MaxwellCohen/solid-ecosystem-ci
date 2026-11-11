import { ExampleShell } from '../components/example-shell';
import { SlowPanel } from '../components/slow-panel';

export default function NestedPage() {
  return (
    <ExampleShell
      title="Nested boundaries"
      description="The outer panel streams first (1s). Once it appears, the inner Loading keeps showing its fallback until the nested content resolves (another 1.5s)."
    >
      <SlowPanel label="Account shell" delayMs={1000} tone="violet">
        <SlowPanel label="Nested details" delayMs={1500} tone="sky" />
      </SlowPanel>
    </ExampleShell>
  );
}
