import { CounterForm } from '../components/counter-form';
import { ExampleShell } from '../components/example-shell';
import { SlowPanel } from '../components/slow-panel';

export default function BasicPage() {
  return (
    <ExampleShell
      title="Basic boundary"
      description="The heading above is in the shell and should appear immediately. The panel below is wrapped in Loading and streams after a 1.5s delay, including a hydrated counter you can click to increment."
    >
      <SlowPanel label="Profile" delayMs={1500} tone="sky">
        <CounterForm />
      </SlowPanel>
    </ExampleShell>
  );
}
