import type { FactCheck } from '@/lib/ai';
import type { Theme } from '@/theme';

/**
 * How a verdict reads depends on what the model could actually reach.
 *
 * A check that searched the web may say "corroborated". A check that only
 * compared the article against sibling headlines may not — the strongest thing
 * it can honestly claim is that other coverage is consistent. Keeping the two
 * vocabularies apart is the whole point.
 */
export type VerdictDisplay = {
  label: string;
  color: string;
  /** Shown under the verdict; empty when there is nothing to qualify. */
  caveat: string;
};

const WEB_LABELS: Record<FactCheck['verdict'], string> = {
  supported: 'Corroborated by other sources',
  mixed: 'Partly corroborated',
  unsupported: 'Not corroborated',
  unverifiable: 'Could not verify',
};

const COVERAGE_LABELS: Record<FactCheck['verdict'], string> = {
  supported: 'Consistent with other coverage',
  mixed: 'Partly consistent with other coverage',
  unsupported: 'Contradicts other coverage',
  unverifiable: 'Not enough coverage to compare',
};

const NO_SOURCES =
  'No sources were consulted. This compares the article only against the other headlines Google News grouped with it.';

const TRUNCATED = 'The model ran out of output room, so this check is incomplete.';

export function verdictDisplay(check: FactCheck, t: Theme): VerdictDisplay {
  const colors: Record<FactCheck['verdict'], string> = {
    supported: t.good,
    mixed: t.warn,
    unsupported: t.bad,
    unverifiable: t.textFaint,
  };

  const label = (check.grounding === 'coverage' ? COVERAGE_LABELS : WEB_LABELS)[check.verdict];

  // An unrecognised verdict should be visible, not a blank chip.
  if (!label) {
    return {
      label: 'Unrecognised result',
      color: t.warn,
      caveat: 'The model returned a verdict this app does not know how to read.',
    };
  }

  const caveats = [
    check.grounding === 'coverage' ? NO_SOURCES : '',
    check.status === 'partial' ? TRUNCATED : '',
  ].filter(Boolean);

  return { label, color: colors[check.verdict], caveat: caveats.join(' ') };
}
