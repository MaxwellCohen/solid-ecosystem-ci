import { Title } from '@solidjs/meta';
import type { RouteDefinition } from '@solidjs/router';
import { httpStatus } from '@solidjs/web';

export const route = {
  preload: () => httpStatus(404),
} satisfies RouteDefinition;

export default function NotFound() {
  return (
    <div class="w-full max-w-3xl">
      <Title>Not Found · DPU Solid</Title>
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Solid streaming
      </p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight">Page not found</h1>
      <p class="mt-2 text-zinc-600">
        Return to the{' '}
        <a class="underline underline-offset-4 hover:text-zinc-950" href="/">
          streaming demo overview
        </a>
        .
      </p>
    </div>
  );
}
