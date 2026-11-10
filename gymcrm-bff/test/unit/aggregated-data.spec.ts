import { GetAggregatedDataHandler } from '../../src/application/features/aggregated-data/get-aggregated-data.handler';
import { UpstreamError } from '../../src/domain/errors';
import { enrollment, FakeEnrichmentGateway, FakeEnrollmentsGateway, FakeProductsGateway, product } from '../fakes/fake-gateways';

describe('GetAggregatedDataHandler', () => {
  let products: FakeProductsGateway;
  let enrollments: FakeEnrollmentsGateway;
  let enrichment: FakeEnrichmentGateway;
  let handler: GetAggregatedDataHandler;

  beforeEach(() => {
    products = new FakeProductsGateway();
    enrollments = new FakeEnrollmentsGateway();
    enrichment = new FakeEnrichmentGateway();
    handler = new GetAggregatedDataHandler(products, enrollments, enrichment);
    products.items = [product('p1', 'Whey Protein', 10), product('p2', 'Creatina', 1)]; // p2 abaixo do mínimo
    enrollments.items = [
      enrollment(1, 'Maria', 'ANNUAL', 100),
      enrollment(2, 'João', 'MONTHLY', 50, 'CANCELLED'),
      enrollment(3, 'Ana', 'QUARTERLY', 80, 'FROZEN'),
      enrollment(4, 'Pedro', 'MONTHLY', 120),
    ];
  });

  it('aggregates stock, low-stock alerts, enrollments and enrichment in a single response', async () => {
    const result = await handler.execute();
    expect(result.products).toHaveLength(2);
    expect(result.lowStockProducts.map((p) => p.name)).toEqual(['Creatina']);
    expect(result.enrollments).toHaveLength(4);
    expect(result.enrichment).not.toBeNull();
    expect(result.meta.partial).toBe(false);
    expect(result.meta.errors).toEqual([]);
    expect(new Date(result.meta.generatedAt).toString()).not.toBe('Invalid Date');
  });

  it('sends only ACTIVE enrollments (period + monthlyPrice) to the enrichment function', async () => {
    await handler.execute();
    expect(enrichment.received[0]).toEqual([
      { period: 'ANNUAL', monthlyPrice: 100 },
      { period: 'MONTHLY', monthlyPrice: 120 },
    ]);
  });

  it('is partial (not an error) when the stock service fails', async () => {
    products.fail = new UpstreamError('products', 0, null, 'products is unreachable');
    const result = await handler.execute();
    expect(result.products).toEqual([]);
    expect(result.lowStockProducts).toEqual([]);
    expect(result.enrollments).toHaveLength(4);
    expect(result.enrichment).not.toBeNull();
    expect(result.meta.partial).toBe(true);
    expect(result.meta.errors).toEqual([{ service: 'products', message: 'products is unreachable' }]);
  });

  it('skips enrichment when enrollments fail', async () => {
    enrollments.fail = new UpstreamError('enrollments', 500, null);
    const result = await handler.execute();
    expect(result.enrollments).toEqual([]);
    expect(result.enrichment).toBeNull();
    expect(enrichment.received).toHaveLength(0);
    expect(result.meta.errors.map((e) => e.service)).toEqual(['enrollments', 'enrichment']);
  });

  it('keeps products and enrollments when only the function fails', async () => {
    enrichment.fail = new UpstreamError('enrichment', 0, null, 'enrichment timed out');
    const result = await handler.execute();
    expect(result.products).toHaveLength(2);
    expect(result.enrollments).toHaveLength(4);
    expect(result.enrichment).toBeNull();
    expect(result.meta.errors).toEqual([{ service: 'enrichment', message: 'enrichment timed out' }]);
  });

  it('queries both microservices (both are called even if one fails)', async () => {
    products.fail = new UpstreamError('products', 500, null);
    await handler.execute();
    expect(products.calls).toEqual(['list']);
    expect(enrollments.calls).toEqual(['list']);
  });

  it('returns everything empty and partial when all services are down', async () => {
    products.fail = new UpstreamError('products', 0, null, 'down');
    enrollments.fail = new UpstreamError('enrollments', 0, null, 'down');
    const result = await handler.execute();
    expect(result).toMatchObject({ products: [], lowStockProducts: [], enrollments: [], enrichment: null });
    expect(result.meta.partial).toBe(true);
    expect(result.meta.errors).toHaveLength(3);
  });
});
