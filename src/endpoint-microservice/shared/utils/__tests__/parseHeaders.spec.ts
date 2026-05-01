import { parseHeaders } from '../parseHeaders';

describe('parseHeaders', () => {
  it('should forward authorization header', () => {
    const result = parseHeaders({
      authorization: 'Bearer token123',
    });

    expect(result.authorization).toBe('Bearer token123');
  });

  it('should forward x-api-key header', () => {
    const result = parseHeaders({
      'x-api-key': 'rev_testkey123456789012',
    });

    expect(result['x-api-key']).toBe('rev_testkey123456789012');
  });

  it('should forward both authorization and x-api-key headers', () => {
    const result = parseHeaders({
      authorization: 'Bearer token123',
      'x-api-key': 'rev_testkey123456789012',
    });

    expect(result.authorization).toBe('Bearer token123');
    expect(result['x-api-key']).toBe('rev_testkey123456789012');
  });

  it('should forward auth cookies used by core session auth', () => {
    const result = parseHeaders({
      cookie: 'theme=dark; rev_session=1; rev_at=jwt-token; other=value',
    });

    expect(result.cookie).toBe('rev_session=1; rev_at=jwt-token');
  });

  it('should forward auth cookies together with explicit auth headers', () => {
    const result = parseHeaders({
      authorization: 'Bearer token123',
      cookie: 'rev_session=1; rev_at=jwt-token',
    });

    expect(result.authorization).toBe('Bearer token123');
    expect(result.cookie).toBe('rev_session=1; rev_at=jwt-token');
  });

  it('should not forward other headers', () => {
    const result = parseHeaders({
      authorization: 'Bearer token',
      'content-type': 'application/json',
      'x-custom-header': 'value',
      cookie: 'theme=dark; tracking=123',
    });

    expect(result.authorization).toBe('Bearer token');
    expect(result['content-type']).toBeUndefined();
    expect(result['x-custom-header']).toBeUndefined();
    expect(result.cookie).toBeUndefined();
  });

  it('should return empty object when no auth headers present', () => {
    const result = parseHeaders({
      'content-type': 'application/json',
    });

    expect(Object.keys(result)).toHaveLength(0);
  });
});
