import { EMBEDDING_MODEL } from './constants';

interface Chunk {
  id: string;
  text: string;
  source: string;
  title: string;
  section?: string;
  url?: string;
  date?: string;
}

interface Env {
  AI: Ai;
  VECTORIZE: VectorizeIndex;
}

const BATCH_SIZE = 10;

export async function handleIngest(request: Request, env: Env): Promise<Response> {
  const chunks: Chunk[] = await request.json();
  console.log(`Received ${chunks.length} chunks`);

  let upserted = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);

    const embeddings = await env.AI.run(EMBEDDING_MODEL, { text: texts });

    const vectors = batch.map((chunk, idx) => ({
      id: chunk.id,
      values: (embeddings as { data: number[][] }).data[idx],
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
