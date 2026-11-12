import { getRequestEvent } from '@solidjs/web';
import {
  COUNT_COOKIE,
  COUNT_PATH,
  parseCount,
  CSP_NO_JS,
  NO_JS_COOKIE,
  parseNoJsCookie,
  safeRedirectPath,
  TOGGLE_PATH,
} from './lib/csp-js';

export default async function cspJsMiddleware(
  eventOrRequest: any,
  next: () => Promise<Response>,
): Promise<Response> {
  // Newer @solidjs/vite-plugin passes the request event; older passed a Request.
  const request: Request = eventOrRequest.request ?? eventOrRequest;
  const url = new URL(request.url);

  if (url.pathname === TOGGLE_PATH) {
    const disableJs = url.searchParams.get('state') === 'off';
    const redirect = safeRedirectPath(
      url.searchParams.get('redirect') ?? request.headers.get('referer') ?? '/',
      request.url,
    );
    const headers = new Headers({ Location: redirect });
    if (disableJs) {
      headers.append(
        'Set-Cookie',
        `${NO_JS_COOKIE}=1; Path=/; Max-Age=31536000; SameSite=Lax`,
      );
    } else {
      headers.append('Set-Cookie', `${NO_JS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`);
    }
    return new Response(null, { status: 303, headers });
  }

  // Server action: a plain form POST, so the "Interactive" button works with JS off.
  if (url.pathname === COUNT_PATH && request.method === 'POST') {
    const next = parseCount(request.headers.get('cookie')) + 1;
    const redirect = safeRedirectPath(
      url.searchParams.get('redirect') ?? request.headers.get('referer') ?? '/',
      request.url,
    );
    const headers = new Headers({ Location: redirect });
    headers.append('Set-Cookie', `${COUNT_COOKIE}=${next}; Path=/; Max-Age=86400; SameSite=Lax`);
    return new Response(null, { status: 303, headers });
  }

  const noJs = parseNoJsCookie(request.headers.get('cookie'));
  const event = eventOrRequest.request ? eventOrRequest : getRequestEvent();
  if (event) event.locals.noJs = noJs;

  const response = await next();
  if (noJs || url.searchParams.get('hydrate') === 'off') response.headers.set('Content-Security-Policy', CSP_NO_JS);
  return response;
}
