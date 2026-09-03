import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Article } from '@/lib/rss';
import type { FactCheck, Provider, SocialPulse, Summary } from '@/lib/ai';
import type { ThemeMode } from '@/theme';

export type Place = { label: string; query: string; city?: string; region?: string; country?: string };

type Settings = {
  languageCode: string;
  countryCode: string;
  /** Locality used for the "Local" tab; set from GPS or picked by hand. */
  place: Place | null;
  followedTopics: string[];
  autoSummarize: boolean;
  aiProvider: Provider;
  /** Model override; empty means the provider default. Mainly for picking a Gemini model. */
  aiModel: string;
  /** Base URL of a proxy that holds the API key; empty means talk to the provider directly. */
  aiBaseUrl: string;
  /** Pull in social posts and the AI social read-out alongside the reporting. */
  socialEnabled: boolean;
  themeMode: ThemeMode;
  onboarded: boolean;
};

type State = Settings & {
  saved: Article[];
  recentSearches: string[];
  summaries: Record<string, Summary>;
  factChecks: Record<string, FactCheck>;
  pulses: Record<string, SocialPulse>;
  /** Reader's own 1-5 star rating, by article id. */
  ratings: Record<string, number>;

  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  toggleTopic: (key: string) => void;
  toggleSaved: (article: Article) => void;
  isSaved: (id: string) => boolean;
  addSearch: (q: string) => void;
  clearSearches: () => void;
  cacheSummary: (id: string, summary: Summary) => void;
  cacheFactCheck: (id: string, check: FactCheck) => void;
  cachePulse: (id: string, pulse: SocialPulse) => void;
  rate: (id: string, stars: number) => void;
};

const DEFAULTS: Settings = {
  languageCode: 'en',
  countryCode: 'IN',
  place: null,
  followedTopics: ['top', 'nation', 'world', 'business', 'technology', 'sports'],
  autoSummarize: true,
  aiProvider: 'anthropic',
  aiModel: '',
  aiBaseUrl: '',
  socialEnabled: true,
  themeMode: 'system',
  onboarded: false,
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      saved: [],
      recentSearches: [],
      summaries: {},
      factChecks: {},
      pulses: {},
      ratings: {},

      set: (key, value) => set({ [key]: value } as Pick<Settings, typeof key>),

      toggleTopic: (key) =>
        set((s) => ({
          followedTopics: s.followedTopics.includes(key)
            ? s.followedTopics.filter((t) => t !== key)
            : [...s.followedTopics, key],
        })),

      toggleSaved: (article) =>
        set((s) => ({
          saved: s.saved.some((a) => a.id === article.id)
            ? s.saved.filter((a) => a.id !== article.id)
            : [article, ...s.saved].slice(0, 300),
        })),

      isSaved: (id) => get().saved.some((a) => a.id === id),

      addSearch: (q) =>
        set((s) => ({
          recentSearches: [q, ...s.recentSearches.filter((x) => x !== q)].slice(0, 12),
        })),

      clearSearches: () => set({ recentSearches: [] }),

      // Summaries and fact checks cost a request each — keep the last 200 around.
      cacheSummary: (id, summary) =>
        set((s) => ({ summaries: trim({ ...s.summaries, [id]: summary }) })),

      cacheFactCheck: (id, check) =>
        set((s) => ({ factChecks: trim({ ...s.factChecks, [id]: check }) })),

      cachePulse: (id, pulse) => set((s) => ({ pulses: trim({ ...s.pulses, [id]: pulse }) })),

      // Tapping the current rating again clears it.
      rate: (id, stars) =>
        set((s) => {
          const ratings = { ...s.ratings };
          if (ratings[id] === stars) delete ratings[id];
          else ratings[id] = stars;
          return { ratings };
        }),
    }),
    {
      name: 'up2date-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ set: _s, toggleTopic, toggleSaved, isSaved, addSearch, clearSearches, cacheSummary, cacheFactCheck, cachePulse, rate, ...rest }) => rest,
    },
  ),
);

/** True once the persisted state has been read back from AsyncStorage. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());
  useEffect(() => {
    const done = useStore.persist.onFinishHydration(() => setHydrated(true));
    if (useStore.persist.hasHydrated()) setHydrated(true);
    return done;
  }, []);
  return hydrated;
}

function trim<T>(record: Record<string, T>): Record<string, T> {
  const keys = Object.keys(record);
  if (keys.length <= 200) return record;
  const out = { ...record };
  for (const key of keys.slice(0, keys.length - 200)) delete out[key];
  return out;
}
