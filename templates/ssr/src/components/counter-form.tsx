import { createSignal } from 'solid-js';
import { createActionState } from '../lib/action-state';
import { increment } from '../actions';

const useCounter = createActionState(increment, 0);

export function CounterForm() {
  const [count, action, pending] = useCounter();
  const [clientCount, setClientCount] = createSignal(0);

  return (
    <div class="flex flex-col gap-2">
      {/* Server action: works with JS off (POST + 303) and on (router-driven). */}
      <form action={action()} method="post" class="flex">
        <button
          class="flex-1 rounded-md bg-blue-500 p-2 text-white hover:bg-blue-600"
          type="submit"
        >
          Interactive Button Clicked {count()} times{pending() ? ' …' : ''}
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
