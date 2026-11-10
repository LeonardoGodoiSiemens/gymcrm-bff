import { Enrichment, EnrichmentItem } from '../../domain/models';
import { EnrichmentGateway } from '../../domain/ports';
import { HttpClient } from './http-client';

/** Chama o HTTP Trigger da Azure Function (POST <FUNCTION_URL> com { items }). */
export class EnrichmentClient implements EnrichmentGateway {
  constructor(private readonly http: HttpClient) {}

  enrich(items: EnrichmentItem[]): Promise<Enrichment> {
    return this.http.request<Enrichment>('POST', '', { body: { items } });
  }
}
