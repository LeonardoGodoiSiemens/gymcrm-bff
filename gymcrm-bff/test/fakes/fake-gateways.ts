import { UpstreamError } from '../../src/domain/errors';
import { Enrichment, EnrichmentItem, Enrollment, ListQuery, Payload, Product } from '../../src/domain/models';
import { EnrichmentGateway, EnrollmentsGateway, ProductsGateway } from '../../src/domain/ports';

export const product = (id: string, name = `Produto ${id}`, stock = 5, minStock = 2): Product =>
  ({
    id, name, description: '', price: 100, stock, category: 'SUPPLEMENT', minStock,
    lowStock: minStock > 0 && stock <= minStock, createdAt: '2026-11-01T00:00:00.000Z',
  });

export const enrollment = (
  id: number, studentName = `Aluno ${id}`, period: Enrollment['period'] = 'MONTHLY', monthlyPrice = 100, status = 'ACTIVE',
): Enrollment => ({
  id, studentName, studentEmail: `aluno${id}@email.com`, planName: 'Musculação', period, monthlyPrice, total: monthlyPrice,
  status, startDate: '2026-11-01T00:00:00.000Z', endDate: '2026-12-01T00:00:00.000Z', createdAt: '2026-11-01T00:00:00.000Z',
});

class FakeCrud<T extends { id: string | number }> {
  items: T[] = [];
  fail: UpstreamError | null = null;
  calls: string[] = [];
  private maybeFail() { if (this.fail) throw this.fail; }
  async list(_q?: ListQuery) { this.calls.push('list'); this.maybeFail(); return this.items; }
  async get(id: string) {
    this.calls.push(`get:${id}`); this.maybeFail();
    const found = this.items.find((i) => String(i.id) === id);
    if (!found) throw new UpstreamError('fake', 404, { code: 'NOT_FOUND', message: 'not found' });
    return found;
  }
  async create(body: Payload) { this.calls.push('create'); this.maybeFail(); return { ...(body as object), id: 'new' } as unknown as T; }
  async update(id: string, body: Payload) { this.calls.push(`update:${id}`); this.maybeFail(); return { ...(body as object), id } as unknown as T; }
  async remove(id: string) { this.calls.push(`remove:${id}`); this.maybeFail(); }
}

export class FakeProductsGateway extends FakeCrud<Product> implements ProductsGateway {}
export class FakeEnrollmentsGateway extends FakeCrud<Enrollment> implements EnrollmentsGateway {
  async renew(id: string) { this.calls.push(`renew:${id}`); return this.get(id); }
}

export class FakeEnrichmentGateway implements EnrichmentGateway {
  fail: UpstreamError | null = null;
  received: EnrichmentItem[][] = [];
  async enrich(items: EnrichmentItem[]): Promise<Enrichment> {
    this.received.push(items);
    if (this.fail) throw this.fail;
    const gross = items.reduce((s, i) => s + i.monthlyPrice, 0);
    return { enrollmentCount: items.length, grossTotal: gross, discount: 0, discountedTotal: gross, gatewayFee: 0, netTotal: gross, monthlyRecurring: gross };
  }
}
