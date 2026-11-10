import { Enrichment, EnrichmentItem, ListQuery, Enrollment, Payload, Product } from './models';

export const PRODUCTS_GATEWAY = Symbol('PRODUCTS_GATEWAY');
export const ENROLLMENTS_GATEWAY = Symbol('ENROLLMENTS_GATEWAY');
export const ENRICHMENT_GATEWAY = Symbol('ENRICHMENT_GATEWAY');

export interface ProductsGateway {
  list(query?: ListQuery): Promise<Product[]>;
  get(id: string): Promise<Product>;
  create(body: Payload): Promise<Product>;
  update(id: string, body: Payload): Promise<Product>;
  remove(id: string): Promise<void>;
}

export interface EnrollmentsGateway {
  renew(id: string): Promise<Enrollment>;
  list(query?: ListQuery): Promise<Enrollment[]>;
  get(id: string): Promise<Enrollment>;
  create(body: Payload): Promise<Enrollment>;
  update(id: string, body: Payload): Promise<Enrollment>;
  remove(id: string): Promise<void>;
}

export interface EnrichmentGateway {
  enrich(items: EnrichmentItem[]): Promise<Enrichment>;
}
