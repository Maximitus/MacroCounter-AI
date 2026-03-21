type Env = { GEMINI_API_KEY?: string };

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const apiKey = context.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({error: {message: 'Missing GEMINI_API_KEY'}}), {
      status: 500,
      headers: {'Content-Type': 'application/json'},
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await context.request.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({error: {message: 'Invalid JSON body'}}), {
      status: 400,
      headers: {'Content-Type': 'application/json'},
    });
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
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: {'Content-Type': 'application/json'},
  });
};
