import { Inject, Injectable } from '@nestjs/common';
import { ListQuery, Payload, Product } from '../../../domain/models';
import { PRODUCTS_GATEWAY, ProductsGateway } from '../../../domain/ports';

/** Proxy CRUD do estoque: o BFF não duplica regras de negócio, apenas encaminha ao MS Estoque. */
@Injectable()
export class ProductsProxyHandler {
  constructor(@Inject(PRODUCTS_GATEWAY) private readonly gateway: ProductsGateway) {}

  list(query?: ListQuery): Promise<Product[]> { return this.gateway.list(query); }
  get(id: string): Promise<Product> { return this.gateway.get(id); }
  create(body: Payload): Promise<Product> { return this.gateway.create(body); }
  update(id: string, body: Payload): Promise<Product> { return this.gateway.update(id, body); }
  remove(id: string): Promise<void> { return this.gateway.remove(id); }
}
