import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SocialSection } from '@/components/SocialSection';
import { Stars } from '@/components/Stars';
import { Button, Card, EmptyState, SectionTitle } from '@/components/ui';
import {
  AiNotConfiguredError,
  QuotaError,
  askFollowUp,
  cooldownRemaining,
  factCheckArticle,
  summarizeArticle,
  type ArticleContext,
  type ChatTurn,
  type FactCheck,
  type Summary,
} from '@/lib/ai';
import { fetchPageContent, type PageContent } from '@/lib/extract';
import { socialQueryFor } from '@/lib/social';
import { recallArticle } from '@/state/articles';
import { useStore } from '@/state/store';
import { useAiConfig } from '@/state/useAiConfig';
import { radius, space, timeAgo, useTheme } from '@/theme';

export default function ArticleScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const savedList = useStore((s) => s.saved);
  const article = useMemo(
    () => recallArticle(String(id)) ?? savedList.find((a) => a.id === id),
    [id, savedList],
  );

  const languageCode = useStore((s) => s.languageCode);
  const autoSummarize = useStore((s) => s.autoSummarize);
  const socialEnabled = useStore((s) => s.socialEnabled);
  const toggleSaved = useStore((s) => s.toggleSaved);
  const cacheSummary = useStore((s) => s.cacheSummary);
  const cacheFactCheck = useStore((s) => s.cacheFactCheck);
  const cachedSummary = useStore((s) => (article ? s.summaries[article.id] : undefined));
  const cachedFactCheck = useStore((s) => (article ? s.factChecks[article.id] : undefined));
  const isSaved = !!article && savedList.some((a) => a.id === article.id);
  const { config: aiConfig, ready: aiReady } = useAiConfig();

  const [page, setPage] = useState<PageContent | null>(null);
  const [summary, setSummary] = useState<Summary | undefined>(cachedSummary);
  const [summaryState, setSummaryState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [factCheck, setFactCheck] = useState<FactCheck | undefined>(cachedFactCheck);
  const [factState, setFactState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [factError, setFactError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const abort = useRef(new AbortController());

  const context: ArticleContext | null = article
    ? {
        title: article.title,
        source: article.source,
        url: page?.url ?? article.link,
        publishedAt: article.publishedAt,
        body: page?.text || undefined,
        related: article.related.map((r) => ({ title: r.title, source: r.source })),
      }
    : null;

  // Pull the publisher page once; the summary, fact check and Q&A all read from it.
  useEffect(() => {
    if (!article) return;
    const controller = abort.current;
    void fetchPageContent(article.link, controller.signal).then((content) => {
      if (!controller.signal.aborted) setPage(content);
    });
    return () => controller.abort();
  }, [article]);

  const runSummary = useCallback(async () => {
    if (!context || !aiReady) return;
    setSummaryState('loading');
    setSummaryError(null);
    try {
      const result = await summarizeArticle(aiConfig, context, languageCode);
      setSummary(result);
      if (article) cacheSummary(article.id, result);
      setSummaryState('idle');
    } catch (e) {
      setSummaryError(describe(e));
      setSummaryState('error');
    }
    // context is derived from article + page; both are in the dep list below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article, page, aiConfig, aiReady, languageCode]);

  // Wait for the page fetch to settle so the summary sees the article body, and
  // never spend a request while the provider is still rate-limiting this key.
  useEffect(() => {
    if (autoSummarize && aiReady && page !== null && !summary && summaryState === 'idle' && !cooldownRemaining()) {
      void runSummary();
    }
  }, [autoSummarize, aiReady, page, summary, summaryState, runSummary]);

  const runFactCheck = async () => {
    if (!context) return;
    setFactState('loading');
    setFactError(null);
    try {
      const result = await factCheckArticle(aiConfig, context, languageCode);
      setFactCheck(result);
      if (article) cacheFactCheck(article.id, result);
      setFactState('idle');
    } catch (e) {
      setFactError(describe(e));
      setFactState('error');
    }
  };

  const ask = async (raw?: string) => {
    const text = (raw ?? question).trim();
    if (!text || !context || asking) return;
    const history: ChatTurn[] = [...chat, { role: 'user', content: text }];
    setChat(history);
    setQuestion('');
    setAsking(true);
    try {
      const answer = await askFollowUp(aiConfig, context, history, languageCode);
      setChat([...history, { role: 'assistant', content: answer }]);
    } catch (e) {
      setChat([...history, { role: 'assistant', content: describe(e) }]);
    } finally {
      setAsking(false);
    }
  };

  if (!article) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Story not available"
        body="This story is no longer in memory. Open it again from a feed."
        action={{ label: 'Back', onPress: () => router.back() }}
      />
    );
  }

  const openOriginal = () =>
    WebBrowser.openBrowserAsync(page?.url ?? article.link, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: t.accent,
    });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(10), gap: space(4) }}>
        {page?.imageUrl ? (
          <Image
            source={{ uri: page.imageUrl }}
            style={{ width: '100%', height: 190, borderRadius: radius.lg, backgroundColor: t.surfaceAlt }}
            contentFit="cover"
            transition={200}
          />
        ) : null}

        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2), marginBottom: space(2) }}>
            {article.imageUrl ? (
              <Image source={{ uri: article.imageUrl }} style={{ width: 16, height: 16, borderRadius: 3 }} contentFit="contain" />
            ) : null}
            <Text style={{ color: t.textDim, fontSize: 13, fontWeight: '600' }}>{article.source}</Text>
            <Text style={{ color: t.textFaint, fontSize: 13 }}>· {timeAgo(article.publishedAt)}</Text>
          </View>
          <Text style={{ color: t.text, fontSize: 24, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5 }}>
            {article.title}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: space(2) }}>
          <Button label="Read full article" icon="open-outline" onPress={openOriginal} style={{ flex: 1 }} />
          <IconButton icon={isSaved ? 'bookmark' : 'bookmark-outline'} active={isSaved} onPress={() => toggleSaved(article)} />
          <IconButton
            icon="share-outline"
            onPress={() => Share.share({ message: `${article.title}\n${page?.url ?? article.link}` })}
          />
        </View>

        <Card style={{ paddingVertical: space(3) }}>
          <Stars articleId={article.id} size={20} showLabel />
        </Card>

        {!aiReady ? (
          <Card>
            <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>AI features are off</Text>
            <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20, marginTop: space(2) }}>
              Add an Anthropic API key in Settings to get summaries, fact checks and follow-up answers.
            </Text>
            <Button label="Open settings" variant="ghost" onPress={() => router.push('/(tabs)/settings')} style={{ marginTop: space(3) }} />
          </Card>
        ) : (
          <SummarySection
            summary={summary}
            state={summaryState}
            error={summaryError}
            hasBody={!!page?.text}
            pageLoaded={page !== null}
            onRun={runSummary}
          />
        )}

        {article.related.length ? (
          <View>
            <SectionTitle>Also covered by</SectionTitle>
            <Card style={{ padding: 0 }}>
              {article.related.map((r, i) => (
                <Pressable
                  key={`${r.link}-${i}`}
                  onPress={() => WebBrowser.openBrowserAsync(r.link)}
                  style={({ pressed }) => ({
                    padding: space(3.5),
                    borderBottomWidth: i === article.related.length - 1 ? 0 : 1,
                    borderBottomColor: t.border,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ color: t.text, fontSize: 14, lineHeight: 20 }} numberOfLines={2}>
                    {r.title}
                  </Text>
                  <Text style={{ color: t.textFaint, fontSize: 12, marginTop: space(1) }}>{r.source}</Text>
                </Pressable>
              ))}
            </Card>
          </View>
        ) : null}

        {aiReady ? (
          <FactCheckSection check={factCheck} state={factState} error={factError} onRun={runFactCheck} />
        ) : null}

        {socialEnabled && context ? (
          <SocialSection subject={context} postQuery={socialQueryFor(article.title)} cacheId={article.id} />
        ) : null}

        {aiReady ? (
          <View>
            <SectionTitle>Ask about this story</SectionTitle>
            {!chat.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginBottom: space(3) }}>
                {['Why does this matter?', 'What led to this?', 'Who is affected?', "What's disputed here?"].map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => void ask(q)}
                    style={({ pressed }) => ({
                      paddingHorizontal: space(3),
                      paddingVertical: space(2),
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: t.border,
                      backgroundColor: t.surface,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text style={{ color: t.textDim, fontSize: 13 }}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={{ gap: space(2.5) }}>
              {chat.map((turn, i) => (
                <View
                  key={i}
                  style={{
                    alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '92%',
                    backgroundColor: turn.role === 'user' ? t.accent : t.surface,
                    borderWidth: turn.role === 'user' ? 0 : 1,
                    borderColor: t.border,
                    borderRadius: radius.lg,
                    paddingHorizontal: space(3.5),
                    paddingVertical: space(3),
                  }}
                >
                  <Text
                    style={{
                      color: turn.role === 'user' ? '#fff' : t.text,
                      fontSize: 14,
                      lineHeight: 21,
                    }}
                  >
                    {turn.content}
                  </Text>
                </View>
              ))}
              {asking ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
                  <ActivityIndicator size="small" color={t.accent} />
                  <Text style={{ color: t.textFaint, fontSize: 13 }}>Thinking…</Text>
                </View>
              ) : null}
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space(2),
                marginTop: space(3),
                backgroundColor: t.surface,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: radius.md,
                paddingHorizontal: space(3),
              }}
            >
              <TextInput
                value={question}
                onChangeText={setQuestion}
                onSubmitEditing={() => void ask()}
                placeholder="Ask a follow-up…"
                placeholderTextColor={t.textFaint}
                style={{ flex: 1, color: t.text, fontSize: 14, paddingVertical: space(3) }}
                returnKeyType="send"
              />
              <Pressable onPress={() => void ask()} disabled={asking || !question.trim()} hitSlop={10}>
                <Ionicons name="arrow-up-circle" size={26} color={question.trim() ? t.accent : t.textFaint} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SummarySection({
  summary,
  state,
  error,
  hasBody,
  pageLoaded,
  onRun,
}: {
  summary?: Summary;
  state: 'idle' | 'loading' | 'error';
  error: string | null;
  hasBody: boolean;
  pageLoaded: boolean;
  onRun: () => void;
}) {
  const t = useTheme();

  if (state === 'loading' || (!summary && !pageLoaded)) {
    return (
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
          <ActivityIndicator size="small" color={t.accent} />
          <Text style={{ color: t.textDim, fontSize: 14 }}>
            {pageLoaded ? 'Summarising…' : 'Fetching the article…'}
          </Text>
        </View>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>Summary</Text>
        {error ? <Text style={{ color: t.bad, fontSize: 13, marginTop: space(2) }}>{error}</Text> : null}
        <Button label="Summarise this story" icon="sparkles-outline" onPress={onRun} style={{ marginTop: space(3) }} />
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space(3) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(2) }}>
          <Ionicons name="sparkles" size={14} color={t.accent} />
          <Text style={{ color: t.accent, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>SUMMARY</Text>
        </View>
        <Pressable onPress={onRun} hitSlop={10}>
          <Ionicons name="refresh" size={15} color={t.textFaint} />
        </Pressable>
      </View>

      <Text style={{ color: t.text, fontSize: 15, lineHeight: 23 }}>{summary.tldr}</Text>

      {summary.bullets.length ? (
        <View style={{ marginTop: space(4), gap: space(2.5) }}>
          {summary.bullets.map((b, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: space(2.5) }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.accent, marginTop: 7 }} />
              <Text style={{ color: t.textDim, fontSize: 14, lineHeight: 21, flex: 1 }}>{b}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {summary.context ? (
        <View style={{ marginTop: space(4), padding: space(3), backgroundColor: t.surfaceAlt, borderRadius: radius.sm }}>
          <Text style={{ color: t.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: space(1.5) }}>
            CONTEXT
          </Text>
          <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20 }}>{summary.context}</Text>
        </View>
      ) : null}

      {summary.unknowns.length ? (
        <View style={{ marginTop: space(3) }}>
          <Text style={{ color: t.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: space(1.5) }}>
            NOT YET ESTABLISHED
          </Text>
          {summary.unknowns.map((u, i) => (
            <Text key={i} style={{ color: t.textDim, fontSize: 13, lineHeight: 20 }}>
              · {u}
            </Text>
          ))}
        </View>
      ) : null}

      {!hasBody ? (
        <Text style={{ color: t.warn, fontSize: 11, marginTop: space(3), lineHeight: 17 }}>
          The publisher blocked the article text — this summary works from the headline and the coverage list only.
        </Text>
      ) : null}
    </Card>
  );
}

function FactCheckSection({
  check,
  state,
  error,
  onRun,
}: {
  check?: FactCheck;
  state: 'idle' | 'loading' | 'error';
  error: string | null;
  onRun: () => void;
}) {
  const t = useTheme();
  const colors: Record<FactCheck['verdict'], string> = {
    supported: t.good,
    mixed: t.warn,
    unsupported: t.bad,
    unverifiable: t.textFaint,
  };
  const labels: Record<FactCheck['verdict'], string> = {
    supported: 'Corroborated',
    mixed: 'Partly corroborated',
    unsupported: 'Not corroborated',
    unverifiable: 'Could not verify',
  };

  return (
    <View>
      <SectionTitle>Fact check</SectionTitle>
      <Card>
        {state === 'loading' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
            <ActivityIndicator size="small" color={t.accent} />
            <Text style={{ color: t.textDim, fontSize: 14 }}>Searching independent sources…</Text>
          </View>
        ) : !check ? (
          <>
            <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20 }}>
              Pull out the load-bearing claims and check them against other reporting on the open web.
            </Text>
            {error ? <Text style={{ color: t.bad, fontSize: 13, marginTop: space(2) }}>{error}</Text> : null}
            <Button label="Check this story" icon="shield-checkmark-outline" onPress={onRun} style={{ marginTop: space(3) }} />
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space(2),
                  backgroundColor: t.surfaceAlt,
                  paddingHorizontal: space(3),
                  paddingVertical: space(1.5),
                  borderRadius: radius.pill,
                }}
              >
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors[check.verdict] }} />
                <Text style={{ color: colors[check.verdict], fontSize: 13, fontWeight: '700' }}>
                  {labels[check.verdict]}
                </Text>
              </View>
              <Text style={{ color: t.textFaint, fontSize: 12 }}>{check.confidence} confidence</Text>
            </View>

            <Text style={{ color: t.text, fontSize: 14, lineHeight: 22, marginTop: space(3) }}>{check.summary}</Text>

            {check.claims.map((c, i) => (
              <View key={i} style={{ marginTop: space(3.5), paddingLeft: space(3), borderLeftWidth: 2, borderLeftColor: t.border }}>
                <Text style={{ color: t.text, fontSize: 13, fontWeight: '600', lineHeight: 19 }}>{c.claim}</Text>
                <Text style={{ color: t.textDim, fontSize: 12, lineHeight: 18, marginTop: space(1) }}>
                  <Text style={{ color: c.assessment === 'supported' ? t.good : c.assessment === 'disputed' ? t.bad : t.warn, fontWeight: '700' }}>
                    {c.assessment}
                  </Text>
                  {' — '}
                  {c.note}
                </Text>
              </View>
            ))}

            {check.sources.length ? (
              <View style={{ marginTop: space(4) }}>
                <Text style={{ color: t.textFaint, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: space(2) }}>
                  SOURCES CHECKED
                </Text>
                {check.sources.map((s, i) => (
                  <Pressable key={i} onPress={() => WebBrowser.openBrowserAsync(s.url)} style={{ paddingVertical: space(1.5) }}>
                    <Text style={{ color: t.accent, fontSize: 13, lineHeight: 19 }} numberOfLines={2}>
                      {s.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={{ color: t.textFaint, fontSize: 11, marginTop: space(4), lineHeight: 17 }}>
              An automated check, not a verdict. Read the sources before relying on it.
            </Text>
          </>
        )}
      </Card>
    </View>
  );
}

function IconButton({
  icon,
  onPress,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surface,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={19} color={active ? t.accent : t.textDim} />
    </Pressable>
  );
}

function describe(error: unknown) {
  if (error instanceof QuotaError) {
    return `${error.message}${error.daily ? ' Switch model or provider in Settings to keep going.' : ''}`;
  }
  if (error instanceof AiNotConfiguredError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}
