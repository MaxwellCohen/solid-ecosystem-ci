import { createSignal, onSettled } from 'solid-js';

/** Shows when a streamed fragment landed — useful to compare reveal timing. */
export function StreamStamp(props: { label: string }) {
  const [stamp, setStamp] = createSignal('');

  onSettled(() => {
    setStamp(new Date().toLocaleTimeString());
  });

  return (
    <time class="block text-xs text-zinc-500" datetime={stamp()}>
      {props.label} · {stamp() || '…'}
    </time>
  );
}
