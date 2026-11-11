import { getRequestEvent } from '@solidjs/web';

/** Current request's query string (server: request URL; client: location). */
export function query(): URLSearchParams {
  const event = getRequestEvent();
  if (event) return new URL(event.request.url).searchParams;
  if (typeof location !== 'undefined') return new URLSearchParams(location.search);
  return new URLSearchParams();
}

/** Delay multiplier from `?scale=`. */
export function scale(): number {
  const n = Number(query().get('scale'));
  return n > 0 ? n : 1;
}
