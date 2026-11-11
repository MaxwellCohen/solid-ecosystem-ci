import { createMemo, Loading } from 'solid-js';
import { loadTimedPanel, type PanelData } from '../lib/streaming';
import { panelTones, type PanelTone } from '../lib/tones';
import { Skeleton } from './skeleton';
import { StreamStamp } from './stream-stamp';

export function OutOfOrderPanel(props: { panel: PanelData; tone?: PanelTone }) {
  const data = createMemo(() => loadTimedPanel(props.panel));
  const tone = () => panelTones[props.tone ?? 'sky'];

  return (
    <Loading fallback={<Skeleton label={props.panel.label.toLowerCase()} />}>
      <article class={`rounded-md border px-4 py-6 ${tone()}`}>
        <h3 class="text-lg font-bold tracking-tight">{data().label}</h3>
        <p class="mt-1 text-sm opacity-80">{data().detail}</p>
        <dl class="mt-3 grid gap-2 text-sm">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-[0.08em] opacity-70">
              Data resolved (server)
            </dt>
            <dd class="mt-0.5 font-mono text-xs">{data().resolvedAt}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-[0.08em] opacity-70">
              Fragment revealed (browser)
            </dt>
            <dd class="mt-0.5">
              <StreamStamp label={props.panel.label} />
            </dd>
          </div>
        </dl>
      </article>
    </Loading>
  );
}
