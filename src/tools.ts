import { tool } from 'ai';
import { z } from 'zod';
import { formatContext, searchRelevantChunks } from './rag';

export function createTools(env: { AI: Ai; VECTORIZE: VectorizeIndex }) {
  return {
    search_blog: tool({
      description:
        'ブログ記事を検索します。ブログの内容、経歴、育児日記などに関する質問があった場合に使用してください。挨拶や一般的な会話には使用しないでください。',
      inputSchema: z.object({
        query: z.string().describe('検索クエリ（日本語）'),
      }),
      execute: async ({ query }) => {
        const results = await searchRelevantChunks(query, env.AI, env.VECTORIZE);
        return {
          context: formatContext(results),
          sources: results.filter((r) => r.url).map((r) => ({ url: r.url, title: r.title })),
        };
      },
    }),
  };
}
