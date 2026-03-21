type Env = {
  /** Present in production and most previews; Vite dev can omit it briefly. */
  ASSETS?: {fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>};
  GEMINI_API_KEY?: string;
};

/** POST targets for chat (must match `run_worker_first` coverage). */
function isChatPost(pathname: string, method: string): boolean {
  if (method !== 'POST') return false;
  const p = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return p === '/macrocounter/api/chat' || p === '/api/chat';
}

async function handleChatPost(request: Request, env: Env): Promise<Response> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({error: {message: 'Missing GEMINI_API_KEY'}}, {status: 500});
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({error: {message: 'Invalid JSON body'}}, {status: 400});
  }

  const model =
    (typeof body.model === 'string' && body.model) || 'gemini-3-flash-preview';
  const {model: _m, ...geminiBody} = body;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(geminiBody),
  });

  const data = await response.json();
  return Response.json(data, {status: response.status});
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (isChatPost(url.pathname, request.method)) {
      return handleChatPost(request, env);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    // Avoid `fetch(request)` here — Miniflare/workerd can throw internal errors (recursive routing).
    return new Response('Asset handler unavailable', {status: 503});
  },
};
