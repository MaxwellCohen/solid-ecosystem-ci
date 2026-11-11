import { getRequestEvent } from '@solidjs/web';
import { TOGGLE_PATH } from '../lib/csp-js';

function currentPath(): string {
  const event = getRequestEvent();
  if (event) {
    const url = new URL(event.request.url);
    return url.pathname + url.search;
  }
  if (typeof location !== 'undefined') return location.pathname + location.search;
  return '/';
}

function noJsEnabled(): boolean {
  const event = getRequestEvent();
  if (event?.locals?.noJs !== undefined) return Boolean(event.locals.noJs);
  if (typeof document !== 'undefined') {
    return document.cookie.includes('solid-dpu-no-js=1');
  }
  return false;
}

/**
 * Plain HTML form — works with JS disabled. Sets a cookie that middleware
 * turns into `Content-Security-Policy: script-src 'none'`.
 */
export function NoJsToggle() {
  const enabled = noJsEnabled();
  const nextState = enabled ? 'on' : 'off';

  return (
    <form
      method="get"
      action={TOGGLE_PATH}
      class="flex flex-wrap items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
    >
      <input type="hidden" name="state" value={nextState} />
      <input type="hidden" name="redirect" value={currentPath()} />
      <span class="text-zinc-600">
        JS:{' '}
        <span class="font-semibold text-zinc-900">
          {enabled ? 'off (CSP)' : 'on'}
        </span>
      </span>
      <button
        type="submit"
        class="rounded-md bg-zinc-900 px-3 py-1.5 font-medium text-white hover:bg-zinc-700"
      >
        {enabled ? 'Turn JS on' : 'Turn JS off'}
      </button>
    </form>
  );
}
