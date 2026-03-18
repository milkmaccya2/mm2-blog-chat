export interface Chunk {
  id: string;
  text: string;
  source: 'blog' | 'about' | 'note';
  title: string;
  section?: string;
  url?: string;
  date?: string;
}
