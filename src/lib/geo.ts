import * as Location from 'expo-location';

import type { Place } from '@/state/store';

export class LocationError extends Error {
  constructor(
    message: string,
    /** true when typing a place by hand is the only way forward. */
    readonly fatal = false,
  ) {
    super(message);
    this.name = 'LocationError';
  }
}

function placeFrom(city?: string | null, region?: string | null, country?: string | null): Place | null {
  const label = [city, region].filter(Boolean).join(', ');
  if (!label) return null;
  return {
    label,
    query: city || region || label,
    city: city ?? undefined,
    region: region ?? undefined,
    country: country ?? undefined,
  };
}

/**
 * Expo's reverse geocoder is a thin wrapper over the platform one, which returns
 * nothing on some Android builds and inside Expo Go on a simulator. OpenStreetMap
 * covers those cases.
 */
async function reverseGeocode(coords: { latitude: number; longitude: number }): Promise<Place> {
  try {
    const [address] = await Location.reverseGeocodeAsync(coords);
    const place = placeFrom(
      address?.city ?? address?.subregion ?? address?.district,
      address?.region,
      address?.country,
    );
    if (place) return place;
  } catch {
    /* fall through to the network lookup */
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&accept-language=en` +
      `&lat=${coords.latitude}&lon=${coords.longitude}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Up2Date/1.0 (personal news reader)' } });
    const body = (await res.json()) as { address?: Record<string, string> };
    const a = body.address ?? {};
    const place = placeFrom(
      a.city ?? a.town ?? a.village ?? a.county ?? a.state_district,
      a.state,
      a.country,
    );
    if (place) return place;
  } catch {
    /* fall through to the error below */
  }

  throw new LocationError('Found your coordinates but could not name the place. Type a city below.', true);
}

/**
 * Last resort when GPS will not lock — indoors, in an emulator, or with location
 * hardware disabled. City-level accuracy is plenty for a news feed.
 */
async function placeFromIp(): Promise<Place> {
  const res = await fetch('https://ipwho.is/?fields=city,region,country,success');
  const body = (await res.json()) as { success?: boolean; city?: string; region?: string; country?: string };
  const place = body.success === false ? null : placeFrom(body.city, body.region, body.country);
  if (!place) throw new LocationError('Could not work out your location. Type a city below.', true);
  return place;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new LocationError(message)), ms)),
  ]);
}

/** Resolves the current locality, with a specific message for every way this can fail. */
export type PlaceFix = { place: Place; approximate: boolean };

/**
 * Resolves the current locality. GPS is tried first and, when it will not lock,
 * the IP lookup takes over rather than dead-ending the user.
 */
export async function resolveCurrentPlace(): Promise<PlaceFix> {
  const enabled = await Location.hasServicesEnabledAsync().catch(() => true);
  if (!enabled) return { place: await placeFromIp(), approximate: true };

  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync().catch(() => ({
    status: 'denied' as Location.PermissionStatus,
    canAskAgain: true,
  }));

  if (status !== 'granted') {
    // Permission refused is a choice, not a failure — fall back to the coarse lookup.
    try {
      return { place: await placeFromIp(), approximate: true };
    } catch {
      throw new LocationError(
        canAskAgain
          ? 'Location permission was declined.'
          : 'Location permission is blocked — enable it for Expo Go in system settings.',
      );
    }
  }

  // A cached fix answers instantly; a cold lock can take a while, so it is only
  // awaited when there is nothing cached. Accuracy.Low is enough to name a city
  // and locks far more reliably indoors than a high-accuracy request.
  let position = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 }).catch(() => null);
  if (!position) {
    position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      12000,
      'timeout',
    ).catch(() => null);
  }
  if (!position) position = await Location.getLastKnownPositionAsync({}).catch(() => null);

  if (position) {
    try {
      return { place: await reverseGeocode(position.coords), approximate: false };
    } catch {
      /* naming the coordinates failed; the IP lookup below still can */
    }
  }

  return { place: await placeFromIp(), approximate: true };
}
