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
        topK: z
          .number()
          .min(1)
          .max(20)
          .optional()
          .describe('取得件数（デフォルト5、深掘り時は10〜15に増やす）'),
        recentOnly: z
          .boolean()
          .optional()
          .describe('trueにすると直近8週間の記事のみに絞り込む。「最近」に関する質問で使用'),
      }),
      outputSchema: z.object({
        context: z.string(),
        sources: z.array(z.object({ url: z.string(), title: z.string() })),
      }),
      execute: async ({ query, topK, recentOnly }) => {
        const results = await searchRelevantChunks(query, env.AI, env.VECTORIZE, {
          topK,
          recentOnly,
        });
        return {
          context: formatContext(results),
          sources: results.filter((r) => r.url).map((r) => ({ url: r.url, title: r.title })),
        };
      },
    }),
  };
}
