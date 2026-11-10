import { timingSafeEqual } from 'crypto';
import { NextFunction, Request, Response } from 'express';

/**
 * Garante que o tráfego passa pelo API Gateway: se GATEWAY_SECRET estiver definido, exige o header
 * x-gateway-secret (injetado pelo gateway). /health e /swagger ficam livres para checks e documentação.
 */
export function gatewaySecretMiddleware(secret: string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!secret || req.path === '/health' || req.path.startsWith('/swagger')) return next();
    const provided = req.header('x-gateway-secret') ?? '';
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    if (a.length === b.length && timingSafeEqual(a, b)) return next();
    res.status(403).json({ code: 'FORBIDDEN', message: 'Access is only allowed through the API Gateway' });
  };
}
