import { RequestContextMiddleware } from './request-context.middleware';

describe('RequestContextMiddleware', () => {
  it('should be defined', () => {
    expect(new RequestContextMiddleware()).toBeDefined();
  });
});
