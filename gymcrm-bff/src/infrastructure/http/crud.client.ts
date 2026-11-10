import { ListQuery, Payload } from '../../domain/models';
import { HttpClient } from './http-client';

/** Cliente CRUD genérico para os microsserviços (mesmo contrato REST nos dois). */
export class CrudClient<T> {
  constructor(private readonly http: HttpClient, private readonly resource: string) {}

  list(query: ListQuery = {}): Promise<T[]> {
    return this.http.request<T[]>('GET', `/${this.resource}`, { query: { page: query.page, limit: query.limit } });
  }
  get(id: string): Promise<T> {
    return this.http.request<T>('GET', `/${this.resource}/${encodeURIComponent(id)}`);
  }
  create(body: Payload): Promise<T> {
    return this.http.request<T>('POST', `/${this.resource}`, { body });
  }
  update(id: string, body: Payload): Promise<T> {
    return this.http.request<T>('PUT', `/${this.resource}/${encodeURIComponent(id)}`, { body });
  }
  async remove(id: string): Promise<void> {
    await this.http.request<void>('DELETE', `/${this.resource}/${encodeURIComponent(id)}`);
  }
}
