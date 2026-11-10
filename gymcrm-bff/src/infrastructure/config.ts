export interface BffConfig {
  productsUrl: string;
  enrollmentsUrl: string;
  functionUrl: string;
  functionKey: string;
  timeoutMs: number;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): BffConfig {
  const timeout = Number(env.REQUEST_TIMEOUT_MS);
  return {
    productsUrl: env.PRODUCTS_URL ?? 'http://localhost:3001',
    enrollmentsUrl: env.ENROLLMENTS_URL ?? 'http://localhost:3002',
    functionUrl: env.FUNCTION_URL ?? 'http://localhost:7071/api/enrich',
    functionKey: env.FUNCTION_KEY ?? '',
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 8000,
  };
}
