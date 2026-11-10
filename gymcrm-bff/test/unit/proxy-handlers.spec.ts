import { EnrollmentsProxyHandler } from '../../src/application/features/enrollments-proxy/enrollments-proxy.handler';
import { ProductsProxyHandler } from '../../src/application/features/products-proxy/products-proxy.handler';
import { UpstreamError } from '../../src/domain/errors';
import { enrollment, FakeEnrollmentsGateway, FakeProductsGateway, product } from '../fakes/fake-gateways';

describe('Proxy handlers delegate to the gateways', () => {
  it('ProductsProxyHandler: list/get/create/update/remove', async () => {
    const gw = new FakeProductsGateway();
    gw.items = [product('p1')];
    const h = new ProductsProxyHandler(gw);
    expect(await h.list({ page: 1 })).toHaveLength(1);
    expect((await h.get('p1')).id).toBe('p1');
    expect(await h.create({ name: 'x' })).toMatchObject({ name: 'x' });
    expect(await h.update('p1', { name: 'y' })).toMatchObject({ id: 'p1', name: 'y' });
    await h.remove('p1');
    expect(gw.calls).toEqual(['list', 'get:p1', 'create', 'update:p1', 'remove:p1']);
  });

  it('EnrollmentsProxyHandler: list/get/create/update/renew/remove', async () => {
    const gw = new FakeEnrollmentsGateway();
    gw.items = [enrollment(1)];
    const h = new EnrollmentsProxyHandler(gw);
    expect(await h.list()).toHaveLength(1);
    expect((await h.get('1')).id).toBe(1);
    await h.create({ studentName: 'Maria' });
    await h.update('1', { status: 'FROZEN' });
    await h.renew('1');
    await h.remove('1');
    expect(gw.calls).toEqual(['list', 'get:1', 'create', 'update:1', 'renew:1', 'get:1', 'remove:1']);
  });

  it('propagates upstream errors untouched', async () => {
    const gw = new FakeProductsGateway();
    await expect(new ProductsProxyHandler(gw).get('missing')).rejects.toBeInstanceOf(UpstreamError);
  });
});
