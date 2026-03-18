export type { Chunk } from '../src/types';

/**
 * Markdownを ## 見出し単位でチャンク分割する
 */
export function chunkMarkdownBySections(
  markdown: string,
  meta: { source: Chunk['source']; title: string; date?: string; url?: string; idPrefix: string }
): Chunk[] {
  // frontmatter を除去
  const content = markdown.replace(/^---[\s\S]*?---\n/, '');
  const sections = content.split(/(?=^## )/m).filter((s) => s.trim());

  return sections.map((section, index) => {
    const lines = section.trim().split('\n');
    const heading = lines[0]?.replace(/^##\s*/, '').trim() ?? `section-${index}`;
    const body = lines.slice(1).join('\n').trim();

    return {
      id: `${meta.idPrefix}:section-${index}`,
      text: body || heading,
      source: meta.source,
      title: meta.title,
      section: heading,
      url: meta.url,
      date: meta.date,
    };
  });
}

/**
 * テキストを段落単位でチャンク分割する（note記事用）
 */
export function chunkByParagraphs(
  text: string,
  meta: { title: string; url: string; idPrefix: string }
): Chunk[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  return paragraphs.map((paragraph, index) => ({
    id: `${meta.idPrefix}:para-${index}`,
    text: paragraph,
    source: 'note' as const,
    title: meta.title,
    url: meta.url,
  }));
}

/**
 * about情報をチャンク化する（ハードコード）
 */
export function createAboutChunks(): Chunk[] {
  const sections = [
    {
      section: 'プロフィール',
      text: 'milkmaccya（みるまっちゃ）。LINE Yahooで働くフロントエンドエンジニア。双子と長女の3児の父。',
    },
    {
      section: '経歴 - LINE Yahoo',
      text: 'Frontend Engineer @ LINE Yahoo (2021-Present)。大規模Next.jsリファクタリング（v10→v14）、チームマネジメント経験あり。',
    },
    {
      section: '経歴 - Sky',
      text: 'Project Leader @ Sky Corp (2016-2021)。エンタープライズシステム開発。フロントエンドへの転身。',
    },
    {
      section: '経歴 - TRC',
      text: 'System Engineer @ TRC (2011-2016)。工場システム、衛星インフラ開発。',
    },
    {
      section: 'スキル',
      text: 'TypeScript/JavaScript, React, Next.js, Vue.js, Astro, Java, C#, C++, SQL。資格: PMP, 情報セキュリティスペシャリスト, AWS, Docker。',
    },
  ];

  return sections.map((s, index) => ({
    id: `about:section-${index}`,
    text: s.text,
    source: 'about' as const,
    title: 'About milkmaccya',
    section: s.section,
    url: 'https://blog.milkmaccya.com/about/',
  }));
}
