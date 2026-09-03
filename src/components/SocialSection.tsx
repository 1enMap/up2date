import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Button, Card, SectionTitle } from '@/components/ui';
import { socialPulse, type ArticleContext, type SocialPulse } from '@/lib/ai';
import { fetchSocialPosts, type SocialPost, type SocialResult } from '@/lib/social';
import { useStore } from '@/state/store';
import { useAiConfig } from '@/state/useAiConfig';
import { radius, space, timeAgo, useTheme } from '@/theme';

const PLATFORM: Record<SocialPost['platform'], { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  reddit: { label: 'Reddit', icon: 'logo-reddit' },
  bluesky: { label: 'Bluesky', icon: 'cloud-outline' },
  hackernews: { label: 'Hacker News', icon: 'terminal-outline' },
  mastodon: { label: 'Mastodon', icon: 'planet-outline' },
  lemmy: { label: 'Lemmy', icon: 'chatbubbles-outline' },
};

export function SocialSection({
  subject,
  postQuery,
  cacheId,
  title = 'The discussion',
}: {
  /** An article to read around, or a bare topic/hashtag to investigate. */
  subject: ArticleContext | { query: string };
  /** What to send to the platform search APIs. */
  postQuery: string;
  /** Cache key for the AI read-out; omit to skip caching. */
  cacheId?: string;
  title?: string;
}) {
  const t = useTheme();
  const { config, ready } = useAiConfig();
  const languageCode = useStore((s) => s.languageCode);
  const cached = useStore((s) => (cacheId ? s.pulses[cacheId] : undefined));
  const cachePulse = useStore((s) => s.cachePulse);

  const [result, setResult] = useState<SocialResult | null>(null);
  const [pulse, setPulse] = useState<SocialPulse | undefined>(cached);
  const [pulseState, setPulseState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [pulseError, setPulseError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    setResult(null);
    void fetchSocialPosts(postQuery, controller.signal).then((r) => {
      if (!controller.signal.aborted) setResult(r);
    });
    return () => controller.abort();
  }, [postQuery]);

  const subjectKey = 'query' in subject ? subject.query : subject.url;
  const runPulse = useCallback(async () => {
    if (!ready) return;
    setPulseState('loading');
    setPulseError(null);
    try {
      const next = await socialPulse(config, subject, languageCode);
      setPulse(next);
      if (cacheId) cachePulse(cacheId, next);
      setPulseState('idle');
    } catch (e) {
      setPulseError(e instanceof Error ? e.message : 'Could not read the social conversation.');
      setPulseState('error');
    }
    // `subject` is rebuilt each render; `subjectKey` is its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, ready, languageCode, cacheId, subjectKey]);

  useEffect(() => {
    setPulse(cached);
    setPulseState('idle');
  }, [subjectKey, cached]);

  const posts = useMemo(() => {
    const list = result?.posts ?? [];
    return expanded ? list.slice(0, 40) : list.slice(0, 6);
  }, [result, expanded]);

  return (
    <View>
      <SectionTitle
        right={
          pulse ? (
            <Pressable onPress={() => void runPulse()} hitSlop={10}>
              <Ionicons name="refresh" size={14} color={t.textFaint} />
            </Pressable>
          ) : undefined
        }
      >
        {title}
      </SectionTitle>

      {/* What people are saying, read off X / Instagram / Reddit / YouTube by the model. */}
      {pulseState === 'loading' ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
            <ActivityIndicator size="small" color={t.accent} />
            <Text style={{ color: t.textDim, fontSize: 14 }}>Reading the social conversation…</Text>
          </View>
        </Card>
      ) : pulse ? (
        <Card>
          <Text style={{ color: t.text, fontSize: 14, lineHeight: 22 }}>{pulse.summary}</Text>

          {pulse.themes.map((theme, i) => (
            <View key={i} style={{ marginTop: space(3.5) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), flexWrap: 'wrap' }}>
                <Text style={{ color: t.text, fontSize: 13, fontWeight: '700' }}>{theme.label}</Text>
                {theme.platforms?.map((p) => (
                  <Text
                    key={p}
                    style={{
                      color: t.textFaint,
                      fontSize: 10,
                      fontWeight: '700',
                      backgroundColor: t.surfaceAlt,
                      paddingHorizontal: space(1.5),
                      paddingVertical: 2,
                      borderRadius: radius.sm,
                      overflow: 'hidden',
                    }}
                  >
                    {p.toUpperCase()}
                  </Text>
                ))}
              </View>
              <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20, marginTop: space(1) }}>{theme.detail}</Text>
            </View>
          ))}

          {pulse.voices.length ? (
            <View style={{ marginTop: space(4), gap: space(2) }}>
              <Text style={{ color: t.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>VOICES</Text>
              {pulse.voices.map((v, i) => (
                <Pressable
                  key={i}
                  onPress={() => v.url && WebBrowser.openBrowserAsync(v.url)}
                  style={{ paddingVertical: space(1) }}
                >
                  <Text style={{ color: t.text, fontSize: 13, lineHeight: 19 }}>
                    <Text style={{ color: t.accent, fontWeight: '700' }}>
                      {v.handle} · {v.platform}
                    </Text>
                    {'  '}
                    {v.gist}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {pulse.unverified.length ? (
            <View style={{ marginTop: space(4), padding: space(3), backgroundColor: t.surfaceAlt, borderRadius: radius.sm }}>
              <Text style={{ color: t.warn, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: space(1.5) }}>
                CIRCULATING, NOT ESTABLISHED
              </Text>
              {pulse.unverified.map((u, i) => (
                <Text key={i} style={{ color: t.textDim, fontSize: 13, lineHeight: 20 }}>
                  · {u}
                </Text>
              ))}
            </View>
          ) : null}
        </Card>
      ) : ready ? (
        <Card>
          <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20 }}>
            Read what people are posting about this on X, Instagram, Reddit, Threads and YouTube — including the
            detail the news write-ups leave out.
          </Text>
          {pulseError ? <Text style={{ color: t.bad, fontSize: 13, marginTop: space(2) }}>{pulseError}</Text> : null}
          <Button label="Read the conversation" icon="chatbubbles-outline" onPress={() => void runPulse()} style={{ marginTop: space(3) }} />
        </Card>
      ) : null}

      {/* Posts pulled straight from the platforms that answer without a key. */}
      {result === null ? (
        <View style={{ paddingVertical: space(5), alignItems: 'center' }}>
          <ActivityIndicator size="small" color={t.accent} />
        </View>
      ) : (
        <View style={{ marginTop: space(3), gap: space(2) }}>
          {posts.map((post) => (
            <Pressable
              key={post.id}
              onPress={() => WebBrowser.openBrowserAsync(post.url)}
              style={({ pressed }) => ({
                backgroundColor: t.surface,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: radius.md,
                padding: space(3.5),
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), marginBottom: space(1.5) }}>
                <Ionicons name={PLATFORM[post.platform].icon} size={13} color={t.textDim} />
                <Text style={{ color: t.textDim, fontSize: 12, fontWeight: '600' }}>
                  {post.group ?? PLATFORM[post.platform].label}
                </Text>
                <Text style={{ color: t.textFaint, fontSize: 12 }} numberOfLines={1}>
                  · {post.author}
                </Text>
                <View style={{ flex: 1 }} />
                <Text style={{ color: t.textFaint, fontSize: 11 }}>{timeAgo(post.createdAt)}</Text>
              </View>
              <Text style={{ color: t.text, fontSize: 14, lineHeight: 20 }} numberOfLines={4}>
                {post.text}
              </Text>
              {post.score != null || post.comments != null ? (
                <Text style={{ color: t.textFaint, fontSize: 11, marginTop: space(2) }}>
                  {post.score != null ? `${post.score} points` : ''}
                  {post.score != null && post.comments != null ? ' · ' : ''}
                  {post.comments != null ? `${post.comments} comments` : ''}
                </Text>
              ) : null}
            </Pressable>
          ))}

          {!expanded && (result.posts.length ?? 0) > posts.length ? (
            <Pressable onPress={() => setExpanded(true)} style={{ paddingVertical: space(2), alignItems: 'center' }}>
              <Text style={{ color: t.accent, fontSize: 13, fontWeight: '600' }}>
                Show {Math.min(result.posts.length - posts.length, 34)} more posts
              </Text>
            </Pressable>
          ) : null}

          {!result.posts.length ? (
            <Text style={{ color: t.textFaint, fontSize: 12, lineHeight: 18 }}>
              No posts came back from the open platforms for this query.
            </Text>
          ) : null}

          {result.unavailable.length ? (
            <Text style={{ color: t.textFaint, fontSize: 11, lineHeight: 17, marginTop: space(1) }}>
              {result.unavailable.map((u) => `${u.platform} (${u.reason})`).join(', ')} could not be reached. X and
              Instagram have no open API — they are covered by the read-out above.
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
