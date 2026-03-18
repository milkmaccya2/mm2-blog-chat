import { EMBEDDING_MODEL } from './constants';
import type { Chunk } from './types';

interface IngestEnv {
  AI: Ai;
  VECTORIZE: VectorizeIndex;
}

const BATCH_SIZE = 100;

export async function handleIngest(request: Request, env: IngestEnv): Promise<Response> {
  const body = await request.json();
  if (!Array.isArray(body) || body.length === 0) {
    return new Response('Bad Request: expected non-empty array of chunks', { status: 400 });
  }
  const chunks = body as Chunk[];
  console.log(`Received ${chunks.length} chunks`);

  let upserted = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);

    const embeddings = await env.AI.run(EMBEDDING_MODEL, { text: texts });

    if (
      !('data' in embeddings) ||
      !Array.isArray(embeddings.data) ||
      embeddings.data.length === 0
    ) {
      return Response.json(
        { success: false, upserted, error: 'Unexpected embedding response format' },
        { status: 502 }
      );
    }

    const vectors = batch.map((chunk, idx) => ({
      id: chunk.id,
      values: embeddings.data[idx],
      metadata: {
        text: chunk.text,
        source: chunk.source,
        title: chunk.title,
        section: chunk.section ?? '',
        url: chunk.url ?? '',
        date: chunk.date ?? '',
        dateNum: chunk.date ? Number(chunk.date.replace(/-/g, '')) : 0,
      },
    }));

    await env.VECTORIZE.upsert(vectors);
    upserted += vectors.length;
    console.log(`Upserted ${upserted}/${chunks.length}`);
  }

  return Response.json({ success: true, upserted });
}
