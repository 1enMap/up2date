import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button, Card, Divider } from '@/components/ui';
import {
  applyOta,
  checkForNewApk,
  checkForOta,
  currentBuildInfo,
  downloadOta,
  updatesAvailable,
  type OtaState,
  type ReleaseCheck,
} from '@/lib/updates';
import { radius, space, useTheme } from '@/theme';

export function UpdatesCard() {
  const t = useTheme();
  const info = currentBuildInfo();

  const [ota, setOta] = useState<OtaState>({ kind: 'current' });
  const [release, setRelease] = useState<ReleaseCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const check = async () => {
    setBusy(true);
    const [next, rel] = await Promise.all([checkForOta(), checkForNewApk()]);
    setOta(next);
    setRelease(rel);
    setCheckedAt(new Date());
    setBusy(false);
  };

  // One quiet check on open; everything after that is on the button.
  useEffect(() => {
    void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = async () => {
    setBusy(true);
    const next = await downloadOta();
    setOta(next);
    setBusy(false);
    if (next.kind === 'downloaded') {
      Alert.alert('Update ready', 'Restart Up2Date now to apply it?', [
        { text: 'Later', style: 'cancel' },
        { text: 'Restart', onPress: () => void applyOta() },
      ]);
    }
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space(3) }}>
        <Ionicons name="cloud-download-outline" size={18} color={t.textDim} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>Version {info.appVersion}</Text>
          <Text style={{ color: t.textFaint, fontSize: 11, marginTop: 2 }}>
            {info.isEmbedded ? 'as shipped in the APK' : `update ${info.updateId.slice(0, 8)}`}
            {info.channel !== 'none' ? ` · ${info.channel}` : ''}
          </Text>
        </View>
      </View>

      <Divider />

      {/* Over-the-air: JS and content, no reinstall. */}
      {ota.kind === 'available' ? (
        <Notice tone={t.accent} title="An update is ready to download" body="Downloads in a few seconds — no reinstall." />
      ) : ota.kind === 'downloaded' ? (
        <Notice tone={t.good} title="Update downloaded" body="Restart the app to start using it." />
      ) : ota.kind === 'error' ? (
        <Notice tone={t.warn} title="Could not check for updates" body={ota.message} />
      ) : ota.kind === 'unsupported' ? (
        <Text style={{ color: t.textFaint, fontSize: 12, lineHeight: 18 }}>
          Over-the-air updates only work in an installed build. Inside Expo Go there is nothing to update.
        </Text>
      ) : (
        <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20 }}>
          You are on the latest version.
          {checkedAt ? ` Checked ${checkedAt.toLocaleTimeString()}.` : ''}
        </Text>
      )}

      {/* A new APK, for anything OTA cannot carry. */}
      {release?.kind === 'newer' ? (
        <View style={{ marginTop: space(3) }}>
          <Notice
            tone={t.accent}
            title={`Version ${release.version} is available to download`}
            body="This one changes the app itself, so it installs as a new APK rather than updating in place."
          />
          <Button
            label="Open the download page"
            icon="open-outline"
            variant="ghost"
            onPress={() => WebBrowser.openBrowserAsync(release.url)}
            style={{ marginTop: space(2) }}
          />
        </View>
      ) : release?.kind === 'unavailable' ? (
        <Text style={{ color: t.textFaint, fontSize: 11, lineHeight: 17, marginTop: space(2) }}>
          New-version check unavailable — {release.reason}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(4) }}>
        <Button
          label="Check for updates"
          icon="refresh-outline"
          variant="ghost"
          busy={busy}
          onPress={check}
          style={{ flex: 1 }}
        />
        {ota.kind === 'available' ? <Button label="Download" busy={busy} onPress={download} style={{ flex: 1 }} /> : null}
        {ota.kind === 'downloaded' ? <Button label="Restart now" onPress={() => void applyOta()} style={{ flex: 1 }} /> : null}
      </View>

      {updatesAvailable() ? (
        <Text style={{ color: t.textFaint, fontSize: 11, lineHeight: 17, marginTop: space(3) }}>
          Updates are also fetched automatically when the app starts; this button is for checking right now.
        </Text>
      ) : null}
    </Card>
  );
}

function Notice({ tone, title, body }: { tone: string; title: string; body: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        padding: space(3),
        borderRadius: radius.sm,
        backgroundColor: t.surfaceAlt,
        borderLeftWidth: 3,
        borderLeftColor: tone,
      }}
    >
      <Text style={{ color: tone, fontSize: 13, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: t.textDim, fontSize: 12, lineHeight: 18, marginTop: space(1) }}>{body}</Text>
    </View>
  );
}
