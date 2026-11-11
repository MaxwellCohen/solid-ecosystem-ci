import { createMemo, Loading, type ParentProps } from 'solid-js';
import { delay } from '../lib/streaming';
import { panelTones, type PanelTone } from '../lib/tones';
import { Skeleton } from './skeleton';

type SlowPanelProps = ParentProps<{
  label: string;
  delayMs: number;
  tone?: PanelTone;
}>;

export function SlowPanel(props: SlowPanelProps) {
  const data = createMemo(() =>
    delay({ label: props.label, delayMs: props.delayMs }, props.delayMs),
  );

  return (
    <Loading fallback={<Skeleton label={props.label.toLowerCase()} />}>
      <section
        class={`rounded-md border px-4 py-6 ${panelTones[props.tone ?? 'sky']}`}
      >
        <h2 class="text-lg font-bold tracking-tight">{data().label}</h2>
        <p class="mt-1 text-sm opacity-80">Resolved after {data().delayMs}ms</p>
        {props.children ? <div class="mt-3">{props.children}</div> : null}
      </section>
    </Loading>
  );
}
