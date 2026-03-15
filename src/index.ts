import { createAnthropic } from '@ai-sdk/anthropic';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai';
import { SYSTEM_PROMPT } from './system-prompt';
import { createTools } from './tools';

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

    const anthropic = createAnthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });

    return createUIMessageStreamResponse({
      headers: corsHeaders(origin),
      stream: createUIMessageStream({
        execute: ({ writer }) => {
          const result = streamText({
            model: anthropic('claude-sonnet-4-20250514'),
            system: SYSTEM_PROMPT,
            messages: modelMessages,
            tools: createTools(env),
            stopWhen: stepCountIs(2),
            onStepFinish: ({ toolResults }) => {
              for (const toolResult of toolResults) {
                if (toolResult.dynamic) continue;
                if (toolResult.toolName === 'search_blog') {
                  const sources = toolResult.output?.sources;
                  if (Array.isArray(sources)) {
                    for (const source of sources) {
                      writer.write({
                        type: 'source-url',
                        sourceId: source.url,
                        url: source.url,
                        title: source.title,
                      });
                    }
                  }
                }
              }
            },
          });

          writer.merge(result.toUIMessageStream());
        },
      }),
    });
  },
};
