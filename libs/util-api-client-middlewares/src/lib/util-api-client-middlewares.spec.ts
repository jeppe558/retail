import { utilApiClientMiddlewares } from './util-api-client-middlewares';

describe('utilApiClientMiddlewares', () => {
  it('should work', () => {
    expect(utilApiClientMiddlewares()).toEqual('util-api-client-middlewares');
  });
});
