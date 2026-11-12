import { createSignal } from 'solid-js';
import { formAction, useSubmissions } from '@solidjs/router';
import { increment } from '../actions';

const incrementAction = formAction(increment);

export function CounterForm() {
  const submissions = useSubmissions(incrementAction);
  const count = () => submissions.at(-1)?.result ?? 0;
  const [clientCount, setClientCount] = createSignal(0);

  return (
    <div class="flex flex-col gap-2">
      {/* Server action: works with JS off (POST + 303) and on (router-driven). */}
      <form action={incrementAction} method="post" class="flex">
        <input type="hidden" name="count" value={count()} />
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
