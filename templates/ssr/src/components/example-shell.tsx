import { Title } from '@solidjs/meta';
import type { ParentProps } from 'solid-js';

type ExampleShellProps = ParentProps<{
  title: string;
  description: string;
}>;

export function ExampleShell(props: ExampleShellProps) {
  return (
    <div class="w-full max-w-3xl">
      <Title>{`${props.title} · DPU Solid`}</Title>
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Solid streaming
      </p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight">{props.title}</h1>
      <p class="mt-2 max-w-2xl text-zinc-600">{props.description}</p>
      <div class="mt-8 space-y-4">{props.children}</div>
    </div>
  );
}
