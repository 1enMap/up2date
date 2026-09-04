import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PROVIDERS } from '@/data/providers';

// SecureStore keys may only contain alphanumerics, ".", "-" and "_".
const storeKey = (providerId: string) => `up2date.key.${providerId.replace(/[^A-Za-z0-9._-]/g, '_')}`;

// SecureStore has no web implementation; the web build falls back to AsyncStorage.
const backend =
  Platform.OS === 'web'
    ? {
        get: (k: string) => AsyncStorage.getItem(k),
        set: (k: string, v: string) => AsyncStorage.setItem(k, v),
        del: (k: string) => AsyncStorage.removeItem(k),
      }
    : {
        get: (k: string) => SecureStore.getItemAsync(k),
        set: (k: string, v: string) => SecureStore.setItemAsync(k, v),
        del: (k: string) => SecureStore.deleteItemAsync(k),
      };

const cached: Record<string, string | null> = {};
const listeners = new Set<() => void>();

export async function loadApiKeys() {
  await Promise.all(
    PROVIDERS.map(async (p) => {
      cached[p.id] = await backend.get(storeKey(p.id)).catch(() => null);
    }),
  );
  listeners.forEach((l) => l());
}

export function getApiKey(providerId: string) {
  return cached[providerId] ?? null;
}

export async function saveApiKey(providerId: string, value: string) {
  const trimmed = value.trim();
  if (trimmed) await backend.set(storeKey(providerId), trimmed);
  else await backend.del(storeKey(providerId));
  cached[providerId] = trimmed || null;
  listeners.forEach((l) => l());
}

/** Re-renders when any provider's key changes. */
export function useApiKey(providerId: string) {
  const [key, setKey] = useState<string | null>(cached[providerId] ?? null);
  useEffect(() => {
    const sync = () => setKey(cached[providerId] ?? null);
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [providerId]);
  return key;
}
