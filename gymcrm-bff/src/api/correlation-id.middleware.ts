import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { RequestContext } from '../domain/request-context';

/** Lê (ou gera) o x-correlation-id, devolve no response e disponibiliza para os clientes HTTP a jusante. */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-correlation-id');
  const correlationId = incoming && incoming.length <= 100 ? incoming : randomUUID();
  res.setHeader('x-correlation-id', correlationId);
  RequestContext.run({ correlationId }, () => next());
}
