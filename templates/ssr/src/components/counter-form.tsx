import { createSignal } from 'solid-js';
import { getRequestEvent } from '@solidjs/web';
import { COUNT_PATH, parseCount } from '../lib/csp-js';

function currentPath(): string {
  const event = getRequestEvent();
  if (event) {
    const url = new URL(event.request.url);
    return url.pathname + url.search;
  }
  return typeof location !== 'undefined' ? location.pathname + location.search : '/';
}

function serverCount(): number {
  const event = getRequestEvent();
  if (event) return parseCount(event.request.headers.get('cookie'));
  return typeof document !== 'undefined' ? parseCount(document.cookie) : 0;
}

export function CounterForm() {
  const count = serverCount();
  const path = currentPath();
  const [clientCount, setClientCount] = createSignal(0);

  return (
    <div class="flex flex-col gap-2">
      {/* Server action: plain form POST → 303 back, so it works with JS off. */}
      <form
        method="post"
        action={`${COUNT_PATH}?redirect=${encodeURIComponent(path)}`}
        class="flex"
      >
        <button
          class="flex-1 rounded-md bg-blue-500 p-2 text-white hover:bg-blue-600"
          type="submit"
        >
          Interactive Button Clicked {count} times
        </button>
      </form>
      <button
        class="rounded-md bg-blue-500 p-2 text-white hover:bg-blue-600"
        type="button"
        onClick={() => setClientCount((n) => n + 1)}
      >
        Client Button Clicked {clientCount()} times (needs JS)
      </button>
    </div>
  );
}
