import { For } from 'solid-js';
import { paths } from '../router';

const links = [
  { href: paths(), label: 'Home' },
  { href: paths.basic(), label: 'Basic' },
  { href: paths.parallel(), label: 'Parallel' },
  { href: paths.nested(), label: 'Nested' },
  { href: paths['out-of-order'](), label: 'Out of order' },
  { href: paths.reveal(), label: 'Reveal' },
  { href: paths['async-stream'](), label: 'AsyncIterable' },
  { href: paths.errors(), label: 'Errored' },
  { href: '/edge-cases', label: 'Edge cases' },
] as const;

export function Header() {
  return (
    <header class="border-b border-zinc-200 bg-white/90 px-6 py-4 backdrop-blur lg:sticky lg:top-0 lg:z-10">
      <div class="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-lg font-bold tracking-tight">
          <a href={paths()}>DPU · Solid streaming</a>
        </h2>
        <nav class="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <For each={links}>
            {(link) => (
              <a
                href={link.href}
                class="text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline"
              >
                {link.label}
              </a>
            )}
          </For>
        </nav>
      </div>
    </header>
  );
}
