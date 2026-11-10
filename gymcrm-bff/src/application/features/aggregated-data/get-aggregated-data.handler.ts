import { Inject, Injectable } from '@nestjs/common';
import { AggregatedData, Enrollment, Product, ServiceError } from '../../../domain/models';
import {
  ENRICHMENT_GATEWAY, EnrichmentGateway, ENROLLMENTS_GATEWAY, EnrollmentsGateway, PRODUCTS_GATEWAY, ProductsGateway,
} from '../../../domain/ports';

const messageOf = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason));

/**
 * GET /aggregated-data
 * 1) consulta MS Estoque (Mongo) e MS Matrículas (SQL) em paralelo;
 * 2) com as matrículas ATIVAS, chama a Azure Function de enriquecimento financeiro;
 * 3) devolve um único JSON (inclui os alertas de estoque baixo). Falhas parciais NÃO derrubam a resposta: viram meta.errors.
 */
@Injectable()
export class GetAggregatedDataHandler {
  constructor(
    @Inject(PRODUCTS_GATEWAY) private readonly products: ProductsGateway,
    @Inject(ENROLLMENTS_GATEWAY) private readonly enrollments: EnrollmentsGateway,
    @Inject(ENRICHMENT_GATEWAY) private readonly enrichment: EnrichmentGateway,
  ) {}

  async execute(): Promise<AggregatedData> {
    const errors: ServiceError[] = [];

    const [productsResult, enrollmentsResult] = await Promise.allSettled([
      this.products.list({ limit: 100 }),
      this.enrollments.list({ limit: 100 }),
    ]);

    let products: Product[] = [];
    if (productsResult.status === 'fulfilled') products = productsResult.value;
    else errors.push({ service: 'products', message: messageOf(productsResult.reason) });

    let enrollments: Enrollment[] = [];
    let enrichment: AggregatedData['enrichment'] = null;
    if (enrollmentsResult.status === 'fulfilled') {
      enrollments = enrollmentsResult.value;
      const items = enrollments
        .filter((e) => e.status === 'ACTIVE')
        .map((e) => ({ period: e.period, monthlyPrice: e.monthlyPrice }));
      try {
        enrichment = await this.enrichment.enrich(items);
      } catch (error) {
        errors.push({ service: 'enrichment', message: messageOf(error) });
      }
    } else {
      errors.push({ service: 'enrollments', message: messageOf(enrollmentsResult.reason) });
      errors.push({ service: 'enrichment', message: 'skipped: enrollments are unavailable' });
    }

    return {
      products,
      lowStockProducts: products.filter((p) => p.lowStock),
      enrollments,
      enrichment,
      meta: { generatedAt: new Date().toISOString(), partial: errors.length > 0, errors },
    };
  }
}
