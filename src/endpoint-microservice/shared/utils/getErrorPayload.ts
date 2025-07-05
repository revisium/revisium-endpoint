interface ErrorPayload {
  message: string;
  code?: string | number;
  original?: unknown;
}

export function getErrorPayload(error: unknown): ErrorPayload {
  if (error instanceof Error) {
    return { message: error.message, original: error };
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return { message: error.message, original: error };
  }

  return { message: String(error), original: error };
}
