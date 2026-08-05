/**
 * Simple, fast pattern matcher supporting wildcards (*), exact match, and substring match.
 */
export function matchPattern(pattern: string | undefined, payload: string | Record<string, any>): boolean {
  if (!pattern || pattern === '*') {
    return true;
  }

  const payloadStr = typeof payload === 'string'
    ? payload.trim()
    : JSON.stringify(payload);

  const cleanPattern = pattern.trim();

  // If pattern is a regex string e.g. "/^rm.*/"
  if (cleanPattern.startsWith('/') && cleanPattern.endsWith('/')) {
    try {
      const rx = new RegExp(cleanPattern.slice(1, -1));
      return rx.test(payloadStr);
    } catch {
      // Fallback
    }
  }

  // Convert wildcard pattern to regex (e.g. "npm run *" -> "^npm run .*$")
  const regexString = '^' + cleanPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*') + '$';

  try {
    const globRx = new RegExp(regexString, 'i');
    if (globRx.test(payloadStr)) {
      return true;
    }
  } catch {
    // Fallback to substring match
  }

  return payloadStr.toLowerCase().includes(cleanPattern.toLowerCase());
}
