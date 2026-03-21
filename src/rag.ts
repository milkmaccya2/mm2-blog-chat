import { EMBEDDING_MODEL } from './constants';

export interface RagResult {
  text: string;
  source: string;
  title: string;
  url: string;
  date: string;
  score: number;
}

export interface SearchOptions {
  topK?: number;
  recentOnly?: boolean;
}

export async function searchRelevantChunks(
  query: string,
  ai: Ai,
  vectorize: VectorizeIndex,
  options: SearchOptions = {}
): Promise<RagResult[]> {
  const { topK = 5, recentOnly = false } = options;

  const embedding = await ai.run(EMBEDDING_MODEL, {
    text: [query],
  });

  if (!('data' in embedding) || !Array.isArray(embedding.data) || embedding.data.length === 0) {
    throw new Error('Unexpected embedding response format or empty data');
  }
  const queryVector = embedding.data[0];

  // recentOnly時は多めに取得してJS側でフィルタリング（Vectorizeのメタデータfilterが不安定なため）
  const fetchTopK = recentOnly ? Math.max(topK * 3, 15) : topK;

  const results = await vectorize.query(queryVector, {
    topK: fetchTopK,
    returnMetadata: 'all',
  });

  let mapped = results.matches.map((match) => ({
    text: (match.metadata?.text as string) ?? '',
    source: (match.metadata?.source as string) ?? '',
    title: (match.metadata?.title as string) ?? '',
    url: (match.metadata?.url as string) ?? '',
    date: (match.metadata?.date as string) ?? '',
    score: match.score,
  }));

  if (recentOnly) {
    const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);
    const cutoff =
      eightWeeksAgo.getUTCFullYear() * 10000 +
      (eightWeeksAgo.getUTCMonth() + 1) * 100 +
      eightWeeksAgo.getUTCDate();
    mapped = mapped
      .filter((r) => {
        const dateNum = r.date ? Number(r.date.replace(/-/g, '')) : 0;
        return dateNum >= cutoff;
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, topK);
  }

  return mapped;
}

export function formatContext(results: RagResult[]): string {
  if (results.length === 0) {
    return '関連するコンテキストは見つからなかった。';
  }

  return results.map((r) => `### ${r.title} (${r.source})\n${r.text}`).join('\n\n');
}
