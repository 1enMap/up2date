import type { FactCheck } from './types';

/**
 * Validation for model-returned JSON.
 *
 * The old code trusted any object with a truthy `verdict`, so a model answering
 * "likely true" produced a chip with no label and no colour — a second, silent
 * failure on top of the first. An unrecognised value is now a stated problem.
 */

export const VERDICTS = ['supported', 'mixed', 'unsupported', 'unverifiable'] as const;
export const ASSESSMENTS = ['supported', 'disputed', 'unverified'] as const;
export const CONFIDENCES = ['low', 'medium', 'high'] as const;

export type Coerced<T> = { ok: true; value: T; notes: string[] } | { ok: false; problem: string };

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const norm = (v: unknown) => str(v).toLowerCase();

function isHttp(url: string) {
  return /^https?:\/\//i.test(url);
}

export function isKnownVerdict(value: string): value is FactCheck['verdict'] {
  return (VERDICTS as readonly string[]).includes(value);
}

export function coerceFactCheck(
  value: unknown,
  ctx: {
    grounding: FactCheck['grounding'];
    status: FactCheck['status'];
    fallbackSources: FactCheck['sources'];
  },
): Coerced<FactCheck> {
  if (!value || typeof value !== 'object') return { ok: false, problem: 'the reply was not a JSON object' };
  const raw = value as Record<string, unknown>;
  const notes: string[] = [];

  const verdict = norm(raw.verdict);
  if (!verdict) return { ok: false, problem: 'the reply had no verdict' };
  if (!isKnownVerdict(verdict)) {
    return { ok: false, problem: `the model returned an unknown verdict, "${str(raw.verdict)}"` };
  }

  let confidence = norm(raw.confidence) as FactCheck['confidence'];
  if (!(CONFIDENCES as readonly string[]).includes(confidence)) {
    notes.push('confidence was missing or unrecognised, so it is shown as low');
    confidence = 'low';
  }

  const claims = (Array.isArray(raw.claims) ? raw.claims : [])
    .map((entry) => {
      const c = (entry ?? {}) as Record<string, unknown>;
      const claim = str(c.claim);
      if (!claim) return null;
      let assessment = norm(c.assessment) as FactCheck['claims'][number]['assessment'];
      if (!(ASSESSMENTS as readonly string[]).includes(assessment)) {
        notes.push(`one claim had an unrecognised assessment, shown as unverified`);
        assessment = 'unverified';
      }
      return { claim, assessment, note: str(c.note) };
    })
    .filter((c): c is FactCheck['claims'][number] => c !== null);

  const parsedSources = (Array.isArray(raw.sources) ? raw.sources : [])
    .map((entry) => {
      const s = (entry ?? {}) as Record<string, unknown>;
      const url = str(s.url);
      return isHttp(url) ? { title: str(s.title) || url, url } : null;
    })
    .filter((s): s is FactCheck['sources'][number] => s !== null);

  // A coverage check consults nothing, so it must never display sources.
  const sources = ctx.grounding === 'coverage' ? [] : parsedSources.length ? parsedSources : ctx.fallbackSources;

  return {
    ok: true,
    notes,
    value: {
      verdict,
      confidence,
      grounding: ctx.grounding,
      status: ctx.status,
      summary: str(raw.summary),
      claims,
      sources,
    },
  };
}
