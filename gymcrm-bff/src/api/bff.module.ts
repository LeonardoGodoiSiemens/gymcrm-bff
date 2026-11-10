import { Module } from '@nestjs/common';
import { GetAggregatedDataHandler } from '../application/features/aggregated-data/get-aggregated-data.handler';
import { EnrollmentsProxyHandler } from '../application/features/enrollments-proxy/enrollments-proxy.handler';
import { ProductsProxyHandler } from '../application/features/products-proxy/products-proxy.handler';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { AggregatedDataController } from './aggregated-data.controller';
import { HealthController } from './health.controller';
import { EnrollmentsController } from './enrollments.controller';
import { ProductsController } from './products.controller';

export const BFF_HANDLERS = [GetAggregatedDataHandler, ProductsProxyHandler, EnrollmentsProxyHandler];
export const BFF_CONTROLLERS = [AggregatedDataController, ProductsController, EnrollmentsController, HealthController];

@Module({
  imports: [InfrastructureModule],
  controllers: BFF_CONTROLLERS,
  providers: BFF_HANDLERS,
})
export class BffModule {}
