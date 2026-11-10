import { INestApplication } from '@nestjs/common';
import { correlationIdMiddleware } from './correlation-id.middleware';
import { UpstreamExceptionFilter } from './filters/upstream-exception.filter';
import { gatewaySecretMiddleware } from './gateway-secret.middleware';

export function configureApp(
  app: INestApplication,
  options: { gatewaySecret?: string; corsOrigin?: string } = {},
): void {
  app.use(correlationIdMiddleware);
  app.use(gatewaySecretMiddleware(options.gatewaySecret));
  app.useGlobalFilters(new UpstreamExceptionFilter());
  app.enableCors({ origin: options.corsOrigin && options.corsOrigin !== '*' ? options.corsOrigin.split(',') : true, exposedHeaders: ['x-correlation-id'] });
}
