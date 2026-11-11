import { createSignal } from 'solid-js';

export function CounterForm() {
  const [count, setCount] = createSignal(0);
  const [clientCount, setClientCount] = createSignal(0);

  return (
    <div class="flex flex-col gap-2">
      <button
        class="rounded-md bg-blue-500 p-2 text-white hover:bg-blue-600"
        type="button"
        onClick={() => setCount((n) => n + 1)}
      >
        Interactive Button Clicked {count()} times
      </button>
      <button
        class="rounded-md bg-blue-500 p-2 text-white hover:bg-blue-600"
        type="button"
        onClick={() => setClientCount((n) => n + 1)}
      >
        Client Button Clicked {clientCount()} times
      </button>
    </div>
  );
}
