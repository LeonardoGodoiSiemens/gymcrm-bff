import * as http from 'http';
import { AddressInfo } from 'net';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { BffModule } from '../../src/api/bff.module';
import { configureApp } from '../../src/api/configure-app';

/**
 * E2E real: o BFF completo (controllers + handlers + clientes HTTP) conversando com três servidores
 * locais que fingem ser MS Estoque, MS Matrículas e a Azure Function.
 */
type Handler = (req: http.IncomingMessage, body: string, res: http.ServerResponse) => void;

function startServer(handler: Handler): Promise<{ server: http.Server; url: string; requests: { url?: string; headers: http.IncomingHttpHeaders; body: string }[] }> {
  const requests: { url?: string; headers: http.IncomingHttpHeaders; body: string }[] = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => { requests.push({ url: req.url, headers: req.headers, body }); handler(req, body, res); });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, requests })),
  );
}
const json = (res: http.ServerResponse, status: number, data: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
};

describe('BFF (e2e with fake downstream servers)', () => {
  let app: INestApplication;
  let productsSrv: Awaited<ReturnType<typeof startServer>>;
  let enrollmentsSrv: Awaited<ReturnType<typeof startServer>>;
  let functionSrv: Awaited<ReturnType<typeof startServer>>;
  let enrollmentsDown = false;

  beforeAll(async () => {
    productsSrv = await startServer((req, _b, res) => {
      if (req.url?.startsWith('/products/missing')) return json(res, 404, { code: 'PRODUCT_NOT_FOUND', message: 'not found' });
      if (req.method === 'POST') return json(res, 201, { id: 'p9', name: 'Novo' });
      if (req.method === 'DELETE') { res.writeHead(204); return res.end(); }
      json(res, 200, [{ id: 'p1', name: 'Whey Protein', description: '', price: 100, stock: 1, category: 'SUPPLEMENT', minStock: 2, lowStock: true, createdAt: 'x' }]);
    });
    enrollmentsSrv = await startServer((req, _b, res) => {
      if (enrollmentsDown) { res.writeHead(500); return res.end('db down'); }
      if (req.method === 'POST' && req.url?.endsWith('/renew')) return json(res, 200, { id: 1, status: 'ACTIVE' });
      json(res, 200, [{ id: 1, studentName: 'Maria', studentEmail: 'm@e.com', planName: 'Musculação', period: 'QUARTERLY', monthlyPrice: 100, total: 300, status: 'ACTIVE', startDate: 'x', endDate: 'y', createdAt: 'x' }]);
    });
    functionSrv = await startServer((_req, body, res) => {
      const items = JSON.parse(body).items as { monthlyPrice: number }[];
      const gross = items.reduce((s, i) => s + i.monthlyPrice * 3, 0);
      json(res, 200, { enrollmentCount: items.length, grossTotal: gross, discount: 15, discountedTotal: gross - 15, gatewayFee: 5, netTotal: gross - 20, monthlyRecurring: 95 });
    });

    process.env.PRODUCTS_URL = productsSrv.url;
    process.env.ENROLLMENTS_URL = enrollmentsSrv.url;
    process.env.FUNCTION_URL = `${functionSrv.url}/api/enrich`;
    process.env.FUNCTION_KEY = 'fn-key-123';
    process.env.REQUEST_TIMEOUT_MS = '2000';

    const moduleRef = await Test.createTestingModule({ imports: [BffModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    for (const s of [productsSrv, enrollmentsSrv, functionSrv]) await new Promise((r) => s.server.close(r));
  });

  it('GET /aggregated-data returns one JSON with products, low-stock alerts, enrollments, enrichment and meta', async () => {
    const res = await request(app.getHttpServer()).get('/aggregated-data').set('x-correlation-id', 'trace-42').expect(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.lowStockProducts).toHaveLength(1);
    expect(res.body.enrollments[0]).toMatchObject({ id: 1, studentName: 'Maria' });
    expect(res.body.enrichment).toMatchObject({ grossTotal: 300, netTotal: 280 });
    expect(res.body.meta).toMatchObject({ partial: false, errors: [] });
    expect(res.headers['x-correlation-id']).toBe('trace-42');
  });

  it('calls the function with the function key and propagates the correlation id downstream', async () => {
    await request(app.getHttpServer()).get('/aggregated-data').set('x-correlation-id', 'trace-77').expect(200);
    const fnCall = functionSrv.requests[functionSrv.requests.length - 1];
    expect(fnCall.url).toBe('/api/enrich');
    expect(fnCall.headers['x-functions-key']).toBe('fn-key-123');
    expect(fnCall.headers['x-correlation-id']).toBe('trace-77');
    expect(JSON.parse(fnCall.body).items).toEqual([{ period: 'QUARTERLY', monthlyPrice: 100 }]);
    expect(productsSrv.requests[productsSrv.requests.length - 1].headers['x-correlation-id']).toBe('trace-77');
  });

  it('GET /aggregated-data is still 200 (partial) when the enrollments service is down', async () => {
    enrollmentsDown = true;
    const res = await request(app.getHttpServer()).get('/aggregated-data').expect(200);
    enrollmentsDown = false;
    expect(res.body.meta.partial).toBe(true);
    expect(res.body.enrollments).toEqual([]);
    expect(res.body.enrichment).toBeNull();
    expect(res.body.products).toHaveLength(1);
    expect(res.body.meta.errors.map((e: { service: string }) => e.service)).toEqual(['enrollments', 'enrichment']);
  });

  it('generates a correlation id when the client does not send one', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.headers['x-correlation-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body).toEqual({ status: 'ok', service: 'bff' });
  });

  it('proxies CRUD: list, create (201) and delete (204)', async () => {
    expect((await request(app.getHttpServer()).get('/products').expect(200)).body).toHaveLength(1);
    const created = await request(app.getHttpServer()).post('/products').send({ name: 'Novo', price: 1, stock: 1 }).expect(201);
    expect(created.body.id).toBe('p9');
    expect(JSON.parse(productsSrv.requests[productsSrv.requests.length - 1].body)).toMatchObject({ name: 'Novo' });
    await request(app.getHttpServer()).delete('/products/p9').expect(204);
  });

  it('proxies the renew action to the enrollments service', async () => {
    const res = await request(app.getHttpServer()).post('/enrollments/1/renew').expect(200);
    expect(res.body).toMatchObject({ id: 1, status: 'ACTIVE' });
  });

  it('passes upstream 404 through with the original error body', async () => {
    const res = await request(app.getHttpServer()).get('/products/missing').expect(404);
    expect(res.body).toEqual({ code: 'PRODUCT_NOT_FOUND', message: 'not found' });
  });

  it('turns an upstream 500 into a 502 UPSTREAM_UNAVAILABLE on proxied routes', async () => {
    enrollmentsDown = true;
    const res = await request(app.getHttpServer()).get('/enrollments').expect(502);
    enrollmentsDown = false;
    expect(res.body).toMatchObject({ code: 'UPSTREAM_UNAVAILABLE', service: 'enrollments' });
  });
});

describe('BFF API Gateway protection (GATEWAY_SECRET)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [BffModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app, { gatewaySecret: 's3cr3t' });
    await app.init();
  });
  afterAll(async () => app.close());

  it('rejects requests without the gateway header (403)', async () => {
    const res = await request(app.getHttpServer()).get('/enrollments').expect(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('rejects a wrong secret', async () => {
    await request(app.getHttpServer()).get('/enrollments').set('x-gateway-secret', 'wrong').expect(403);
  });

  it('lets /health through for platform health checks', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('accepts the right secret (request reaches the BFF; downstream may fail with 502)', async () => {
    const res = await request(app.getHttpServer()).get('/enrollments').set('x-gateway-secret', 's3cr3t');
    expect(res.status).not.toBe(403);
  });
});
