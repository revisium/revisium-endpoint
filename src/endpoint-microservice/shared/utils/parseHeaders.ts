import { IncomingHttpHeaders } from 'node:http';

export const parseHeaders = (
  incomeHeaders: IncomingHttpHeaders,
): Record<string, string> => {
  const headers: Record<string, string> = {};

  if (incomeHeaders.authorization) {
    headers.authorization = incomeHeaders.authorization;
  }

  if (incomeHeaders['x-api-key']) {
    headers['x-api-key'] = incomeHeaders['x-api-key'] as string;
  }

  return headers;
};
