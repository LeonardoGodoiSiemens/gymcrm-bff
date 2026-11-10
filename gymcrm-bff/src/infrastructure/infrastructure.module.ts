import { Module } from '@nestjs/common';
import { ENRICHMENT_GATEWAY, ENROLLMENTS_GATEWAY, PRODUCTS_GATEWAY } from '../domain/ports';
import { loadConfig } from './config';
import { CrudClient } from './http/crud.client';
import { EnrollmentsClient } from './http/enrollments.client';
import { EnrichmentClient } from './http/enrichment.client';
import { HttpClient } from './http/http-client';

@Module({
  providers: [
    {
      provide: PRODUCTS_GATEWAY,
      useFactory: () => {
        const c = loadConfig();
        return new CrudClient(new HttpClient({ service: 'products', baseUrl: c.productsUrl, timeoutMs: c.timeoutMs }), 'products');
      },
    },
    {
      provide: ENROLLMENTS_GATEWAY,
      useFactory: () => {
        const c = loadConfig();
        return new EnrollmentsClient(new HttpClient({ service: 'enrollments', baseUrl: c.enrollmentsUrl, timeoutMs: c.timeoutMs }));
      },
    },
    {
      provide: ENRICHMENT_GATEWAY,
      useFactory: () => {
        const c = loadConfig();
        const headers = c.functionKey ? { 'x-functions-key': c.functionKey } : undefined;
        return new EnrichmentClient(
          new HttpClient({ service: 'enrichment', baseUrl: c.functionUrl, timeoutMs: c.timeoutMs, headers }),
        );
      },
    },
  ],
  exports: [PRODUCTS_GATEWAY, ENROLLMENTS_GATEWAY, ENRICHMENT_GATEWAY],
})
export class InfrastructureModule {}
