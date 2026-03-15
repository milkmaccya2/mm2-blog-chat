import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  type Chunk,
  chunkByParagraphs,
  chunkMarkdownBySections,
  createAboutChunks,
} from './chunker';
import { fetchNoteArticles } from './note-fetcher';

const BLOG_BASE = process.env.BLOG_DIR ?? join(process.cwd(), '../mm2-blog/src/content/blog');
const BLOG_ORIGIN = 'https://blog.milkmaccya.com';

function collectMarkdownFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function loadBlogChunks(): Promise<Chunk[]> {
  const files = collectMarkdownFiles(BLOG_BASE);
  const chunks: Chunk[] = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf-8');
    const dateMatch = filePath.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) {
      console.warn(`Skipping file without date in filename: ${filePath}`);
      continue;
    }
    const date = dateMatch[1];

    const titleMatch = content.match(/title:\s*['"](.+?)['"]/);
    const title = titleMatch?.[1] ?? filePath.replace('.md', '');

    const slug = relative(BLOG_BASE, filePath).replace(/\.md$/, '');
    const url = `${BLOG_ORIGIN}/blog/${slug}`;

    const blogChunks = chunkMarkdownBySections(content, {
      source: 'blog',
      title,
      date,
      url,
      idPrefix: `blog:${slug}`,
    });
    chunks.push(...blogChunks);
  }

  return chunks;
}

async function loadNoteChunks(): Promise<Chunk[]> {
  console.error('Fetching note articles...');
  const articles = await fetchNoteArticles();
  console.error(`Fetched ${articles.length} note articles`);

  const chunks: Chunk[] = [];
  for (const article of articles) {
    const articleChunks = chunkByParagraphs(article.body, {
      title: article.title,
      url: article.url,
      idPrefix: `note:${article.url.split('/').pop() ?? ''}`,
    });
    chunks.push(...articleChunks);
  }

  return chunks;
}

async function main() {
  console.error('=== Ingest Start ===');

  const blogChunks = await loadBlogChunks();
  console.error(`Blog chunks: ${blogChunks.length}`);

  const aboutChunks = createAboutChunks();
  console.error(`About chunks: ${aboutChunks.length}`);

  const noteChunks = await loadNoteChunks();
  console.error(`Note chunks: ${noteChunks.length}`);

  const allChunks = [...blogChunks, ...aboutChunks, ...noteChunks];
  console.error(`Total chunks: ${allChunks.length}`);

  process.stdout.write(JSON.stringify(allChunks));
}

main().catch(console.error);
