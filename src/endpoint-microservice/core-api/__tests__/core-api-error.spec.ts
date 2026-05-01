import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  resolveStatusCode,
  toGraphQLError,
  toRestException,
} from 'src/endpoint-microservice/core-api/core-api-error';

describe('core-api-error', () => {
  describe('resolveStatusCode', () => {
    it('reads statusCode from a JSON error body', () => {
      expect(resolveStatusCode({ statusCode: 401 }, 500)).toBe(401);
    });

    it('falls back to upstream status when error has no statusCode', () => {
      expect(resolveStatusCode(new SyntaxError('html'), 403)).toBe(403);
    });

    it('coerces missing/invalid upstream status to 500', () => {
      expect(resolveStatusCode(new SyntaxError('x'), undefined)).toBe(500);
      expect(resolveStatusCode(new SyntaxError('x'), 999)).toBe(500);
    });

    it('preserves status from a Nest HttpException', () => {
      // Defensive: even if a Nest HttpException is forwarded as `error`,
      // we must keep its 401/403/404 status, not silently downgrade to
      // upstreamStatus or 500.
      expect(resolveStatusCode(new UnauthorizedException(), 500)).toBe(401);
      expect(resolveStatusCode(new ForbiddenException(), 500)).toBe(403);
      expect(resolveStatusCode(new NotFoundException(), 500)).toBe(404);
    });
  });

  describe('toRestException', () => {
    it('uses the JSON error body verbatim when present', () => {
      const ex = toRestException(
        { statusCode: 404, message: 'gone', error: 'Not Found' },
        500,
      );
      expect(ex.getStatus()).toBe(404);
      expect(ex.getResponse()).toEqual({
        statusCode: 404,
        message: 'gone',
        error: 'Not Found',
      });
    });

    it('converts SyntaxError + upstream status into a structured body', () => {
      const ex = toRestException(new SyntaxError('Unexpected token <'), 401);
      expect(ex.getStatus()).toBe(401);
      expect(ex.getResponse()).toEqual({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });

    it('preserves an HttpException response body and status', () => {
      const original = new ForbiddenException('You are not allowed');
      const ex = toRestException(original, 500);
      expect(ex.getStatus()).toBe(403);
      const body = ex.getResponse() as { statusCode: number; message: string };
      expect(body.statusCode).toBe(403);
      expect(body.message).toBe('You are not allowed');
    });
  });

  describe('toGraphQLError', () => {
    it('maps 401 to UNAUTHENTICATED', () => {
      const err = toGraphQLError(new SyntaxError('x'), 401);
      expect(err.extensions.code).toBe('UNAUTHENTICATED');
      expect(err.extensions.statusCode).toBe(401);
    });

    it('maps 403 to FORBIDDEN', () => {
      const err = toGraphQLError({ statusCode: 403, message: 'No' });
      expect(err.extensions.code).toBe('FORBIDDEN');
      expect(err.message).toBe('No');
    });

    it('maps 404 to NOT_FOUND', () => {
      const err = toGraphQLError(new SyntaxError('x'), 404);
      expect(err.extensions.code).toBe('NOT_FOUND');
    });

    it('maps unknown statuses to INTERNAL_SERVER_ERROR', () => {
      const err = toGraphQLError(new Error('boom'));
      expect(err.extensions.code).toBe('INTERNAL_SERVER_ERROR');
      expect(err.extensions.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('preserves status and uses original message for HttpException input', () => {
      const err = toGraphQLError(
        new UnauthorizedException('Invalid API key'),
        500,
      );
      expect(err.extensions.code).toBe('UNAUTHENTICATED');
      expect(err.extensions.statusCode).toBe(401);
      expect(err.message).toBe('Invalid API key');
    });

    it('does not leak originalError into extensions', () => {
      const err = toGraphQLError(
        new SyntaxError('Unexpected token < in JSON'),
        403,
      );
      expect(err.extensions).not.toHaveProperty('originalError');
      expect(err.message).not.toMatch(/Unexpected token/);
    });

    it('replaces SyntaxError messages with generic status text', () => {
      const err = toGraphQLError(new SyntaxError('Unexpected token <'), 401);
      expect(err.message).toBe('Unauthorized');
    });
  });

  it('does not throw on weird inputs', () => {
    expect(() => toRestException(undefined as unknown)).not.toThrow();
    expect(() => toRestException(null as unknown)).not.toThrow();
    expect(() => toRestException('plain string')).not.toThrow();
    expect(() => toGraphQLError(undefined as unknown)).not.toThrow();
  });

  it('default-cases unknown HttpException subclass status', () => {
    class TeapotException extends HttpException {
      constructor() {
        super('I am a teapot', HttpStatus.I_AM_A_TEAPOT);
      }
    }
    const ex = toRestException(new TeapotException(), 500);
    expect(ex.getStatus()).toBe(HttpStatus.I_AM_A_TEAPOT);
  });
});
