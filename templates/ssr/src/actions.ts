'use server';

/** `(prevState, formData) => nextState`, as in React's `useActionState`. */
export async function increment(prev: number, _form: FormData) {
  return prev + 1;
}
