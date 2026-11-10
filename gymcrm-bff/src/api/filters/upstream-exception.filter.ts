import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { UpstreamError } from '../../domain/errors';

/** Erros "do cliente" devolvidos pelos serviços são repassados como vieram; o resto vira 502. */
const PASS_THROUGH = new Set([400, 404, 409, 422]);

@Catch(UpstreamError)
export class UpstreamExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Upstream');

  catch(error: UpstreamError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    if (PASS_THROUGH.has(error.status)) {
      response.status(error.status).json(error.body ?? { code: 'UPSTREAM_ERROR', message: error.message });
      return;
    }
    this.logger.error(`${error.service}: ${error.message}`);
    response.status(502).json({
      code: 'UPSTREAM_UNAVAILABLE',
      service: error.service,
      message: error.unavailable ? error.message : `${error.service} responded with status ${error.status}`,
    });
  }
}
