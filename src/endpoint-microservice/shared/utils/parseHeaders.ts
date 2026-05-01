import { IncomingHttpHeaders } from 'node:http';

const AUTH_COOKIE_NAMES = new Set(['rev_at', 'rev_session']);

export const parseHeaders = (
  incomeHeaders: IncomingHttpHeaders,
): Record<string, string> => {
  const headers: Record<string, string> = {};

  const authorization = firstHeaderValue(incomeHeaders.authorization);
  if (authorization) {
    headers.authorization = authorization;
  }

  const apiKey = firstHeaderValue(incomeHeaders['x-api-key']);
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const cookie = authCookieHeader(incomeHeaders.cookie);
  if (cookie) {
    headers.cookie = cookie;
  }

  return headers;
};

function firstHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function authCookieHeader(
  value: string | string[] | undefined,
): string | undefined {
  const cookieHeaders = Array.isArray(value) ? value : [value];
  const cookies: string[] = [];
  const seen = new Set<string>();

  for (const cookieHeader of cookieHeaders) {
    if (!cookieHeader) continue;

    for (const part of cookieHeader.split(';')) {
      const pair = part.trim();
      const separatorIndex = pair.indexOf('=');
      if (separatorIndex <= 0) continue;

      const name = pair.slice(0, separatorIndex).trim();
      if (!AUTH_COOKIE_NAMES.has(name) || seen.has(name)) continue;

      seen.add(name);
      cookies.push(pair);
    }
  }

  return cookies.length ? cookies.join('; ') : undefined;
}
