// Cloudflare Worker entry: static client assets are served by the `assets`
// binding; everything else streams through the built SSR handler.
import { handleRequest } from './dist/server/server.js';
export default { fetch: req => handleRequest(req) };
