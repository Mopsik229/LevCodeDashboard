// Netlify Edge Function: Reverse Proxy for Supabase
// Runs on Deno at Netlify Edge, fully preserving POST/PUT bodies and streaming responses

export default async (request, context) => {
  // CORS Preflight
  if (request.method.toUpperCase() === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const upstreamBase = "https://vqyzzctjymrnymhwwtry.supabase.co";
  const url = new URL(request.url);
  const targetPath = url.pathname.replace(/^\/api\/supabase/, "");
  const upstreamURL = new URL(targetPath + url.search, upstreamBase);

  // Copy and adjust headers
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("Host");

  // Read body as ArrayBuffer for non-GET/HEAD methods
  let body = undefined;
  if (!["GET", "HEAD"].includes(request.method.toUpperCase())) {
    try {
      body = await request.arrayBuffer();
    } catch (_) {
      body = undefined;
    }
  }

  try {
    const upstreamResponse = await fetch(upstreamURL.toString(), {
      method: request.method,
      headers: headers,
      body: body,
      redirect: "follow",
    });

    // Return the upstream response
    return upstreamResponse;
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Edge Proxy Error: " + (err.message || String(err)) }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};
