import { getRequestEvent } from '@solidjs/web';
import {
  CSP_NO_JS,
  NO_JS_COOKIE,
  parseNoJsCookie,
  safeRedirectPath,
  TOGGLE_PATH,
} from './lib/csp-js';

export default async function cspJsMiddleware(
  request: Request,
  next: () => Promise<Response>,
): Promise<Response> {
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

  const noJs = parseNoJsCookie(request.headers.get('cookie'));
  const event = getRequestEvent();
  if (event) event.locals.noJs = noJs;

  const response = await next();
  if (noJs) response.headers.set('Content-Security-Policy', CSP_NO_JS);
  return response;
}
