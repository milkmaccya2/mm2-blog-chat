import { EMBEDDING_MODEL } from './constants';

export interface RagResult {
  text: string;
  source: string;
  title: string;
  url: string;
  score: number;
}

export async function searchRelevantChunks(
  query: string,
  ai: Ai,
  vectorize: VectorizeIndex,
  topK = 5
): Promise<RagResult[]> {
  const embedding = await ai.run(EMBEDDING_MODEL, {
    text: [query],
  });

  const queryVector = embedding.data[0];

  const results = await vectorize.query(queryVector, {
    topK,
    returnMetadata: 'all',
  });

  return results.matches.map((match) => ({
    text: (match.metadata?.text as string) ?? '',
    source: (match.metadata?.source as string) ?? '',
    title: (match.metadata?.title as string) ?? '',
    url: (match.metadata?.url as string) ?? '',
    score: match.score,
  }));
}

export function formatContext(results: RagResult[]): string {
  if (results.length === 0) {
    return '関連するコンテキストは見つからなかった。';
  }

  return results.map((r) => `### ${r.title} (${r.source})\n${r.text}`).join('\n\n');
}
