# Getting Up2Date onto other people's phones

The model here is **bring your own key**. Reading the news needs nothing at all; the AI
features run on the reader's own provider account, stored in their phone's keychain and sent
only to that provider. No shared key, no server in the middle, and nothing anyone does inside
the app is billed to you.

That is a deliberate constraint, and it decides the packaging: there is no backend to host, so
shipping is just handing someone a file.

---

## The route: an APK on a GitHub Release

Same as [smaran](https://github.com/ethicks-x/smaran/releases) does it. Free, no store, no
review, no waiting.

```bash
# once
npx eas login
npx eas init                       # writes expo.extra.eas.projectId into app.json

# every release
# bump expo.version in app.json, then:
git tag v1.0.0 && git push origin v1.0.0
```

[`.github/workflows/release.yml`](.github/workflows/release.yml) then typechecks, verifies the
bundle, builds the APK on EAS, computes its SHA-256, and publishes both to a GitHub Release
with install instructions. The one secret it needs is `EXPO_TOKEN` (expo.dev → account →
access tokens), set under **Settings → Secrets and variables → Actions**.

People download `up2date.apk` from the release page, open it, and allow installs from their
browser. It installs as Up2Date with the icon. Nothing else is required of them.

Publishing the checksum matters — a sideloaded APK has no store signature vouching for it, so
`sha256sum -c sha256sum.txt` is how someone confirms they got the file you built.

### Building without the workflow

```bash
npm run build:apk                  # EAS builds it, prints a download link
```

Or entirely locally, if EAS's free-plan build cap gets in the way (needs Android Studio + JDK):

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
# android/app/build/outputs/apk/release/app-release.apk
```

Keep the signing keystore somewhere safe and reuse it. An APK signed with a different key
cannot upgrade an installed one — the user has to uninstall first, losing their saved stories.

## iPhone

There is no equivalent. Apple does not allow installing an app from outside the App Store, so
the only routes are **TestFlight** or the **App Store**, and both need the Apple Developer
Program at $99/year. With it:

```bash
npm run build:ios
npx eas submit --platform ios --latest
```

TestFlight then takes up to 10,000 testers by email or public link; builds expire after 90 days.

Without it, `npx eas update` + Expo Go is the only way an iPhone user runs this — they install
Expo Go from the App Store and open your link. It works, but it lives inside Expo Go rather
than appearing as its own app.

## Google Play, if you get there

$25 once. `npm run build:play` produces the `.aab`, then `npx eas submit --platform android
--latest`. New personal developer accounts have to run a closed test with a tester group
before production access opens up — check Play's current policy, it has changed more than once.

Play will ask for a privacy policy. The honest version is short: the app collects nothing and
has no backend; article text and questions go to whichever AI provider the *user* configured,
under their own account; location, when granted, is used on-device to choose a news edition and
is not stored or transmitted anywhere except as a place name in the news query.

---

## About `server/`

The proxy is still in the tree, and it is **not** part of this distribution model. It exists
for one case: your own devices, where you would rather not paste a key into each one. If you
point a *published* build at it, every reader's summaries are billed to your account — which is
exactly what we are avoiding. `expo.extra.defaultAiBaseUrl` is empty and should stay empty in
anything you publish.

## Checklist before you tag

- [ ] `expo.version` bumped in `app.json`
- [ ] `npx eas init` has written `expo.extra.eas.projectId`
- [ ] `expo.extra.defaultAiBaseUrl` is `""`
- [ ] `EXPO_TOKEN` set in repository secrets
- [ ] Installed the APK on a real phone and gone through first launch as a stranger would:
      welcome screen, paste a key, feed loads, a summary returns, "Use my location" resolves
