// Vercel Serverless Function — SSR entry for TanStack Start
// Auto-discovered by Vercel at /api/ssr. All non-asset requests rewrite here via vercel.json.

import type { VercelRequest, VercelResponse } from "@vercel/node";

type FetchHandler = {
  fetch(request: Request, env: unknown, ctx: unknown): Promise<Response> | Response;
};

let _handler: FetchHandler | undefined;

async function getHandler(): Promise<FetchHandler> {
  if (!_handler) {
    // Import the TanStack Start SSR bundle built by vite build
    const mod = await import("../dist/server/server.js");
    _handler = (mod.default ?? mod) as FetchHandler;
  }
  return _handler;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const serverHandler = await getHandler();

  // Reconstruct a Web API Request from the Vercel IncomingMessage
  const protocol = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  const url = `${protocol}://${host}${req.url}`;

  const fetchRequest = new Request(url, {
    method: req.method ?? "GET",
    headers: req.headers as Record<string, string>,
  });

  // Call the TanStack Start Web Fetch handler
  const fetchResponse = await serverHandler.fetch(fetchRequest, process.env, {});

  // Write status + headers
  res.status(fetchResponse.status);
  fetchResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  // Stream body to response
  const body = await fetchResponse.text();
  res.end(body);
}
