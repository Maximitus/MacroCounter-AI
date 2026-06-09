const MODEL = 'gemini-3-flash-preview';

function chatEndpoint(): string {
  return `${import.meta.env.BASE_URL}api/chat`;
}

type GeminiPart =
  | {text: string}
  | {inlineData: {mimeType: string; data: string}};

export type {GeminiPart};

function parseGeminiTextResponse(res: Response, raw: string): string {
  let data: {
    error?: {message?: string; hint?: string};
    candidates?: {content?: {parts?: {text?: string}[]}}[];
  };
  try {
    data = raw ? (JSON.parse(raw) as typeof data) : {};
  } catch {
    throw new Error(
      `Chat API ${res.status}: ${raw.trim() ? raw.slice(0, 200) : 'empty or non-JSON body (e.g. 405 from static host — check Worker routing)'}`,
    );
  }

  if (!res.ok || data.error) {
    const err = data.error;
    const parts = [err?.message, err?.hint].filter(Boolean);
    throw new Error(parts.length ? parts.join(' — ') : JSON.stringify(data));
  }

  const text = data.candidates?.[0]?.content?.parts?.find((p) => p.text != null)?.text;
  if (text == null) {
    throw new Error('No text in Gemini response');
  }
  return text;
}

export async function generateContentJson(params: {
  parts: GeminiPart[];
}): Promise<string> {
  const res = await fetch(chatEndpoint(), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      model: MODEL,
      contents: [{role: 'user', parts: params.parts}],
      generationConfig: {responseMimeType: 'application/json'},
    }),
  });

  const raw = await res.text();
  return parseGeminiTextResponse(res, raw);
}

/** Multi-turn chat (no JSON response mode). */
export async function generateChat(params: {
  contents: {role: 'user' | 'model'; parts: GeminiPart[]}[];
  systemInstruction?: string;
}): Promise<string> {
  if (!params.contents?.length) {
    throw new Error('Chat request has no messages (contents empty)');
  }
  const body: Record<string, unknown> = {
    model: MODEL,
    contents: params.contents,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.75,
    },
  };
  if (params.systemInstruction) {
    body.systemInstruction = {parts: [{text: params.systemInstruction}]};
  }

  const res = await fetch(chatEndpoint(), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  return parseGeminiTextResponse(res, raw);
}
