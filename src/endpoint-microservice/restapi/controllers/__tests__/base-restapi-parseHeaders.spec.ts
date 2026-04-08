import { Request } from 'express';
import { RestapiEndpointService } from 'src/endpoint-microservice/restapi/restapi-endpoint.service';
import { BaseRestapiController } from '../base-restapi.controller';

class TestController extends BaseRestapiController {
  constructor() {
    super(null as unknown as RestapiEndpointService);
  }

  public testParseHeaders(req: Partial<Request>): Record<string, string> {
    return this.parseHeaders(req as Request);
  }
}

describe('BaseRestapiController.parseHeaders', () => {
  let controller: TestController;

  beforeEach(() => {
    controller = new TestController();
  });

  it('should forward authorization header', () => {
    const result = controller.testParseHeaders({
      headers: { authorization: 'Bearer token' } as any,
      query: {},
    });

    expect(result.authorization).toBe('Bearer token');
  });

  it('should forward x-api-key header', () => {
    const result = controller.testParseHeaders({
      headers: { 'x-api-key': 'rev_testkey123456789012' } as any,
      query: {},
    });

    expect(result['x-api-key']).toBe('rev_testkey123456789012');
  });

  it('should convert ?api_key= query param to x-api-key header', () => {
    const result = controller.testParseHeaders({
      headers: {} as any,
      query: { api_key: 'rev_querykey12345678901' },
    });

    expect(result['x-api-key']).toBe('rev_querykey12345678901');
  });

  it('should not use query param when x-api-key header present', () => {
    const result = controller.testParseHeaders({
      headers: { 'x-api-key': 'rev_headerkey1234567890' } as any,
      query: { api_key: 'rev_querykey12345678901' },
    });

    expect(result['x-api-key']).toBe('rev_headerkey1234567890');
  });

  it('should not use query param when authorization header present', () => {
    const result = controller.testParseHeaders({
      headers: { authorization: 'Bearer token' } as any,
      query: { api_key: 'rev_querykey12345678901' },
    });

    expect(result['x-api-key']).toBeUndefined();
    expect(result.authorization).toBe('Bearer token');
  });

  it('should return empty headers when no auth present', () => {
    const result = controller.testParseHeaders({
      headers: {} as any,
      query: {},
    });

    expect(Object.keys(result)).toHaveLength(0);
  });
});
