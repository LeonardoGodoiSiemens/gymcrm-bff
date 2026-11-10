import { Enrollment } from '../../domain/models';
import { EnrollmentsGateway } from '../../domain/ports';
import { CrudClient } from './crud.client';
import { HttpClient } from './http-client';

/** CRUD de matrículas + ação de renovação (POST /enrollments/:id/renew). */
export class EnrollmentsClient extends CrudClient<Enrollment> implements EnrollmentsGateway {
  constructor(private readonly httpClient: HttpClient) {
    super(httpClient, 'enrollments');
  }

  renew(id: string): Promise<Enrollment> {
    return this.httpClient.request<Enrollment>('POST', `/enrollments/${encodeURIComponent(id)}/renew`);
  }
}
