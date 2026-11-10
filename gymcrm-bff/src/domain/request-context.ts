import { AsyncLocalStorage } from 'async_hooks';

/** Contexto da requisição corrente (propaga o correlation-id do BFF para os serviços a jusante). */
export interface RequestContextData {
  correlationId: string;
}

const storage = new AsyncLocalStorage<RequestContextData>();

export const RequestContext = {
  run<T>(data: RequestContextData, fn: () => T): T {
    return storage.run(data, fn);
  },
  correlationId(): string | undefined {
    return storage.getStore()?.correlationId;
  },
};
