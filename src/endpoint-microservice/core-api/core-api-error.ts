import { HttpException, HttpStatus } from '@nestjs/common';
import { GraphQLError } from 'graphql/error';

const GRAPHQL_CODE_BY_STATUS: Record<number, string> = {
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
};

export function resolveStatusCode(
  error: unknown,
  upstreamStatus?: number,
): number {
  return extractErrorStatusCode(error) ?? coerceUpstreamStatus(upstreamStatus);
}

export function toRestException(
  error: unknown,
  upstreamStatus?: number,
): HttpException {
  const statusCode = resolveStatusCode(error, upstreamStatus);
  return new HttpException(buildRestBody(error, statusCode), statusCode);
}

export function toGraphQLError(
  error: unknown,
  upstreamStatus?: number,
): GraphQLError {
  const statusCode = resolveStatusCode(error, upstreamStatus);
  const code = GRAPHQL_CODE_BY_STATUS[statusCode] ?? 'INTERNAL_SERVER_ERROR';

  return new GraphQLError(buildSafeMessage(error, statusCode), {
    extensions: { code, statusCode },
  });
}

function extractErrorStatusCode(error: unknown): number | undefined {
  if (error instanceof HttpException) {
    return error.getStatus();
  }

  if (typeof error !== 'object' || error === null) return undefined;

  const statusCode = Number((error as { statusCode?: unknown }).statusCode);
  if (isHttpStatusCode(statusCode)) return statusCode;

  return undefined;
}

function coerceUpstreamStatus(status?: number): number {
  return isHttpStatusCode(status) ? status : HttpStatus.INTERNAL_SERVER_ERROR;
}

function isHttpStatusCode(status?: number): status is number {
  return (
    typeof status === 'number' &&
    Number.isInteger(status) &&
    status >= 400 &&
    status <= 599
  );
}

function buildRestBody(
  error: unknown,
  statusCode: number,
): string | Record<string, unknown> {
  if (error instanceof HttpException) {
    const body = error.getResponse();
    if (typeof body === 'object' && body !== null) {
      return body as Record<string, unknown>;
    }
    return {
      statusCode,
      message: typeof body === 'string' ? body : error.message,
    };
  }
  if (error instanceof SyntaxError) {
    return { statusCode, message: defaultStatusMessage(statusCode) };
  }
  if (error instanceof Error) {
    return { statusCode, message: error.message };
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    return error as Record<string, unknown>;
  }
  return { statusCode, message: defaultStatusMessage(statusCode) };
}

function buildSafeMessage(error: unknown, statusCode: number): string {
  if (error instanceof HttpException) return error.message;
  if (error instanceof SyntaxError) return defaultStatusMessage(statusCode);
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return defaultStatusMessage(statusCode);
}

function defaultStatusMessage(statusCode: number): string {
  switch (statusCode) {
    case HttpStatus.UNAUTHORIZED:
      return 'Unauthorized';
    case HttpStatus.FORBIDDEN:
      return 'Forbidden';
    case HttpStatus.NOT_FOUND:
      return 'Not Found';
    default:
      return 'Core API request failed';
  }
}
