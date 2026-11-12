export const NO_JS_COOKIE = 'solid-dpu-no-js';
export const TOGGLE_PATH = '/__toggle-js';
export const CSP_NO_JS = "script-src 'none'";

export function parseNoJsCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return /(?:^|;\s*)solid-dpu-no-js=1(?:;|$)/.test(cookieHeader);
}

/** Same-origin path redirect only — blocks open redirects via Referer. */
export function safeRedirectPath(target: string, requestUrl: string): string {
  try {
    const resolved = new URL(target, requestUrl);
    const origin = new URL(requestUrl).origin;
    if (resolved.origin !== origin) return '/';
    return resolved.pathname + resolved.search;
  } catch {
    return '/';
  }
}
