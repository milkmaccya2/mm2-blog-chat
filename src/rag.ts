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

  const queryVector = embedding.data[0];

  const filter: VectorizeVectorMetadataFilter = {};
  if (recentOnly) {
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const dateNum =
      fourWeeksAgo.getFullYear() * 10000 +
      (fourWeeksAgo.getMonth() + 1) * 100 +
      fourWeeksAgo.getDate();
    filter.dateNum = { $gte: dateNum };
  }

  const results = await vectorize.query(queryVector, {
    topK,
    returnMetadata: 'all',
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  });

  const mapped = results.matches.map((match) => ({
    text: (match.metadata?.text as string) ?? '',
    source: (match.metadata?.source as string) ?? '',
    title: (match.metadata?.title as string) ?? '',
    url: (match.metadata?.url as string) ?? '',
    date: (match.metadata?.date as string) ?? '',
    score: match.score,
  }));

  if (recentOnly) {
    mapped.sort((a, b) => b.date.localeCompare(a.date));
  }

  return mapped;
}

export function formatContext(results: RagResult[]): string {
  if (results.length === 0) {
    return '関連するコンテキストは見つからなかった。';
  }

  return results.map((r) => `### ${r.title} (${r.source})\n${r.text}`).join('\n\n');
}
