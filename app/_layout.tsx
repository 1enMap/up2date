import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { loadApiKeys } from '@/state/apiKey';
import { useHydrated, useStore } from '@/state/store';
import { useTheme } from '@/theme';

export default function RootLayout() {
  const t = useTheme();
  const router = useRouter();
  const hydrated = useHydrated();
  const onboarded = useStore((s) => s.onboarded);

  useEffect(() => {
    void loadApiKeys();
  }, []);

  // Wait for the persisted settings before deciding — otherwise a returning
  // reader sees the welcome screen flash on every cold start.
  useEffect(() => {
    if (hydrated && !onboarded) router.replace('/welcome');
  }, [hydrated, onboarded, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.bg }}>
      <SafeAreaProvider>
        <StatusBar style={t.dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.bg },
            headerTitleStyle: { color: t.text, fontWeight: '700' },
            headerTintColor: t.accent,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: t.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="article/[id]" options={{ title: '', headerBackTitle: 'Back' }} />
          <Stack.Screen name="picker/language" options={{ title: 'Language', presentation: 'modal' }} />
          <Stack.Screen name="picker/country" options={{ title: 'Region', presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
