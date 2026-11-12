import { formAction, useSubmissions } from '@solidjs/router';

/**
 * Solid's `useActionState`. Call once at module scope with a (server)
 * function `(prevState, formData) => nextState`; it returns a hook for
 * components that yields `[state, action, pending]`:
 *
 *   const useCounter = createActionState(increment, 0);
 *   const [count, action, pending] = useCounter();
 *   <form action={action()}> … </form>
 *
 * `action()` is the form action with the current state bound as the first
 * argument (it rides in the action URL, so no-JS posts carry it too). The
 * state is the latest submission's result, or `initial` before any.
 */
export function createActionState<S>(
  fn: (prev: S, form: FormData) => Promise<S>,
  initial: S,
) {
  const base = formAction(fn);
  return () => {
    const submissions = useSubmissions(base);
    const state = (): S => (submissions.at(-1)?.result as S | undefined) ?? initial;
    const pending = () => submissions.some((s) => s.result === undefined && !s.error);
    return [state, () => base.with(state()), pending] as const;
  };
}
