import { createAnthropic } from '@ai-sdk/anthropic';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { formatContext, searchRelevantChunks } from './rag';
import { buildPromptWithContext } from './system-prompt';

interface Env {
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  ANTHROPIC_API_KEY: string;
}

const ALLOWED_ORIGINS = [
  'https://blog.milkmaccya.com',
  /^https:\/\/.*-mm2-blog\.milkmaccya2\.workers\.dev$/,
  /^http:\/\/localhost:\d+$/,
];

function getAllowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  for (const allowed of ALLOWED_ORIGINS) {
    if (typeof allowed === 'string' ? origin === allowed : allowed.test(origin)) {
      return origin;
    }
  }
  return null;
}

function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = getAllowedOrigin(request);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: origin ? corsHeaders(origin) : {},
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/chat') {
      return new Response('Not Found', { status: 404 });
    }

    if (!origin) {
      return new Response('Forbidden', { status: 403 });
    }

    const { messages }: { messages: UIMessage[] } = await request.json();
    const modelMessages = await convertToModelMessages(messages);

    const lastUserMessage = messages.findLast((m) => m.role === 'user');

    let context = '';
    if (lastUserMessage) {
      try {
        const userText =
          lastUserMessage.parts
            ?.filter((p) => p.type === 'text')
            .map((p) => p.text)
            .join('') ?? '';
        const results = await searchRelevantChunks(userText, env.AI, env.VECTORIZE);
        context = formatContext(results);
      } catch (e) {
        console.error('RAG search failed:', e);
      }
    }

    const anthropic = createAnthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });

    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: buildPromptWithContext(context),
      messages: modelMessages,
    });

    const response = result.toUIMessageStreamResponse();

    // Add CORS headers to the streaming response
    const newHeaders = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
      newHeaders.set(key, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
