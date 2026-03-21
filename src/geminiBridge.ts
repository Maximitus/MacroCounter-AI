const MODEL = 'gemini-3-flash-preview';

function chatEndpoint(): string {
  return `${import.meta.env.BASE_URL}api/chat`;
}

type GeminiPart =
  | {text: string}
  | {inlineData: {mimeType: string; data: string}};

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

  const data = (await res.json()) as {
    error?: {message?: string};
    candidates?: {content?: {parts?: {text?: string}[]}}[];
  };

  if (!res.ok || data.error) {
    throw new Error(data.error?.message ?? JSON.stringify(data));
  }

  const text = data.candidates?.[0]?.content?.parts?.find((p) => p.text != null)?.text;
  if (text == null) {
    throw new Error('No text in Gemini response');
  }
  return text;
}
