import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

/**
 * Two kinds of update, because they are genuinely different things.
 *
 * 1. **Over the air.** JS, styles, copy, prompts, most bug fixes. EAS ships these
 *    to installed apps; nobody reinstalls anything. This is the common case.
 * 2. **A new APK.** Anything that changes native code — a new Expo module, a
 *    permission, the splash config, the app version. OTA cannot carry these, so
 *    the app checks GitHub Releases and points the reader at the download.
 *
 * `runtimeVersion` is the `appVersion` policy: an OTA only reaches builds whose
 * `expo.version` matches. So a JS-only fix must ship *without* bumping the
 * version, and a native change must bump it and produce a new APK.
 */

const REPO = '1enMap/up2date';

export const appVersion = String(Constants.expoConfig?.version ?? '0.0.0');

export function updatesAvailable() {
  // False in Expo Go and in dev builds — there is no update channel to poll.
  return Updates.isEnabled;
}

export type OtaState =
  | { kind: 'unsupported' }
  | { kind: 'current' }
  | { kind: 'available' }
  | { kind: 'downloaded' }
  | { kind: 'error'; message: string };

export async function checkForOta(): Promise<OtaState> {
  if (!Updates.isEnabled) return { kind: 'unsupported' };
  try {
    const result = await Updates.checkForUpdateAsync();
    return result.isAvailable ? { kind: 'available' } : { kind: 'current' };
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : 'Could not reach the update server.' };
  }
}

export async function downloadOta(): Promise<OtaState> {
  try {
    const result = await Updates.fetchUpdateAsync();
    return result.isNew ? { kind: 'downloaded' } : { kind: 'current' };
  } catch (e) {
    return { kind: 'error', message: e instanceof Error ? e.message : 'Download failed.' };
  }
}

/** Restarts into the downloaded update. */
export function applyOta() {
  return Updates.reloadAsync();
}

/** What the running bundle is, for the Settings readout and for bug reports. */
export function currentBuildInfo() {
  return {
    appVersion,
    runtimeVersion: Updates.runtimeVersion ?? '—',
    channel: Updates.channel ?? 'none',
    updateId: Updates.updateId ?? 'embedded',
    publishedAt: Updates.createdAt ?? null,
    isEmbedded: Updates.isEmbeddedLaunch,
  };
}

// ------------------------------------------------------------- new APK check

export type ReleaseCheck =
  | { kind: 'current' }
  | { kind: 'newer'; version: string; url: string; notes: string }
  | { kind: 'unavailable'; reason: string };

/** Compares dotted versions; missing parts count as zero. */
function isNewer(candidate: string, installed: string) {
  const a = candidate.split('.').map((n) => parseInt(n, 10) || 0);
  const b = installed.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

export async function checkForNewApk(signal?: AbortSignal): Promise<ReleaseCheck> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      signal,
      headers: { Accept: 'application/vnd.github+json' },
    });

    // A private repo answers 404 to anonymous callers — not an error worth alarming about.
    if (res.status === 404 || res.status === 403) {
      return { kind: 'unavailable', reason: 'The releases page is private, so the app cannot check it.' };
    }
    if (!res.ok) return { kind: 'unavailable', reason: `GitHub returned ${res.status}.` };

    const body = (await res.json()) as { tag_name?: string; html_url?: string; body?: string };
    const version = (body.tag_name ?? '').replace(/^v/, '');
    if (!version) return { kind: 'unavailable', reason: 'No published release found.' };

    return isNewer(version, appVersion)
      ? {
          kind: 'newer',
          version,
          url: body.html_url ?? `https://github.com/${REPO}/releases/latest`,
          notes: (body.body ?? '').slice(0, 400),
        }
      : { kind: 'current' };
  } catch (e) {
    return { kind: 'unavailable', reason: e instanceof Error ? e.message : 'Check failed.' };
  }
}
