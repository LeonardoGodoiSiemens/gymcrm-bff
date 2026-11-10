import * as http from 'http';
import { AddressInfo } from 'net';
import { UpstreamError } from '../../src/domain/errors';
import { RequestContext } from '../../src/domain/request-context';
import { loadConfig } from '../../src/infrastructure/config';
import { CrudClient } from '../../src/infrastructure/http/crud.client';
import { HttpClient } from '../../src/infrastructure/http/http-client';

async function rejection(promise: Promise<unknown>): Promise<UpstreamError> {
  try { await promise; } catch (e) { return e as UpstreamError; }
  throw new Error('expected the promise to reject');
}

interface Seen { method?: string; url?: string; headers: http.IncomingHttpHeaders; body: string }

describe('HttpClient (integration with a local HTTP server)', () => {
  let server: http.Server;
  let baseUrl: string;
  let seen: Seen[] = [];

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        seen.push({ method: req.method, url: req.url, headers: req.headers, body });
        if (req.url?.startsWith('/slow')) return; // nunca responde
        if (req.url?.startsWith('/missing')) {
          res.writeHead(404, { 'content-type': 'application/json' });
          return res.end(JSON.stringify({ code: 'NOT_FOUND', message: 'nope' }));
        }
        if (req.url?.startsWith('/boom')) { res.writeHead(500); return res.end('server exploded'); }
        if (req.method === 'DELETE') { res.writeHead(204); return res.end(); }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, echo: body ? JSON.parse(body) : null }));
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise((r) => server.close(r)));
  beforeEach(() => { seen = []; });

  const client = (extra: Partial<ConstructorParameters<typeof HttpClient>[0]> = {}) =>
    new HttpClient({ service: 'svc', baseUrl, timeoutMs: 1000, ...extra });

  it('GET builds the query string and parses JSON', async () => {
    const res = await client().request<{ ok: boolean }>('GET', '/items', { query: { page: 2, limit: undefined } });
    expect(res.ok).toBe(true);
    expect(seen[0].url).toBe('/items?page=2');
  });

  it('POST sends a JSON body and the configured default headers', async () => {
    const res = await client({ headers: { 'x-functions-key': 'secret' } }).request<{ echo: unknown }>('POST', '/items', { body: { a: 1 } });
    expect(res.echo).toEqual({ a: 1 });
    expect(seen[0].headers['x-functions-key']).toBe('secret');
    expect(seen[0].headers['content-type']).toContain('application/json');
  });

  it('forwards the correlation id of the current request', async () => {
    await RequestContext.run({ correlationId: 'corr-123' }, () => client().request('GET', '/items'));
    expect(seen[0].headers['x-correlation-id']).toBe('corr-123');
  });

  it('returns undefined for 204', async () => {
    expect(await client().request('DELETE', '/items/1')).toBeUndefined();
  });

  it('maps a 404 into UpstreamError keeping status and body', async () => {
    const err = await rejection(client().request('GET', '/missing'));
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err).toMatchObject({ service: 'svc', status: 404, body: { code: 'NOT_FOUND' } });
  });

  it('keeps a non-JSON error body as text', async () => {
    const err = await rejection(client().request('GET', '/boom'));
    expect(err).toMatchObject({ status: 500, body: 'server exploded' });
  });

  it('times out and reports the upstream as unavailable', async () => {
    const err = await rejection(client({ timeoutMs: 150 }).request('GET', '/slow'));
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.unavailable).toBe(true);
    expect(err.message).toContain('timed out');
  });

  it('reports connection refused as unavailable', async () => {
    const err = await rejection(
      new HttpClient({ service: 'svc', baseUrl: 'http://127.0.0.1:1', timeoutMs: 1000 }).request('GET', '/x'),
    );
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.unavailable).toBe(true);
  });

  it('CrudClient builds the right method/path for each operation', async () => {
    const crud = new CrudClient<unknown>(client(), 'products');
    await crud.list({ page: 1, limit: 10 });
    await crud.get('a b');
    await crud.create({ n: 1 });
    await crud.update('x', { n: 2 });
    await crud.remove('x');
    expect(seen.map((s) => `${s.method} ${s.url}`)).toEqual([
      'GET /products?page=1&limit=10', 'GET /products/a%20b', 'POST /products', 'PUT /products/x', 'DELETE /products/x',
    ]);
  });
});

describe('loadConfig', () => {
  it('uses defaults and parses the timeout', () => {
    expect(loadConfig({}).timeoutMs).toBe(8000);
    expect(loadConfig({ REQUEST_TIMEOUT_MS: '2500', PRODUCTS_URL: 'http://x' })).toMatchObject({ timeoutMs: 2500, productsUrl: 'http://x' });
    expect(loadConfig({ REQUEST_TIMEOUT_MS: 'abc' }).timeoutMs).toBe(8000);
  });
});
