/**
 * The 22 languages in the Eighth Schedule of the Indian Constitution, plus English.
 *
 * `hl` is the Google News interface language. Only a subset of Indian languages have
 * a native Google News edition; for the rest we fall back to `fallbackHl` for the feed
 * and translate headlines/summaries with the AI layer (`aiTranslateOnly: true`).
 */
export type Language = {
  code: string;
  name: string;
  nativeName: string;
  hl: string;
  /** true when Google News has no edition in this language and we translate instead */
  aiTranslateOnly?: boolean;
  /** Non-Latin scripts cost noticeably more output tokens for the same content. */
  script?: 'latin' | 'non-latin';
};

export const ENGLISH: Language = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  hl: 'en-IN',
  script: 'latin',
};

export const INDIAN_LANGUAGES: Language[] = [
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', hl: 'en-IN', aiTranslateOnly: true, script: 'non-latin' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', hl: 'bn', script: 'non-latin' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', hl: 'en-IN', aiTranslateOnly: true, script: 'non-latin' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी', hl: 'en-IN', aiTranslateOnly: true, script: 'non-latin' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', hl: 'gu', script: 'non-latin' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', hl: 'hi', script: 'non-latin' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', hl: 'kn', script: 'non-latin' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر', hl: 'en-IN', aiTranslateOnly: true, script: 'non-latin' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी', hl: 'en-IN', aiTranslateOnly: true, script: 'non-latin' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', hl: 'en-IN', aiTranslateOnly: true, script: 'non-latin' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', hl: 'ml', script: 'non-latin' },
  { code: 'mni', name: 'Manipuri', nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ', hl: 'en-IN', aiTranslateOnly: true, script: 'non-latin' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', hl: 'mr', script: 'non-latin' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', hl: 'en-IN', aiTranslateOnly: true, script: 'non-latin' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', hl: 'en-IN', aiTranslateOnly: true, script: 'non-latin' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', hl: 'en-IN', aiTranslateOnly: true, script: 'non-latin' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', hl: 'en-IN', aiTranslateOnly: true, script: 'non-latin' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', hl: 'en-IN', aiTranslateOnly: true, script: 'non-latin' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', hl: 'en-IN', aiTranslateOnly: true, script: 'non-latin' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', hl: 'ta', script: 'non-latin' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', hl: 'te', script: 'non-latin' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', hl: 'ur', script: 'non-latin' },
];

export const ALL_LANGUAGES: Language[] = [ENGLISH, ...INDIAN_LANGUAGES];

export const RTL_LANGUAGES = new Set(['ur', 'ks', 'sd']);

export function getLanguage(code: string): Language {
  return ALL_LANGUAGES.find((l) => l.code === code) ?? ENGLISH;
}
