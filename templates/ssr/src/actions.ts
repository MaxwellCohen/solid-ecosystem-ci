'use server';
import { getRequestEvent, respond } from '@solidjs/web';
import { COUNT_COOKIE, parseCount } from './lib/csp-js';

/**
 * Server action bound to a `<form action>`. It returns the new count; the
 * router turns that into the submission result (no-JS: via its flash cookie
 * after a redirect back to the page).
 */
export async function increment(_form: FormData) {
  const { request } = getRequestEvent()!;
  const count = parseCount(request.headers.get('cookie')) + 1;
  return respond(count, {
    headers: { 'Set-Cookie': `${COUNT_COOKIE}=${count}; Path=/; Max-Age=86400; SameSite=Lax` },
  });
}
