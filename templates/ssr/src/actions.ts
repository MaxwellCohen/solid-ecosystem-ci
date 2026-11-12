'use server';
import { getRequestEvent, redirect } from '@solidjs/web';
import { COUNT_COOKIE, parseCount, safeRedirectPath } from './lib/csp-js';

/**
 * Server action bound to a `<form action>`: works with JS off (real POST +
 * 303) and with JS on (the router calls it and follows the redirect).
 */
export async function increment(form: FormData) {
  const { request } = getRequestEvent()!;
  const count = parseCount(request.headers.get('cookie')) + 1;
  const back = safeRedirectPath(String(form.get('redirect') ?? '/'), request.url);
  return redirect(back, {
    status: 303,
    headers: { 'Set-Cookie': `${COUNT_COOKIE}=${count}; Path=/; Max-Age=86400; SameSite=Lax` },
  });
}
