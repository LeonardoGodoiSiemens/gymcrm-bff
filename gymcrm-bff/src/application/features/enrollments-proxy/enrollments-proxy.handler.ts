import { Inject, Injectable } from '@nestjs/common';
import { Enrollment, ListQuery, Payload } from '../../../domain/models';
import { ENROLLMENTS_GATEWAY, EnrollmentsGateway } from '../../../domain/ports';

/** Proxy CRUD de matrículas: encaminha ao MS Matrículas (que publica o evento EnrollmentCreated). */
@Injectable()
export class EnrollmentsProxyHandler {
  constructor(@Inject(ENROLLMENTS_GATEWAY) private readonly gateway: EnrollmentsGateway) {}

  list(query?: ListQuery): Promise<Enrollment[]> { return this.gateway.list(query); }
  get(id: string): Promise<Enrollment> { return this.gateway.get(id); }
  create(body: Payload): Promise<Enrollment> { return this.gateway.create(body); }
  update(id: string, body: Payload): Promise<Enrollment> { return this.gateway.update(id, body); }
  renew(id: string): Promise<Enrollment> { return this.gateway.renew(id); }
  remove(id: string): Promise<void> { return this.gateway.remove(id); }
}
