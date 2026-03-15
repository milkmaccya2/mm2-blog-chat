export interface NoteArticle {
  title: string;
  body: string;
  url: string;
  publishedAt: string;
}

const NOTE_API_BASE = 'https://note.com/api/v2/creators/milkmaccya2/contents';

export async function fetchNoteArticles(maxPages = 3): Promise<NoteArticle[]> {
  const articles: NoteArticle[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = `${NOTE_API_BASE}?kind=note&page=${page}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AstroBot/1.0)' },
    });

    if (!res.ok) {
      console.error(`note API error: ${res.status} at page ${page}`);
      break;
    }

    const data = await res.json();
    const notes = data.data?.contents ?? [];

    if (notes.length === 0) break;

    for (const note of notes) {
      articles.push({
        title: note.name ?? '',
        body: note.body ?? '',
        url: `https://note.com/milkmaccya2/n/${note.key}`,
        publishedAt: note.publishAt ?? '',
      });
    }
  }

  return articles;
}
