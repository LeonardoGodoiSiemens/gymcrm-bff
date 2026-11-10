import { UpstreamError } from '../../domain/errors';
import { RequestContext } from '../../domain/request-context';

export interface HttpClientOptions {
  service: string;
  baseUrl: string;
  timeoutMs: number;
  headers?: Record<string, string>;
  /** Injetável para testes; padrão: fetch global do Node 20. */
  fetchFn?: typeof fetch;
}

export interface RequestOptions {
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

export class HttpClient {
  private readonly fetchFn: typeof fetch;

  constructor(private readonly options: HttpClientOptions) {
    this.fetchFn = options.fetchFn ?? ((...args) => fetch(...args));
  }

  async request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const { service, baseUrl, timeoutMs } = this.options;
    const url = new URL(baseUrl.replace(/\/+$/, '') + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = { Accept: 'application/json', ...this.options.headers };
    const correlationId = RequestContext.correlationId();
    if (correlationId) headers['x-correlation-id'] = correlationId;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await this.fetchFn(url.toString(), {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const timedOut = (error as Error).name === 'TimeoutError' || (error as Error).name === 'AbortError';
      throw new UpstreamError(
        service,
        0,
        null,
        timedOut ? `${service} timed out after ${timeoutMs}ms` : `${service} is unreachable: ${(error as Error).message}`,
      );
    }

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* corpo não-JSON: mantém o texto */
    }

    if (!response.ok) throw new UpstreamError(service, response.status, parsed);
    return parsed as T;
  }
}
