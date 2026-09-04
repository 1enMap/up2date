/**
 * Extracting JSON from a model reply.
 *
 * The naive version — slice from the first brace to the end of the string — fails
 * on the three things models actually do: add a closing sentence after the JSON,
 * quote an unrelated fenced block earlier in the reply, and run out of output
 * budget mid-object. Each of those produced a silent "could not verify" verdict.
 *
 * So: try every fenced block in order, then the raw text; walk the candidate
 * string- and escape-aware so a brace inside a value cannot break the depth
 * count; and repair a truncated object rather than discarding it.
 */

export type ParseFailure = 'no-json' | 'malformed' | 'truncated';

/** What the caller expects, so a stray `[1]` in prose cannot win over the real object. */
export type Expect = 'object' | 'array' | 'any';

export type ParseResult<T> =
  | { ok: true; value: T; repaired: boolean }
  | { ok: false; reason: ParseFailure; raw: string };

/** Every ```-fenced block in order, then the whole string. */
export function jsonCandidates(raw: string): string[] {
  const fences = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
  // An unterminated fence — the usual shape of a truncated reply — keeps its tail.
  const dangling = raw.match(/```(?:json)?\s*([\s\S]*)$/);
  if (dangling && !raw.trimEnd().endsWith('```')) fences.push(dangling[1]);
  return [...fences, raw];
}

/**
 * Walks from the first bracket at or after `start`, returning the balanced slice.
 * `closed` is false when the input ran out before the structure finished.
 */
export function scanBalanced(text: string, start: number): { slice: string; closed: boolean; stack: string[] } | null {
  const open = text.slice(start).search(/[[{]/);
  if (open < 0) return null;
  const from = start + open;

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = from; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
    else if (ch === '}' || ch === ']') {
      if (stack[stack.length - 1] !== ch) return { slice: text.slice(from, i + 1), closed: false, stack };
      stack.pop();
      if (!stack.length) return { slice: text.slice(from, i + 1), closed: true, stack: [] };
    }
  }

  return { slice: text.slice(from), closed: false, stack: inString ? [...stack, '"'] : stack };
}

/** Closes an unterminated string and any open brackets on a cut-off reply. */
export function repairTruncated(partial: string, stack: string[]): string {
  let out = partial;
  const closers = [...stack];

  if (closers[closers.length - 1] === '"') {
    closers.pop();
    out += '"';
  }

  // A dangling key, comma or colon cannot be closed into valid JSON — drop it.
  out = out.replace(/,\s*$/, '').replace(/[,{[]\s*"[^"]*"\s*:\s*$/, (m) => (m[0] === ',' ? '' : m[0]));
  out = out.replace(/:\s*$/, ': null').replace(/,\s*$/, '');

  return out + closers.reverse().join('');
}

/** Drops trailing commas and line comments that sit outside string literals. */
export function relaxJson(text: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }

    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }

    // A comma followed only by whitespace and a closing bracket is trailing.
    if (ch === ',') {
      const rest = text.slice(i + 1);
      if (/^\s*[}\]]/.test(rest)) continue;
    }

    out += ch;
  }

  return out;
}

function shapeMatches(value: unknown, expect: Expect) {
  if (expect === 'array') return Array.isArray(value);
  if (expect === 'object') return !!value && typeof value === 'object' && !Array.isArray(value);
  return true;
}

function attempt<T>(candidate: string): { value: T } | null {
  try {
    return { value: JSON.parse(candidate) as T };
  } catch {
    try {
      return { value: JSON.parse(relaxJson(candidate)) as T };
    } catch {
      return null;
    }
  }
}

export function parseJson<T>(raw: string, expect: Expect = 'object'): ParseResult<T> {
  let sawJson = false;
  let sawTruncation = false;

  for (const candidate of jsonCandidates(raw)) {
    // Prose can contain bracketed asides ("the claim [1]"), so keep scanning past
    // a structure that parsed but is not the shape the caller asked for.
    let cursor = 0;
    while (cursor < candidate.length) {
      const scanned = scanBalanced(candidate, cursor);
      if (!scanned) break;
      sawJson = true;

      const source = scanned.closed ? scanned.slice : repairTruncated(scanned.slice, scanned.stack);
      if (!scanned.closed) sawTruncation = true;

      const parsed = attempt<T>(source);
      if (parsed && shapeMatches(parsed.value, expect)) {
        return { ok: true, value: parsed.value, repaired: !scanned.closed };
      }

      const consumed = candidate.indexOf(scanned.slice, cursor);
      cursor = consumed < 0 ? cursor + 1 : consumed + Math.max(1, scanned.slice.length);
    }
  }

  return {
    ok: false,
    reason: !sawJson ? 'no-json' : sawTruncation ? 'truncated' : 'malformed',
    raw,
  };
}

/** Back-compat shim for callers that only need a best effort. */
export function parseJsonLoose<T>(raw: string, expect: Expect = 'object'): T | null {
  const result = parseJson<T>(raw, expect);
  return result.ok ? result.value : null;
}
