export type Topic = {
  key: string;
  label: string;
  /** Google News canonical topic; when absent the topic is fetched as a search query. */
  section?: 'WORLD' | 'NATION' | 'BUSINESS' | 'TECHNOLOGY' | 'ENTERTAINMENT' | 'SPORTS' | 'SCIENCE' | 'HEALTH';
  query?: string;
  icon: string;
};

export const TOPICS: Topic[] = [
  { key: 'top', label: 'Top', icon: 'flame-outline' },
  { key: 'nation', label: 'National', section: 'NATION', icon: 'flag-outline' },
  { key: 'world', label: 'World', section: 'WORLD', icon: 'earth-outline' },
  { key: 'business', label: 'Business', section: 'BUSINESS', icon: 'trending-up-outline' },
  { key: 'technology', label: 'Technology', section: 'TECHNOLOGY', icon: 'hardware-chip-outline' },
  { key: 'science', label: 'Science', section: 'SCIENCE', icon: 'telescope-outline' },
  { key: 'health', label: 'Health', section: 'HEALTH', icon: 'fitness-outline' },
  { key: 'sports', label: 'Sports', section: 'SPORTS', icon: 'football-outline' },
  { key: 'entertainment', label: 'Entertainment', section: 'ENTERTAINMENT', icon: 'film-outline' },
  { key: 'politics', label: 'Politics', query: 'politics', icon: 'megaphone-outline' },
  { key: 'startups', label: 'Startups', query: 'startups funding', icon: 'rocket-outline' },
  { key: 'ai', label: 'AI', query: 'artificial intelligence', icon: 'sparkles-outline' },
  { key: 'climate', label: 'Climate', query: 'climate change', icon: 'leaf-outline' },
  { key: 'markets', label: 'Markets', query: 'stock market', icon: 'bar-chart-outline' },
  { key: 'education', label: 'Education', query: 'education', icon: 'school-outline' },
];
