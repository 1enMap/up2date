/** Google News editions: `gl` is the country, `hl` the default interface language. */
export type Country = { code: string; name: string; flag: string; hl: string };

export const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', hl: 'en-IN' },
  { code: 'US', name: 'United States', flag: '🇺🇸', hl: 'en-US' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', hl: 'en-GB' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', hl: 'en-CA' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', hl: 'en-AU' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', hl: 'en-SG' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', hl: 'en-AE' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', hl: 'en-ZA' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', hl: 'en-IE' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', hl: 'en-NZ' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', hl: 'en-NG' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', hl: 'en-PK' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', hl: 'en-BD' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', hl: 'en-LK' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', hl: 'en-NP' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', hl: 'ja' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', hl: 'de' },
  { code: 'FR', name: 'France', flag: '🇫🇷', hl: 'fr' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', hl: 'es' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', hl: 'it' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', hl: 'pt-BR' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', hl: 'es-419' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', hl: 'ru' },
  { code: 'CN', name: 'China', flag: '🇨🇳', hl: 'zh-CN' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', hl: 'ko' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', hl: 'id' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', hl: 'ar' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', hl: 'ar' },
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷', hl: 'tr' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', hl: 'nl' },
];

export function getCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}
