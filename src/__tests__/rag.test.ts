import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMBEDDING_MODEL } from '../constants';
import { formatContext, type RagResult, searchRelevantChunks } from '../rag';

describe('formatContext', () => {
  it('returns fallback message when results are empty', () => {
    expect(formatContext([])).toBe('関連するコンテキストは見つからなかった。');
  });

  it('formats single result', () => {
    const results: RagResult[] = [
      { text: 'body text', source: 'blog', title: 'My Post', score: 0.9 },
    ];
    expect(formatContext(results)).toBe('### My Post (blog)\nbody text');
  });

  it('formats multiple results separated by blank lines', () => {
    const results: RagResult[] = [
      { text: 'text1', source: 'src1', title: 'Title1', score: 0.9 },
      { text: 'text2', source: 'src2', title: 'Title2', score: 0.8 },
    ];
    const formatted = formatContext(results);
    expect(formatted).toContain('### Title1 (src1)\ntext1');
    expect(formatted).toContain('### Title2 (src2)\ntext2');
    expect(formatted.split('\n\n')).toHaveLength(2);
  });
});

describe('searchRelevantChunks', () => {
  const mockQueryVector = [0.1, 0.2, 0.3];

  const mockAi = {
    run: vi.fn().mockResolvedValue({ data: [mockQueryVector] }),
  } as unknown as Ai;

  const createMockVectorize = (
    matches: Array<{ id: string; score: number; metadata?: Record<string, unknown> }>
  ) =>
    ({
      query: vi.fn().mockResolvedValue({ matches, count: matches.length }),
    }) as unknown as VectorizeIndex;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped results from vectorize matches', async () => {
    const vectorize = createMockVectorize([
      {
        id: '1',
        score: 0.95,
        metadata: { text: 'hello', source: 'blog', title: 'Post' },
      },
    ]);

    const results = await searchRelevantChunks('test query', mockAi, vectorize);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      text: 'hello',
      source: 'blog',
      title: 'Post',
      score: 0.95,
    });
  });

  it('defaults missing metadata fields to empty strings', async () => {
    const vectorize = createMockVectorize([{ id: '1', score: 0.5, metadata: {} }]);

    const results = await searchRelevantChunks('query', mockAi, vectorize);

    expect(results[0]).toEqual({
      text: '',
      source: '',
      title: '',
      score: 0.5,
    });
  });

  it('uses default topK of 5', async () => {
    const vectorize = createMockVectorize([]);
    await searchRelevantChunks('query', mockAi, vectorize);

    expect(vectorize.query).toHaveBeenCalledWith(mockQueryVector, {
      topK: 5,
      returnMetadata: 'all',
    });
  });

  it('passes custom topK to vectorize query', async () => {
    const vectorize = createMockVectorize([]);
    await searchRelevantChunks('query', mockAi, vectorize, 10);

    expect(vectorize.query).toHaveBeenCalledWith(mockQueryVector, {
      topK: 10,
      returnMetadata: 'all',
    });
  });

  it('calls ai.run with the embedding model and query', async () => {
    const vectorize = createMockVectorize([]);
    await searchRelevantChunks('my search', mockAi, vectorize);

    expect(mockAi.run).toHaveBeenCalledWith(EMBEDDING_MODEL, { text: ['my search'] });
  });

  it('handles matches without metadata gracefully', async () => {
    const vectorize = createMockVectorize([{ id: '1', score: 0.3 }]);

    const results = await searchRelevantChunks('query', mockAi, vectorize);

    expect(results[0]).toEqual({
      text: '',
      source: '',
      title: '',
      score: 0.3,
    });
  });
});
