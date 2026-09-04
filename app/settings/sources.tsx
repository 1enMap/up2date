import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, Text, View } from 'react-native';

import { Card, Divider, SectionTitle } from '@/components/ui';
import { OWNERS, SOURCES } from '@/data/sources';
import { space, useTheme } from '@/theme';

const RULES = [
  'Every mark states a fact you can check — who owns an outlet, how it is funded, whether a body has certified its fact-checking unit. None of them is a rating.',
  'Every mark links to the primary source for that exact claim, with the date the link was last confirmed. A mark with no source does not ship.',
  '"State funded" is a disclosure, not a demerit, and is shown in a neutral colour.',
  'No mark means the publisher is not in this list. It does not mean the publisher is untrustworthy — most outlets in a news feed are not listed here.',
  'An IFCN mark certifies a named fact-checking unit, not its parent newsroom.',
  'Your own trust and mute marks are private to this phone and are drawn as outlines, so they never look like a sourced fact.',
];

export default function SourcesAboutScreen() {
  const t = useTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(12), gap: space(5) }}>
      <Card>
        <Text style={{ color: t.text, fontSize: 16, fontWeight: '700' }}>How to read these marks</Text>
        <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20, marginTop: space(2) }}>
          The app does not score publishers, and it never will. Two separate things are shown: how many
          independent newsrooms are carrying a story, which is arithmetic; and facts about a publisher, each with
          a citation.
        </Text>
      </Card>

      <View>
        <SectionTitle>The rules</SectionTitle>
        <Card>
          {RULES.map((rule, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: space(2.5), marginTop: i ? space(3) : 0 }}>
              <Text style={{ color: t.accent, fontSize: 13, fontWeight: '700' }}>{i + 1}</Text>
              <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20, flex: 1 }}>{rule}</Text>
            </View>
          ))}
        </Card>
      </View>

      <View>
        <SectionTitle>Why there is no trust score</SectionTitle>
        <Card>
          <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20 }}>
            The established rating systems — NewsGuard, Media Bias/Fact Check, Ad Fontes, AllSides — are
            commercially licensed and cannot be bundled into an app like this one, in whole or in derived form.
            That constraint is welcome: a single trust number is an opinion wearing a badge, and it would invite
            exactly the question it appears to answer. Counting independent newsrooms and citing ownership are
            things you can check for yourself.
          </Text>
        </Card>
      </View>

      <View>
        <SectionTitle>{`Publishers listed (${SOURCES.length})`}</SectionTitle>
        <Card style={{ padding: 0 }}>
          {SOURCES.map((entry, i) => (
            <View
              key={entry.host}
              style={{
                padding: space(3.5),
                borderBottomWidth: i === SOURCES.length - 1 ? 0 : 1,
                borderBottomColor: t.border,
              }}
            >
              <Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }}>{entry.name}</Text>
              <Text style={{ color: t.textFaint, fontSize: 11, marginTop: 2 }}>{entry.host}</Text>
              {entry.signals.map((signal, j) => (
                <Text key={j} style={{ color: t.textDim, fontSize: 12, lineHeight: 18, marginTop: space(1.5) }}>
                  · {signal.label}
                </Text>
              ))}
            </View>
          ))}
        </Card>
      </View>

      <View>
        <SectionTitle>{`Owners tracked (${OWNERS.length})`}</SectionTitle>
        <Card>
          <Text style={{ color: t.textDim, fontSize: 13, lineHeight: 20 }}>
            Knowing which titles share an owner is what stops three papers from one group being counted as three
            independent newsrooms.
          </Text>
          <Divider />
          {OWNERS.map((owner) => (
            <Text key={owner.id} style={{ color: t.textDim, fontSize: 12, lineHeight: 19 }}>
              · {owner.name}
            </Text>
          ))}
        </Card>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', gap: space(3) }}>
          <Ionicons name="git-pull-request-outline" size={18} color={t.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }}>Something wrong here?</Text>
            <Text style={{ color: t.textDim, fontSize: 12, lineHeight: 18, marginTop: space(1) }}>
              The list lives in the repository as a plain, diffable file. Corrections are welcome — especially
              ownership changes, which happen often and quietly.
            </Text>
            <Text
              style={{ color: t.accent, fontSize: 12, marginTop: space(2) }}
              onPress={() => WebBrowser.openBrowserAsync('https://github.com/1enMap/up2date/issues')}
            >
              github.com/1enMap/up2date/issues
            </Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}
