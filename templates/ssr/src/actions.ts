'use server';

/**
 * Server action bound to a `<form action>`. The current count travels in the
 * form (hidden input); the action returns the next one, which the router
 * exposes as the submission result (no-JS too, after its redirect back).
 */
export async function increment(form: FormData) {
  return Number(form.get('count') ?? 0) + 1;
}
