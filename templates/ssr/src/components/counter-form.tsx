import { createSignal } from 'solid-js';
import { getRequestEvent } from '@solidjs/web';
import { formAction } from '@solidjs/router';
import { parseCount } from '../lib/csp-js';
import { increment } from '../actions';

const incrementAction = formAction(increment);

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
  const [count, setCount] = createSignal(serverCount());
  const path = currentPath();
  const [clientCount, setClientCount] = createSignal(0);

  return (
    <div class="flex flex-col gap-2">
      {/* Server action: works with JS off (POST + 303) and on (router-driven). */}
      <form
        action={incrementAction.onSettled(() => setCount(parseCount(document.cookie)))} method="post" class="flex">
        <input type="hidden" name="redirect" value={path} />
        <button
          class="flex-1 rounded-md bg-blue-500 p-2 text-white hover:bg-blue-600"
          type="submit"
        >
          Interactive Button Clicked {count()} times
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
