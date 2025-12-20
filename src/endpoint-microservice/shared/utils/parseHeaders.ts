import { IncomingHttpHeaders } from 'node:http';

export const parseHeaders = (
  incomeHeaders: IncomingHttpHeaders,
): Record<string, string> => {
  const headers: Record<string, string> = {};

  if (incomeHeaders.authorization) {
    headers.authorization = incomeHeaders.authorization;
  }

  return headers;
};
